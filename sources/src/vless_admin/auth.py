"""Basic-Auth credential check: username=email, password=the client's own VLESS UUID.

Serves as the nginx `auth_request` target for the main site — reuses each
client's existing VLESS credential instead of a separate site password.
"""

import base64
import binascii
import hmac
import logging

from .db import client_get_by_email

logger = logging.getLogger(__name__)


async def verify_basic_auth(header: str | None) -> bool:
    """Return True if `header` (an `Authorization` header value) is a valid client login."""
    if not header or not header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(
            header.removeprefix("Basic "), validate=True
        ).decode()
        email, _, password = decoded.partition(":")
    except (binascii.Error, ValueError, UnicodeDecodeError):
        return False
    if not email or not password:
        return False

    client = await client_get_by_email(email)
    if client is None or client.status != "dispatched":
        return False
    return hmac.compare_digest(str(client.client_uuid), password)
