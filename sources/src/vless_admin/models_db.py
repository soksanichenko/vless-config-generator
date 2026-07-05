"""SQLAlchemy ORM models (used by Alembic for autogenerate)."""

from sqlalchemy import BigInteger, DateTime, String, func, text
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
    # dispatched; "dispatched" after that — just that the trigger call
    # succeeded, not that xray actually restarted. The real outcome is
    # tracked separately via github_run_id/_status/_conclusion below.
    status: MappedColumn[str] = mapped_column(
        String, nullable=False, server_default="pending"
    )
    # Set by a best-effort lookup after dispatch (workflow_dispatch itself
    # returns no run id) — None until found, or if it never turns up.
    github_run_id: MappedColumn[int | None] = mapped_column(BigInteger, nullable=True)
    # GitHub's own run `status` ("queued"/"in_progress"/"completed") and
    # `conclusion` ("success"/"failure"/... — None until status=="completed").
    github_run_status: MappedColumn[str | None] = mapped_column(String, nullable=True)
    github_run_conclusion: MappedColumn[str | None] = mapped_column(
        String, nullable=True
    )
    created_at: MappedColumn[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class Session(Base):
    """A server-side login session, backing both the site and admin logins.

    `session_id` is the opaque value carried inside the signed session
    cookie; `kind` ("site" or "admin") keeps the two login domains from
    ever being confused with each other, and `subject` is the client email
    (site) or admin username (admin) the session belongs to.
    """

    __tablename__ = "sessions"

    session_id: MappedColumn[str] = mapped_column(String, primary_key=True)
    kind: MappedColumn[str] = mapped_column(String, nullable=False)
    subject: MappedColumn[str] = mapped_column(String, nullable=False)
    expires_at: MappedColumn[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: MappedColumn[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
