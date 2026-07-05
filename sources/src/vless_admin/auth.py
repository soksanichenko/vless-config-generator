"""Login verification for the site (client email+UUID) and admin logins.

Serves the nginx `auth_request` targets for the main site and `/admin/` —
each checks its own signed session cookie (see sessions.py) rather than a
Basic Auth header.
"""

import hmac
import logging

from .config import AppConfig
from .db import client_get_by_email
from .models_db import Client
from .sessions import resolve_session

logger = logging.getLogger(__name__)


async def verify_client_login(email: str, client_uuid: str) -> Client | None:
    """Return the Client if `email`/`client_uuid` is a valid, dispatched login."""
    if not email or not client_uuid:
        return None
    client = await client_get_by_email(email)
    if client is None or client.status != "dispatched":
        return None
    if not hmac.compare_digest(str(client.client_uuid), client_uuid):
        return None
    return client


async def get_client_from_session(cookie_value: str | None) -> Client | None:
    """Return the Client for a valid `site_session` cookie, or None."""
    email = await resolve_session(cookie_value, kind="site")
    if email is None:
        return None
    client = await client_get_by_email(email)
    if client is None or client.status != "dispatched":
        return None
    return client


def verify_admin_login(username: str, password: str, config: AppConfig) -> bool:
    """Return True if `username`/`password` match the configured admin credential."""
    if not username or not password:
        return False
    return hmac.compare_digest(username, config.admin_username) and hmac.compare_digest(
        password, config.admin_password
    )


async def get_admin_from_session(cookie_value: str | None) -> str | None:
    """Return the admin username for a valid `admin_session` cookie, or None."""
    return await resolve_session(cookie_value, kind="admin")
