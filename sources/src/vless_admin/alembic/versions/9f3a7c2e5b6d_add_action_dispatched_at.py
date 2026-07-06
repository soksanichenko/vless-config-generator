"""add_action_dispatched_at

Revision ID: 9f3a7c2e5b6d
Revises: 6b1f4e9a2d7c
Create Date: 2026-07-06 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9f3a7c2e5b6d"
down_revision: str | None = "6b1f4e9a2d7c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clients",
        sa.Column("action_dispatched_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clients", "action_dispatched_at")
