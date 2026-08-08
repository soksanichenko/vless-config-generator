"""FastAPI application: VLESS client admin + config-generator API."""

import logging
import os
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from uuid import UUID

import httpx
from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates
from markupsafe import escape

from .auth import (
    get_admin_from_session,
    get_clients_for_discord,
    get_clients_from_session,
    verify_admin_login,
    verify_client_login,
)
from .cache import Cache
from .config import AppConfig
from .db import (
    client_create,
    client_delete,
    client_get,
    client_list,
    client_mark_dispatched,
    client_mark_pending_removal,
    client_mark_pending_update,
    client_mark_removing,
    client_mark_updated,
    client_mark_updating,
    client_set_run_id,
    client_update,
    client_update_run_status,
    discord_link_get_email,
    discord_link_list,
    discord_link_upsert,
    init_db,
)
from .github_categories import get_ruleset_categories
from .github_dispatch import (
    dispatch_new_client,
    dispatch_remove_client,
    dispatch_update_client,
    find_run_id,
    get_run_status,
)
from .sessions import (
    ADMIN_COOKIE_NAME,
    SITE_COOKIE_NAME,
    create_session,
    destroy_session,
    init_sessions,
)

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).parent.parent.parent
config = AppConfig.from_yaml(Path(os.getenv("CONFIG_PATH", "config.yaml")))

templates = Jinja2Templates(directory=_ROOT / "templates")
_cache: Cache | None = None
_http: httpx.AsyncClient | None = None

_IN_FLIGHT_STATUSES = {
    "pending",
    "dispatched",
    "pending_removal",
    "removing",
    "pending_update",
    "updating",
}


def _is_in_flight(client) -> bool:
    return (
        client.status in _IN_FLIGHT_STATUSES and client.github_run_status != "completed"
    )


def _run_cell_html(client, github_repo: str) -> str:
    """Render the "Workflow run" cell's inner HTML for one client.

    Shared between the dashboard template and the `/admin/clients/status`
    polling endpoint (see `admin_clients_status`) so a JS-driven refresh of
    that cell always produces the exact same markup a full page load would.
    """
    if client.status not in ("dispatched", "removing", "updating"):
        return "&mdash;"
    if client.github_run_id is None:
        return "<span>looking up run&hellip;</span>"
    run_state = escape(
        client.github_run_conclusion
        if client.github_run_status == "completed"
        else client.github_run_status
    )
    return (
        f'<a class="run-{run_state}" '
        f'href="https://github.com/{escape(github_repo)}/actions/runs/{client.github_run_id}" '
        f'target="_blank" rel="noopener">{run_state}</a>'
    )


templates.env.globals["run_cell_html"] = _run_cell_html

_EDITABLE_STATUSES = {"pending", "dispatched"}
_client_row_macro = templates.env.get_template(
    "admin/_client_row.html"
).module.client_row


def _is_editable(client) -> bool:
    return client.status in _EDITABLE_STATUSES


async def _discord_ids_by_email() -> dict[str, list[str]]:
    """Group every `DiscordLink` by account email, for the dashboard's
    "Discord ID" column — an account can have more than one link (e.g. a
    shared credential), so this is a list, not a single value."""
    grouped: dict[str, list[str]] = {}
    for link in await discord_link_list():
        grouped.setdefault(link.email, []).append(link.discord_user_id)
    return grouped


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _cache, _http
    init_db(config.async_database_url)
    init_sessions(config.session_secret_key)
    _cache = Cache(config.redis_url, config.cache_ttl)
    _http = httpx.AsyncClient(timeout=15.0)
    yield
    await _cache.close()
    await _http.aclose()


app = FastAPI(lifespan=lifespan)


async def _dispatch_add_and_mark(client) -> None:
    try:
        await dispatch_new_client(
            _http,
            github_token=config.github_token,
            repo=config.github_repo,
            workflow_file=config.github_workflow_file,
            email=client.email,
            client_uuid=str(client.client_uuid),
            flow=client.flow,
        )
        await client_mark_dispatched(client.id)
    except Exception:
        logger.exception(
            "Failed to dispatch infra add-client workflow for client %s", client.email
        )


async def _dispatch_remove_and_mark(client) -> None:
    try:
        await dispatch_remove_client(
            _http,
            github_token=config.github_token,
            repo=config.github_repo,
            workflow_file=config.github_remove_workflow_file,
            client_uuid=str(client.client_uuid),
        )
        await client_mark_removing(client.id)
    except Exception:
        logger.exception(
            "Failed to dispatch infra remove-client workflow for client %s",
            client.email,
        )


async def _dispatch_update_and_mark(client) -> None:
    try:
        await dispatch_update_client(
            _http,
            github_token=config.github_token,
            repo=config.github_repo,
            workflow_file=config.github_update_workflow_file,
            client_uuid=str(client.client_uuid),
            email=client.email,
            flow=client.flow,
        )
        await client_mark_updating(client.id)
    except Exception:
        logger.exception(
            "Failed to dispatch infra update-client workflow for client %s",
            client.email,
        )


async def _refresh_client_runs(clients: list) -> list:
    """Best-effort refresh of each in-flight client's GitHub Actions run state.

    Called on every admin dashboard load rather than via a background
    poller or webhook — simplest option for a low-traffic, single-operator
    tool. `workflow_dispatch` returns no run id, so a client without one yet
    gets a lookup attempt on each load until a matching run shows up.

    Handles three directions: "dispatched" clients are polled against the
    add-client workflow, "removing" against the remove-client one, and
    "updating" against the update-client one. A "removing" client whose run
    concludes successfully is hard-deleted here (its site session was
    already blocked the moment status flipped to "removing", see
    `client_mark_removing`) and dropped from the returned list so it
    disappears from this same page load. An "updating" client whose run
    concludes successfully flips back to "dispatched" (`client_mark_updated`)
    but keeps its run-tracking columns as-is, so the edit's own outcome
    stays visible instead of being reset to blank.
    """
    workflow_file_for_status = {
        "dispatched": config.github_workflow_file,
        "removing": config.github_remove_workflow_file,
        "updating": config.github_update_workflow_file,
    }
    remaining = []
    for client in clients:
        if client.status not in workflow_file_for_status:
            remaining.append(client)
            continue
        workflow_file = workflow_file_for_status[client.status]
        try:
            if client.github_run_id is None:
                after = client.action_dispatched_at or client.created_at
                run_id = await find_run_id(
                    _http,
                    github_token=config.github_token,
                    repo=config.github_repo,
                    workflow_file=workflow_file,
                    after=after - timedelta(seconds=10),
                )
                if run_id is not None:
                    await client_set_run_id(client.id, run_id)
                    client.github_run_id = run_id
            if (
                client.github_run_id is not None
                and client.github_run_status != "completed"
            ):
                status, conclusion = await get_run_status(
                    _http,
                    github_token=config.github_token,
                    repo=config.github_repo,
                    run_id=client.github_run_id,
                )
                if (status, conclusion) != (
                    client.github_run_status,
                    client.github_run_conclusion,
                ):
                    await client_update_run_status(client.id, status, conclusion)
                    client.github_run_status = status
                    client.github_run_conclusion = conclusion
        except Exception:
            logger.exception("Failed to refresh GitHub run state for %s", client.email)
        if client.status == "removing" and client.github_run_conclusion == "success":
            await client_delete(client.id)
            continue
        if client.status == "updating" and client.github_run_conclusion == "success":
            await client_mark_updated(client.id)
            client.status = "dispatched"
        remaining.append(client)
    return remaining


# ── Routes: site login ──────────────────────────────────────────────────────────


@app.get("/login", response_class=HTMLResponse)
async def login_form(request: Request) -> Response:
    """Silently signs a Discord-authenticated visitor straight into their
    linked site account, if one exists (see `login_submit`'s implicit
    linking) — skips the email+uuid form entirely. `X-Discord-User-Id` is
    only present because nginx now gates `/login` behind the same Discord
    SSO check as `/` (see this role's `location.conf.j2`); it's always
    absent for a request that somehow reaches this without going through
    that gate, so this just falls through to the normal form below.
    """
    discord_user_id = request.headers.get("X-Discord-User-Id")
    clients = await get_clients_for_discord(discord_user_id)
    if clients:
        response = RedirectResponse("/", status_code=303)
        await create_session(
            response,
            kind="site",
            subject=clients[0].email,
            cookie_secure=config.cookie_secure,
        )
        return response
    return templates.TemplateResponse(request, "login.html", {"error": False})


@app.post("/login")
async def login_submit(
    request: Request, email: str = Form(...), uuid: str = Form(...)
) -> Response:
    """On success, also links the caller's Discord identity (if present) to
    this account — see `models_db.DiscordLink` — so a future visit skips
    this form via `login_form`'s silent auto-login. Not matched by email:
    a client's `email` field is just an account label, not necessarily the
    same address as the Discord account's own (possibly unset/unverified)
    email, so proving ownership here is what establishes the link, not any
    string comparison.
    """
    client = await verify_client_login(email, uuid)
    if client is None:
        return templates.TemplateResponse(
            request, "login.html", {"error": True}, status_code=401
        )
    discord_user_id = request.headers.get("X-Discord-User-Id")
    if discord_user_id:
        await discord_link_upsert(discord_user_id, client.email)
    response = RedirectResponse("/", status_code=303)
    await create_session(
        response, kind="site", subject=client.email, cookie_secure=config.cookie_secure
    )
    return response


@app.post("/logout")
async def logout(request: Request) -> Response:
    """Clears both the site login (if any) and the Discord-bridged
    `zw_session` cookie the portal sets on this domain — a purely local
    action, per this repo's own README. Not a real Discord logout: as
    long as `portal_session` is still valid on meow-elite.club, the next
    page load (including the redirect below) re-bridges a fresh
    `zw_session` automatically. That's a feature, not a bug — it's the
    simplest way to force-refresh a stale one (see the SSO debugging
    story in infra's memory), not a way to actually sign out of Discord.
    We only own this domain's cookie, not the server-side session row
    the portal's own DB holds for it — clearing the cookie is enough to
    stop this browser from presenting it, which is all "local logout"
    means here.
    """
    response = RedirectResponse("/login", status_code=303)
    await destroy_session(response, request.cookies.get(SITE_COOKIE_NAME), kind="site")
    response.delete_cookie("zw_session", domain="zelgray.work", path="/")
    return response


# ── Routes: frontend API ──────────────────────────────────────────────────────


@app.get("/api/clients")
async def api_clients(request: Request) -> JSONResponse:
    """Every credential belonging to the logged-in account (see auth.py)."""
    clients = await get_clients_from_session(request.cookies.get(SITE_COOKIE_NAME))
    if not clients:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return JSONResponse(
        {
            "clients": [
                {
                    "email": client.email,
                    "uuid": str(client.client_uuid),
                    "server": config.vless_server,
                    "serverPort": config.vless_server_port,
                    "publicKey": config.vless_public_key,
                    "shortId": config.vless_short_id,
                    "serverName": config.vless_server_name,
                    "flow": client.flow,
                }
                for client in clients
            ]
        }
    )


@app.get("/api/whoami")
async def api_whoami(request: Request) -> JSONResponse:
    """Discord identity for the top-right user menu — `X-Discord-User-Id`/
    `X-Discord-Avatar-Url`/`X-Discord-Access-Level` are forwarded by
    nginx's own `auth_request` against the portal (see this role's
    `location.conf.j2`; reusing the same gate `/` already sits behind, not
    a new check). `is_admin` reflects both paths that already unlock
    `/admin/` — a Discord admin-level grant for this service, or a
    currently valid operator `admin_session` — so the menu's admin link
    only ever appears when it would actually work.

    `canGenerateCredentials` additionally requires the portal's per-service
    self-service toggle (`X-Service-Self-Service-Enabled`, see
    `/admin/services` in meow-elite-club-portal) AND that this Discord
    identity has no linked client yet — true only when "generate my
    credentials" (see `POST /api/self-service/generate`) would actually
    succeed right now.
    """
    admin_username = await get_admin_from_session(
        request.cookies.get(ADMIN_COOKIE_NAME)
    )
    discord_user_id = request.headers.get("X-Discord-User-Id")
    self_service_enabled = (
        request.headers.get("X-Service-Self-Service-Enabled") == "true"
    )
    already_linked = (
        discord_user_id is not None
        and await discord_link_get_email(discord_user_id) is not None
    )
    return JSONResponse(
        {
            "discordUserId": discord_user_id,
            "avatarUrl": request.headers.get("X-Discord-Avatar-Url"),
            "isAdmin": admin_username is not None
            or request.headers.get("X-Discord-Access-Level") == "admin",
            "canGenerateCredentials": bool(discord_user_id)
            and self_service_enabled
            and not already_linked,
        }
    )


@app.post("/api/self-service/generate")
async def api_self_service_generate(request: Request) -> Response:
    """Self-service credential creation: same client_create + infra
    add-client GitHub Actions workflow the admin panel's "Add client" uses
    (see `_dispatch_add_and_mark`), triggered by the Discord user
    themselves instead of an operator. Only reachable when the portal has
    a `can_self_service` grant for this caller on this service (see
    `/admin/services` in meow-elite-club-portal) — that's what
    `X-Service-Self-Service-Enabled` reflects, forwarded on this same
    request by nginx's own `auth_request` (see this role's
    `location.conf.j2`), same gate `/api/whoami` already sits behind.

    The new client's `email` prefers the Discord account's own verified
    email (`X-Discord-Email`, present only if the `email` OAuth scope was
    granted — see meow-elite-club-portal's discord_oauth.py) so the
    generator's "Logged in as" line shows something recognizable instead
    of an opaque id. Falls back to a synthetic label
    (`discord-<id>@self-service.local`) when there isn't one — matches
    models_db.Client's own docstring (`email` identifies the *account*,
    not necessarily a real address), so this never blocks on the scope
    being optional. Immediately linked to the caller (so `login_form`'s
    silent auto-login recognizes it on future visits) and immediately
    signed into a site session on this same response, so the SPA can use
    it right away without a second round trip through `/login`.
    """
    if request.headers.get("X-Service-Self-Service-Enabled") != "true":
        return JSONResponse({"error": "self-service disabled"}, status_code=403)
    discord_user_id = request.headers.get("X-Discord-User-Id")
    if not discord_user_id:
        return JSONResponse({"error": "not authenticated"}, status_code=401)
    if await discord_link_get_email(discord_user_id) is not None:
        return JSONResponse({"error": "already have credentials"}, status_code=409)

    email = (
        request.headers.get("X-Discord-Email")
        or f"discord-{discord_user_id}@self-service.local"
    )
    client = await client_create(email, "xtls-rprx-vision")
    await discord_link_upsert(discord_user_id, email)
    await _dispatch_add_and_mark(client)

    response = JSONResponse(
        {"email": client.email, "clientUuid": str(client.client_uuid)}
    )
    await create_session(
        response, kind="site", subject=client.email, cookie_secure=config.cookie_secure
    )
    return response


@app.get("/api/ruleset-categories")
async def api_ruleset_categories(kind: str) -> JSONResponse:
    """Geosite/geoip category names for the rule-set autocomplete, Redis-cached."""
    if kind not in ("geosite", "geoip"):
        raise HTTPException(status_code=400, detail="kind must be 'geosite' or 'geoip'")
    try:
        categories = await get_ruleset_categories(_http, _cache, kind)
    except Exception as exc:
        logger.exception("Failed to fetch %s categories", kind)
        raise HTTPException(status_code=502, detail=str(exc))
    return JSONResponse({"categories": categories})


# ── Routes: nginx auth_request targets ────────────────────────────────────────


@app.get("/auth")
async def auth(request: Request) -> Response:
    """nginx `auth_request` target for the main site: 200/401 on the site session cookie."""
    clients = await get_clients_from_session(request.cookies.get(SITE_COOKIE_NAME))
    return Response(status_code=200 if clients else 401)


@app.get("/admin/auth")
async def admin_auth(request: Request) -> Response:
    """nginx `auth_request` target for `/admin/`: 200/401 on the admin session cookie."""
    username = await get_admin_from_session(request.cookies.get(ADMIN_COOKIE_NAME))
    return Response(status_code=200 if username is not None else 401)


# ── Routes: admin ──────────────────────────────────────────────────────────────


@app.get("/admin/login", response_class=HTMLResponse)
async def admin_login_form(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "admin/login.html", {"error": False})


@app.post("/admin/login")
async def admin_login_submit(
    request: Request, username: str = Form(...), password: str = Form(...)
) -> Response:
    if not verify_admin_login(username, password, config):
        return templates.TemplateResponse(
            request, "admin/login.html", {"error": True}, status_code=401
        )
    response = RedirectResponse("/admin/", status_code=303)
    await create_session(
        response, kind="admin", subject=username, cookie_secure=config.cookie_secure
    )
    return response


@app.post("/admin/logout")
async def admin_logout(request: Request) -> Response:
    response = RedirectResponse("/admin/login", status_code=303)
    await destroy_session(
        response, request.cookies.get(ADMIN_COOKIE_NAME), kind="admin"
    )
    return response


@app.get("/admin/", response_class=HTMLResponse)
async def admin_dashboard(request: Request) -> HTMLResponse:
    clients = await _refresh_client_runs(await client_list())
    return templates.TemplateResponse(
        request,
        "admin/dashboard.html",
        {
            "clients": clients,
            "github_repo": config.github_repo,
            "discord_ids_by_email": await _discord_ids_by_email(),
            "avatar_url": request.headers.get("X-Discord-Avatar-Url"),
        },
    )


@app.get("/admin/clients/status")
async def admin_clients_status() -> JSONResponse:
    """JSON status feed the dashboard's JS polls instead of reloading the page.

    Runs the same reconciliation as the dashboard's own GET (so statuses
    still advance, deleted clients still disappear) without re-rendering
    the whole page — keeps in-progress edits/scroll position/etc. intact.
    """
    clients = await _refresh_client_runs(await client_list())
    discord_ids_by_email = await _discord_ids_by_email()
    return JSONResponse(
        {
            "clients": [
                {
                    "id": str(client.id),
                    "status": client.status,
                    "run_html": _run_cell_html(client, config.github_repo),
                    "in_flight": _is_in_flight(client),
                    "editable": _is_editable(client),
                    "row_html": str(
                        _client_row_macro(
                            client,
                            config.github_repo,
                            discord_ids_by_email.get(client.email, []),
                        )
                    ),
                }
                for client in clients
            ]
        }
    )


@app.post("/admin/clients")
async def admin_add_client(
    email: str = Form(...), flow: str = Form(...)
) -> RedirectResponse:
    """Create a new client and dispatch the infra workflow that provisions it on xray."""
    client = await client_create(email, flow)
    await _dispatch_add_and_mark(client)
    return RedirectResponse("/admin/", status_code=303)


@app.post("/admin/clients/{client_id}/retry")
async def admin_retry_dispatch(client_id: UUID) -> RedirectResponse:
    """Retry a failed/pending GitHub dispatch for an existing client.

    Re-dispatches whichever workflow matches the client's current direction
    — add for a pending/failed addition, remove for a failed removal, update
    for a failed edit — using whatever email/flow is currently stored (the
    edit route already persisted the new values before this could be
    needed), so retrying never accidentally re-adds a client that was being
    removed, or re-applies stale values from before an edit.
    """
    client = await client_get(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    if client.status in ("removing", "pending_removal"):
        await _dispatch_remove_and_mark(client)
    elif client.status in ("updating", "pending_update"):
        await _dispatch_update_and_mark(client)
    else:
        await _dispatch_add_and_mark(client)
    return RedirectResponse("/admin/", status_code=303)


@app.post("/admin/clients/{client_id}/edit")
async def admin_edit_client(
    client_id: UUID, email: str = Form(...), flow: str = Form(...)
) -> RedirectResponse:
    """Update a client's email/flow and dispatch the infra workflow that applies it.

    A client whose original "add" was never actually dispatched (status
    "pending") has no server-side entry yet to update — this just persists
    the new values so the next "Retry" of the add uses them. Otherwise,
    status flips to "pending_update" immediately (not a security revocation,
    so site login stays allowed — see `_LOGIN_ALLOWED_STATUSES` in auth.py),
    then to "updating" once the dispatch call actually succeeds. `email`
    isn't required to be unique (see `models_db.Client`), so no collision
    check against other rows is needed here.
    """
    client = await client_get(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    if client.status == "pending":
        await client_update(client.id, email, flow)
    else:
        await client_mark_pending_update(client.id, email, flow)
        client.email = email
        client.flow = flow
        await _dispatch_update_and_mark(client)
    return RedirectResponse("/admin/", status_code=303)


@app.post("/admin/clients/{client_id}/link-discord")
async def admin_link_discord(
    client_id: UUID, discord_user_id: str = Form(...)
) -> RedirectResponse:
    """Manually link a Discord user id to a client's account (by email) —
    for an operator who already knows which Discord user a credential was
    handed to, without waiting for that person to log in themselves first
    (see `auth.py`'s implicit self-service linking via `/login`, which
    this is an alternative to, not a replacement for — either path writes
    the same `DiscordLink` row).
    """
    client = await client_get(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    discord_user_id = discord_user_id.strip()
    if discord_user_id:
        await discord_link_upsert(discord_user_id, client.email)
    return RedirectResponse("/admin/", status_code=303)


@app.post("/admin/clients/{client_id}/delete")
async def admin_delete_client(client_id: UUID) -> RedirectResponse:
    """Dispatch the infra workflow that removes a client from xray.

    Status flips to "pending_removal" immediately (blocking its site login
    right away, mirroring `client_create`'s initial "pending" for the add
    flow), then to "removing" once the dispatch call actually succeeds. The
    row itself is only hard-deleted once the dashboard's next load confirms
    the workflow succeeded (see `_refresh_client_runs`).
    """
    client = await client_get(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    await client_mark_pending_removal(client.id)
    client.status = "pending_removal"
    await _dispatch_remove_and_mark(client)
    return RedirectResponse("/admin/", status_code=303)
