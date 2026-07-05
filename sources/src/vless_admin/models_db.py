"""SQLAlchemy ORM models (used by Alembic for autogenerate)."""

from sqlalchemy import DateTime, String, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, MappedColumn, mapped_column


class Base(DeclarativeBase):
    pass


class Client(Base):
    """A VLESS client known to this app — backs the dropdown and site login.

    Only `email` and `client_uuid` are per-client; the other Reality/server
    parameters (server, port, public key, short id) are shared across every
    client and live in `AppConfig`, not here.
    """

    __tablename__ = "clients"

    id: MappedColumn[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    email: MappedColumn[str] = mapped_column(String, nullable=False, unique=True)
    client_uuid: MappedColumn[UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, unique=True
    )
    # "pending" until the infra GitHub Actions workflow is successfully
    # dispatched; "dispatched" after that — not a confirmation the xray
    # server actually picked it up, just that the trigger call succeeded.
    status: MappedColumn[str] = mapped_column(
        String, nullable=False, server_default="pending"
    )
    created_at: MappedColumn[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
