"""FastAPI application: VLESS client admin + config-generator API."""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID

import httpx
from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.templating import Jinja2Templates

from .auth import verify_basic_auth
from .cache import Cache
from .config import AppConfig
from .db import (
    client_create,
    client_get,
    client_list,
    client_mark_dispatched,
    create_db_if_not_exists,
    init_db,
)
from .github_categories import get_ruleset_categories
from .github_dispatch import dispatch_new_client

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).parent.parent.parent
config = AppConfig.from_yaml(Path(os.getenv("CONFIG_PATH", "config.yaml")))

templates = Jinja2Templates(directory=_ROOT / "templates")
_cache: Cache | None = None
_http: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global _cache, _http
    create_db_if_not_exists(config.sync_database_url)
    init_db(config.async_database_url)
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


# ── Routes: frontend API ──────────────────────────────────────────────────────


@app.get("/api/clients")
async def api_clients() -> JSONResponse:
    """Client-dropdown data — replaces the old static clients.json."""
    clients = await client_list()
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
                }
                for client in clients
                if client.status == "dispatched"
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


# ── Routes: nginx auth_request target ─────────────────────────────────────────


@app.get("/auth")
async def auth(request: Request) -> Response:
    """nginx `auth_request` target: 200 for a valid client login, 401 otherwise."""
    ok = await verify_basic_auth(request.headers.get("authorization"))
    return Response(status_code=200 if ok else 401)


# ── Routes: admin ──────────────────────────────────────────────────────────────


@app.get("/admin/", response_class=HTMLResponse)
async def admin_dashboard(request: Request) -> HTMLResponse:
    clients = await client_list()
    return templates.TemplateResponse(
        "admin/dashboard.html", {"request": request, "clients": clients}
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
