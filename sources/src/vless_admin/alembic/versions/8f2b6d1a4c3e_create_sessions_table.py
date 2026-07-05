"""create_sessions_table

Revision ID: 8f2b6d1a4c3e
Revises: 3ae93c2a5251
Create Date: 2026-07-05 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "8f2b6d1a4c3e"
down_revision: str | None = "3ae93c2a5251"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "sessions",
        sa.Column("session_id", sa.String, primary_key=True),
        sa.Column("kind", sa.String, nullable=False),
        sa.Column("subject", sa.String, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("sessions")
