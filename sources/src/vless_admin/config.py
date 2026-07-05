"""Application configuration loaded from YAML."""

from pathlib import Path

import yaml
from pydantic import BaseModel


class AppConfig(BaseModel):
    """Top-level config model."""

    redis_url: str = "redis://localhost:6379"
    database_url: str = "postgresql://postgres:postgres@localhost:5432/vless_admin"
    cache_ttl: int = 86400

    # Shared VLESS/Reality server parameters — identical for every client,
    # templated from the same Infisical secrets xray's own config uses.
    vless_server: str = "zelgray.work"
    vless_server_port: int = 443
    vless_public_key: str = ""
    vless_short_id: str = ""
    vless_server_name: str = "zelgray.work"

    # GitHub Actions dispatch — applies a new client to the real xray server.
    github_token: str = ""
    github_repo: str = "owner/infra"
    github_workflow_file: str = "add-vless-client.yml"

    @property
    def sync_database_url(self) -> str:
        """SQLAlchemy sync URL for psycopg3 (postgresql+psycopg://...)."""
        return self.database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    @property
    def async_database_url(self) -> str:
        """SQLAlchemy async URL for psycopg3 (postgresql+psycopg_async://...)."""
        return self.database_url.replace(
            "postgresql://", "postgresql+psycopg_async://", 1
        )

    @classmethod
    def from_yaml(cls, path: Path | str) -> "AppConfig":
        """Load config from a YAML file."""
        with open(path) as f:
            return cls(**yaml.safe_load(f))
