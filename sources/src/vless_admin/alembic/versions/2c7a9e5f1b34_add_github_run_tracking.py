"""add_github_run_tracking

Revision ID: 2c7a9e5f1b34
Revises: 8f2b6d1a4c3e
Create Date: 2026-07-05 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "2c7a9e5f1b34"
down_revision: str | None = "8f2b6d1a4c3e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("github_run_id", sa.BigInteger, nullable=True))
    op.add_column("clients", sa.Column("github_run_status", sa.String, nullable=True))
    op.add_column(
        "clients", sa.Column("github_run_conclusion", sa.String, nullable=True)
    )


def downgrade() -> None:
    op.drop_column("clients", "github_run_conclusion")
    op.drop_column("clients", "github_run_status")
    op.drop_column("clients", "github_run_id")
