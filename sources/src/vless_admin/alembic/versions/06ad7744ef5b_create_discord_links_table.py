"""create_discord_links_table

Revision ID: 06ad7744ef5b
Revises: 4e8b1a6f3c9d
Create Date: 2026-08-07 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "06ad7744ef5b"
down_revision: str | None = "4e8b1a6f3c9d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "discord_links",
        sa.Column("discord_user_id", sa.String, primary_key=True),
        sa.Column("email", sa.String, nullable=False),
        sa.Column(
            "linked_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("discord_links")
