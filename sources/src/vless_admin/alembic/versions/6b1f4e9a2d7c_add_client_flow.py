"""add_client_flow

Revision ID: 6b1f4e9a2d7c
Revises: 2c7a9e5f1b34
Create Date: 2026-07-06 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "6b1f4e9a2d7c"
down_revision: str | None = "2c7a9e5f1b34"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("flow", sa.String, nullable=False, server_default="xtls-rprx-vision"),
    )


def downgrade() -> None:
    op.drop_column("clients", "flow")
