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
    # xray inbound "flow" for this client's VLESS entry — "xtls-rprx-vision"
    # or "" (omits the key from xray's config entirely, e.g. when paired
    # with sing-box multiplex, which Vision can't be combined with).
    flow: MappedColumn[str] = mapped_column(
        String, nullable=False, server_default="xtls-rprx-vision"
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
    # When the currently-tracked action (add/update/remove) was actually
    # dispatched — used as the lower bound when matching a workflow run
    # (see `_refresh_client_runs`), since `created_at` is only accurate for
    # the original add; an edit or removal can happen long after creation,
    # and matching against `created_at` there would pick up an unrelated,
    # already-completed run of the same workflow file. Null on rows created
    # before this column existed.
    action_dispatched_at: MappedColumn[DateTime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
