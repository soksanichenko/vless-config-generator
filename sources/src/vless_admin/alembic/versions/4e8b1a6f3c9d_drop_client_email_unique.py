"""drop_client_email_unique

Revision ID: 4e8b1a6f3c9d
Revises: 9f3a7c2e5b6d
Create Date: 2026-07-06 00:00:00.000000
"""

from collections.abc import Sequence

from alembic import op

revision: str = "4e8b1a6f3c9d"
down_revision: str | None = "9f3a7c2e5b6d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("clients_email_key", "clients", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("clients_email_key", "clients", ["email"])
