"""Fetch geosite/geoip rule-set category names from SagerNet's GitHub repos, Redis-cached.

Port of the browser-side logic this replaces
(frontend/src/lib/fetchRuleSetCategories.ts): resolve the `rule-set` branch
head, list its tree, and filter filenames matching `{kind}-<category>.srs`.
"""

import logging
import re

import httpx

from .cache import Cache

logger = logging.getLogger(__name__)

_REPO_BY_KIND = {"geosite": "sing-geosite", "geoip": "sing-geoip"}


async def _fetch_from_github(http: httpx.AsyncClient, kind: str) -> list[str]:
    repo = _REPO_BY_KIND[kind]
    headers = {"Accept": "application/vnd.github+json"}

    branch_response = await http.get(
        f"https://api.github.com/repos/SagerNet/{repo}/branches/rule-set",
        headers=headers,
    )
    branch_response.raise_for_status()
    sha = branch_response.json()["commit"]["sha"]

    tree_response = await http.get(
        f"https://api.github.com/repos/SagerNet/{repo}/git/trees/{sha}",
        headers=headers,
    )
    tree_response.raise_for_status()
    tree = tree_response.json()["tree"]

    pattern = re.compile(rf"^{kind}-(.+)\.srs$")
    categories = sorted(
        {match.group(1) for entry in tree if (match := pattern.match(entry["path"]))}
    )
    if not categories:
        raise ValueError(f"GitHub tree returned no matching rule sets for {kind}")
    return categories


async def get_ruleset_categories(
    http: httpx.AsyncClient, cache: Cache, kind: str
) -> list[str]:
    """Return category names for `kind` ('geosite' or 'geoip'), Redis-cached."""
    cache_key = f"ruleset-categories:{kind}"
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    categories = await _fetch_from_github(http, kind)
    await cache.set(cache_key, categories)
    return categories
