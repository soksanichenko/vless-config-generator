"""Login verification for the site (client email+UUID) and admin logins.

Serves the nginx `auth_request` targets for the main site and `/admin/` —
each checks its own signed session cookie (see sessions.py) rather than a
Basic Auth header.
"""

import hmac
import logging

from .config import AppConfig
from .db import client_list_by_email
from .models_db import Client
from .sessions import resolve_session

logger = logging.getLogger(__name__)

# Statuses that still allow site login: a live client ("dispatched"), plus
# either phase of an in-flight *edit* ("pending_update"/"updating") — an
# email/flow edit never revokes access. Any removal-related status
# ("pending", "pending_removal", "removing") blocks login, "pending"
# because the client was never actually provisioned on xray yet.
_LOGIN_ALLOWED_STATUSES = {"dispatched", "pending_update", "updating"}


async def verify_client_login(email: str, client_uuid: str) -> Client | None:
    """Return the Client if `email`/`client_uuid` is a valid, provisioned login.

    `email` identifies an *account*, which may hold several credentials
    (see `models_db.Client`); any one of them proves ownership of the
    account, so every candidate for that email is checked in constant time
    against the supplied uuid.
    """
    if not email or not client_uuid:
        return None
    for candidate in await client_list_by_email(email):
        if candidate.status not in _LOGIN_ALLOWED_STATUSES:
            continue
        if hmac.compare_digest(str(candidate.client_uuid), client_uuid):
            return candidate
    return None


async def get_clients_from_session(cookie_value: str | None) -> list[Client]:
    """Return every still-valid Client for a `site_session` cookie's account.

    A session's subject is the account email, not one specific credential —
    logging in with any one of the account's credentials grants visibility
    into all of them (see `models_db.Client`), which is what lets the
    frontend offer a picker between them.
    """
    email = await resolve_session(cookie_value, kind="site")
    if email is None:
        return []
    return [
        candidate
        for candidate in await client_list_by_email(email)
        if candidate.status in _LOGIN_ALLOWED_STATUSES
    ]


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
