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
async def login_form(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "login.html", {"request": request, "error": False}
    )


@app.post("/login")
async def login_submit(
    request: Request, email: str = Form(...), uuid: str = Form(...)
) -> Response:
    client = await verify_client_login(email, uuid)
    if client is None:
        return templates.TemplateResponse(
            "login.html", {"request": request, "error": True}, status_code=401
        )
    response = RedirectResponse("/", status_code=303)
    await create_session(
        response, kind="site", subject=client.email, cookie_secure=config.cookie_secure
    )
    return response


@app.post("/logout")
async def logout(request: Request) -> Response:
    response = RedirectResponse("/login", status_code=303)
    await destroy_session(response, request.cookies.get(SITE_COOKIE_NAME), kind="site")
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
    return templates.TemplateResponse(
        "admin/login.html", {"request": request, "error": False}
    )


@app.post("/admin/login")
async def admin_login_submit(
    request: Request, username: str = Form(...), password: str = Form(...)
) -> Response:
    if not verify_admin_login(username, password, config):
        return templates.TemplateResponse(
            "admin/login.html", {"request": request, "error": True}, status_code=401
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
        "admin/dashboard.html",
        {"request": request, "clients": clients, "github_repo": config.github_repo},
    )


@app.get("/admin/clients/status")
async def admin_clients_status() -> JSONResponse:
    """JSON status feed the dashboard's JS polls instead of reloading the page.

    Runs the same reconciliation as the dashboard's own GET (so statuses
    still advance, deleted clients still disappear) without re-rendering
    the whole page — keeps in-progress edits/scroll position/etc. intact.
    """
    clients = await _refresh_client_runs(await client_list())
    return JSONResponse(
        {
            "clients": [
                {
                    "id": str(client.id),
                    "status": client.status,
                    "run_html": _run_cell_html(client, config.github_repo),
                    "in_flight": _is_in_flight(client),
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
