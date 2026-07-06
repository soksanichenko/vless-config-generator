"""Trigger and track the `infra` repo's "Add VLESS client" GitHub Actions workflow.

This backend never writes to Infisical or touches the xray server directly —
it only dispatches a workflow in `infra`, which holds the write-capable
Infisical credential and runs the actual `ansible-playbook` deploy.
"""

import logging
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

# GitHub's workflow_dispatch REST API doesn't accept a genuinely empty string
# for an input: with `required: true` it rejects the call outright (422),
# and with `required: false` + a `default:` it silently substitutes the
# default instead of the empty string actually sent — either way, "no flow"
# can't cross the API as "". Sent as this sentinel instead; the receiving
# playbook (`add_vless_client.yml`/`update_vless_client.yml`) translates it
# back to an empty string before building the client's Infisical entry.
NO_FLOW_SENTINEL = "none"


def _headers(github_token: str) -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {github_token}",
    }


def _flow_input(flow: str) -> str:
    return flow if flow else NO_FLOW_SENTINEL


async def dispatch_new_client(
    http: httpx.AsyncClient,
    *,
    github_token: str,
    repo: str,
    workflow_file: str,
    email: str,
    client_uuid: str,
    flow: str,
) -> None:
    """Call the workflow_dispatch API with the new client's email/uuid/flow as inputs."""
    response = await http.post(
        f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/dispatches",
        headers=_headers(github_token),
        json={
            "ref": "main",
            "inputs": {"email": email, "uuid": client_uuid, "flow": _flow_input(flow)},
        },
    )
    response.raise_for_status()


async def dispatch_remove_client(
    http: httpx.AsyncClient,
    *,
    github_token: str,
    repo: str,
    workflow_file: str,
    client_uuid: str,
) -> None:
    """Call the workflow_dispatch API with the uuid of the client to remove."""
    response = await http.post(
        f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/dispatches",
        headers=_headers(github_token),
        json={"ref": "main", "inputs": {"uuid": client_uuid}},
    )
    response.raise_for_status()


async def dispatch_update_client(
    http: httpx.AsyncClient,
    *,
    github_token: str,
    repo: str,
    workflow_file: str,
    client_uuid: str,
    email: str,
    flow: str,
) -> None:
    """Call the workflow_dispatch API with the client's new email/flow, keyed by uuid."""
    response = await http.post(
        f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/dispatches",
        headers=_headers(github_token),
        json={
            "ref": "main",
            "inputs": {"uuid": client_uuid, "email": email, "flow": _flow_input(flow)},
        },
    )
    response.raise_for_status()


async def find_run_id(
    http: httpx.AsyncClient,
    *,
    github_token: str,
    repo: str,
    workflow_file: str,
    after: datetime,
) -> int | None:
    """Best-effort lookup of the run a dispatch created.

    `workflow_dispatch` itself returns no run id, so this looks at the
    workflow's most recent `workflow_dispatch` runs for one created at/after
    `after`. May return None if the run hasn't shown up in the API yet —
    callers are expected to retry on a later poll rather than block on this.
    """
    response = await http.get(
        f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/runs",
        headers=_headers(github_token),
        params={"event": "workflow_dispatch", "per_page": 5},
    )
    response.raise_for_status()
    for run in response.json().get("workflow_runs", []):
        created_at = datetime.fromisoformat(run["created_at"].replace("Z", "+00:00"))
        if created_at >= after:
            return run["id"]
    return None


async def get_run_status(
    http: httpx.AsyncClient, *, github_token: str, repo: str, run_id: int
) -> tuple[str, str | None]:
    """Return (status, conclusion) for a run — conclusion is None until completed."""
    response = await http.get(
        f"https://api.github.com/repos/{repo}/actions/runs/{run_id}",
        headers=_headers(github_token),
    )
    response.raise_for_status()
    data = response.json()
    return data["status"], data.get("conclusion")
