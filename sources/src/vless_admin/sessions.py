"""Signed-cookie sessions backed by the `sessions` Postgres table.

The cookie only ever carries an opaque, itsdangerous-signed session id — the
signature guards against tampering and enforces a hard max-age at the edge,
while the Postgres row remains the source of truth for revocation (deleted
immediately on logout, regardless of how long the signed cookie itself would
otherwise still verify).
"""

import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Response
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from .db import session_create, session_delete, session_get

SITE_COOKIE_NAME = "site_session"
ADMIN_COOKIE_NAME = "admin_session"
SITE_SESSION_TTL = timedelta(days=30)
ADMIN_SESSION_TTL = timedelta(hours=12)

_serializer: URLSafeTimedSerializer | None = None


def init_sessions(secret_key: str) -> None:
    """Initialise the cookie signer. Must be called once at startup."""
    global _serializer
    _serializer = URLSafeTimedSerializer(secret_key, salt="vless-admin-session")


async def create_session(
    response: Response, *, kind: str, subject: str, cookie_secure: bool
) -> None:
    """Create a session row and set its signed cookie on `response`."""
    cookie_name, ttl = (
        (SITE_COOKIE_NAME, SITE_SESSION_TTL)
        if kind == "site"
        else (ADMIN_COOKIE_NAME, ADMIN_SESSION_TTL)
    )
    session_id = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + ttl
    await session_create(session_id, kind, subject, expires_at)
    signed = _serializer.dumps(session_id)
    response.set_cookie(
        cookie_name,
        signed,
        max_age=int(ttl.total_seconds()),
        httponly=True,
        secure=cookie_secure,
        samesite="lax",
        path="/admin" if kind == "admin" else "/",
    )


async def resolve_session(cookie_value: str | None, *, kind: str) -> str | None:
    """Return the session's subject (email or admin username), or None if invalid/expired."""
    if not cookie_value:
        return None
    ttl = SITE_SESSION_TTL if kind == "site" else ADMIN_SESSION_TTL
    try:
        session_id = _serializer.loads(cookie_value, max_age=int(ttl.total_seconds()))
    except (BadSignature, SignatureExpired):
        return None
    session = await session_get(session_id, kind)
    if session is None:
        return None
    return session.subject


async def destroy_session(
    response: Response, cookie_value: str | None, *, kind: str
) -> None:
    """Delete the session row (if any) and clear its cookie on `response`."""
    if cookie_value:
        try:
            session_id = _serializer.loads(cookie_value)
        except (BadSignature, SignatureExpired):
            session_id = None
        if session_id:
            await session_delete(session_id)
    cookie_name = ADMIN_COOKIE_NAME if kind == "admin" else SITE_COOKIE_NAME
    response.delete_cookie(cookie_name, path="/admin" if kind == "admin" else "/")
