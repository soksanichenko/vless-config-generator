"""Trigger the `infra` repo's GitHub Actions workflow that applies a new VLESS client.

This backend never writes to Infisical or touches the xray server directly —
it only dispatches a workflow in `infra`, which holds the write-capable
Infisical credential and runs the actual `ansible-playbook` deploy.
"""

import logging

import httpx

logger = logging.getLogger(__name__)


async def dispatch_new_client(
    http: httpx.AsyncClient,
    *,
    github_token: str,
    repo: str,
    workflow_file: str,
    email: str,
    client_uuid: str,
) -> None:
    """Call the workflow_dispatch API with the new client's email/uuid as inputs."""
    response = await http.post(
        f"https://api.github.com/repos/{repo}/actions/workflows/{workflow_file}/dispatches",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {github_token}",
        },
        json={"ref": "main", "inputs": {"email": email, "uuid": client_uuid}},
    )
    response.raise_for_status()
