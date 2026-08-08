"""SQLAlchemy ORM models (used by Alembic for autogenerate)."""

from sqlalchemy import BigInteger, DateTime, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, MappedColumn, mapped_column


class Base(DeclarativeBase):
    pass


class Client(Base):
    """A VLESS client known to this app — backs the dropdown and site login.

    Only `email` and `client_uuid` are per-client; the other Reality/server
    parameters (server, port, public key, short id) are shared across every
    client and live in `AppConfig`, not here.

    `email` is deliberately *not* unique: one person can hold multiple
    credentials under the same email (e.g. one with `flow` set for Vision,
    another with an empty `flow` for a sing-box config using multiplex).
    `email` identifies the *account* a site login belongs to; `client_uuid`
    (still unique) identifies which specific credential was used to prove
    ownership of that account — see `auth.py`'s `verify_client_login`.
    """

    __tablename__ = "clients"

    id: MappedColumn[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    email: MappedColumn[str] = mapped_column(String, nullable=False)
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


class DiscordLink(Base):
    """Links a Discord user id to a site-login account (`Client.email`).

    Established implicitly the first time someone logs in normally
    (email+`client_uuid`) while already Discord-authenticated (see
    `app.py`'s `login_submit`) — not a separate consent step, and not
    matched by email, since a client's `email` field is just an account
    label chosen when the credential was created, not necessarily a real
    address matching the Discord account's own email. One row per Discord
    user (`discord_user_id` is the primary key); logging in under a
    different account later overwrites it.
    """

    __tablename__ = "discord_links"

    discord_user_id: MappedColumn[str] = mapped_column(String, primary_key=True)
    email: MappedColumn[str] = mapped_column(String, nullable=False)
    linked_at: MappedColumn[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class SavedConfig(Base):
    """A generated sing-box config a site-logged-in account saved for later download.

    Keyed by `email` (the account), same as `Client` — any credential under
    that email can see/download/delete every config saved by any of them,
    matching how `/api/clients` already scopes by account rather than by
    the specific credential used to log in. Only the final generated
    `config.json` text is kept, not the rule-builder state that produced
    it. Capped at a small number of slots per account (see `app.py`'s
    `MAX_SAVED_CONFIGS_PER_ACCOUNT`); saving past the cap evicts the oldest
    row for that email.
    """

    __tablename__ = "saved_configs"

    id: MappedColumn[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    email: MappedColumn[str] = mapped_column(String, nullable=False)
    config_text: MappedColumn[str] = mapped_column(Text, nullable=False)
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
