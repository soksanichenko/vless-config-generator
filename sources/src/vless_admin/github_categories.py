"""Fetch geosite/geoip rule-set category names from GitHub, Redis-cached.

Port of the browser-side logic this replaces
(frontend/src/lib/fetchRuleSetCategories.ts): resolve a source's branch head,
list its tree, and filter filenames matching `{kind}-<category>.srs`.
"""

import logging
import re
from dataclasses import dataclass

import httpx

from .cache import Cache

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class _SourceSpec:
    repo: str
    branch: str
    # Sub-directory the .srs files live under within the branch, e.g.
    # "sing-box/rule-set-geosite/" — empty when they sit at the repo root.
    path_prefix: str = ""


# runetfreedom's rule-set files sit in a sub-directory (unlike SagerNet's, which are
# at the repo root), so its tree needs to be listed recursively to find them.
_SOURCES: dict[str, dict[str, _SourceSpec]] = {
    "sagernet": {
        "geosite": _SourceSpec("SagerNet/sing-geosite", "rule-set"),
        "geoip": _SourceSpec("SagerNet/sing-geoip", "rule-set"),
    },
    "runetfreedom": {
        "geosite": _SourceSpec(
            "runetfreedom/russia-v2ray-rules-dat", "release", "sing-box/rule-set-geosite/"
        ),
        "geoip": _SourceSpec(
            "runetfreedom/russia-v2ray-rules-dat", "release", "sing-box/rule-set-geoip/"
        ),
    },
}


async def _fetch_from_github(http: httpx.AsyncClient, spec: _SourceSpec, kind: str) -> list[str]:
    headers = {"Accept": "application/vnd.github+json"}

    branch_response = await http.get(
        f"https://api.github.com/repos/{spec.repo}/branches/{spec.branch}",
        headers=headers,
    )
    branch_response.raise_for_status()
    sha = branch_response.json()["commit"]["sha"]

    tree_url = f"https://api.github.com/repos/{spec.repo}/git/trees/{sha}"
    if spec.path_prefix:
        tree_url += "?recursive=1"
    tree_response = await http.get(tree_url, headers=headers)
    tree_response.raise_for_status()
    tree = tree_response.json()["tree"]

    pattern = re.compile(rf"^{re.escape(spec.path_prefix)}{re.escape(kind)}-(.+)\.srs$")
    categories = sorted(
        {match.group(1) for entry in tree if (match := pattern.match(entry["path"]))}
    )
    if not categories:
        raise ValueError(f"GitHub tree returned no matching rule sets for {spec.repo}/{kind}")
    return categories


async def get_ruleset_categories(
    http: httpx.AsyncClient, cache: Cache, kind: str, source: str = "sagernet"
) -> list[str]:
    """Return category names for `source`/`kind` ('geosite' or 'geoip'), Redis-cached."""
    sources_for_kind = _SOURCES.get(source)
    if sources_for_kind is None or kind not in sources_for_kind:
        raise ValueError(f"Unknown rule-set source/kind: {source}/{kind}")

    cache_key = f"ruleset-categories:{source}:{kind}"
    cached = await cache.get(cache_key)
    if cached is not None:
        return cached

    categories = await _fetch_from_github(http, sources_for_kind[kind], kind)
    await cache.set(cache_key, categories)
    return categories
