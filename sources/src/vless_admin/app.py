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

from .auth import (
    get_admin_from_session,
    get_client_from_session,
    verify_admin_login,
    verify_client_login,
)
from .cache import Cache
from .config import AppConfig
from .db import (
    client_create,
    client_get,
    client_list,
    client_mark_dispatched,
    client_set_run_id,
    client_update_run_status,
    init_db,
)
from .github_categories import get_ruleset_categories
from .github_dispatch import dispatch_new_client, find_run_id, get_run_status
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


async def _dispatch_and_mark(client) -> None:
    try:
        await dispatch_new_client(
            _http,
            github_token=config.github_token,
            repo=config.github_repo,
            workflow_file=config.github_workflow_file,
            email=client.email,
            client_uuid=str(client.client_uuid),
        )
        await client_mark_dispatched(client.id)
    except Exception:
        logger.exception(
            "Failed to dispatch infra workflow for client %s", client.email
        )


async def _refresh_client_runs(clients: list) -> None:
    """Best-effort refresh of each dispatched client's GitHub Actions run state.

    Called on every admin dashboard load rather than via a background
    poller or webhook — simplest option for a low-traffic, single-operator
    tool. `workflow_dispatch` returns no run id, so a client without one yet
    gets a lookup attempt on each load until a matching run shows up.
    """
    for client in clients:
        if client.status != "dispatched":
            continue
        try:
            if client.github_run_id is None:
                run_id = await find_run_id(
                    _http,
                    github_token=config.github_token,
                    repo=config.github_repo,
                    workflow_file=config.github_workflow_file,
                    after=client.created_at - timedelta(seconds=10),
                )
                if run_id is None:
                    continue
                await client_set_run_id(client.id, run_id)
                client.github_run_id = run_id
            if client.github_run_status != "completed":
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


@app.get("/api/client")
async def api_client(request: Request) -> JSONResponse:
    """Data for the client that logged in — no picking another client's credentials."""
    client = await get_client_from_session(request.cookies.get(SITE_COOKIE_NAME))
    if client is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return JSONResponse(
        {
            "client": {
                "email": client.email,
                "uuid": str(client.client_uuid),
                "server": config.vless_server,
                "serverPort": config.vless_server_port,
                "publicKey": config.vless_public_key,
                "shortId": config.vless_short_id,
                "serverName": config.vless_server_name,
            }
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
    client = await get_client_from_session(request.cookies.get(SITE_COOKIE_NAME))
    return Response(status_code=200 if client is not None else 401)


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
    clients = await client_list()
    await _refresh_client_runs(clients)
    return templates.TemplateResponse(
        "admin/dashboard.html",
        {"request": request, "clients": clients, "github_repo": config.github_repo},
    )


@app.post("/admin/clients")
async def admin_add_client(email: str = Form(...)) -> RedirectResponse:
    """Create a new client and dispatch the infra workflow that provisions it on xray."""
    client = await client_create(email)
    await _dispatch_and_mark(client)
    return RedirectResponse("/admin/", status_code=303)


@app.post("/admin/clients/{client_id}/retry")
async def admin_retry_dispatch(client_id: UUID) -> RedirectResponse:
    """Retry a failed/pending GitHub dispatch for an existing client."""
    client = await client_get(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    await _dispatch_and_mark(client)
    return RedirectResponse("/admin/", status_code=303)
