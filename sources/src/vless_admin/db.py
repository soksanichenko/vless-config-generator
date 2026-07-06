"""PostgreSQL access layer: DB creation + SQLAlchemy async CRUD."""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import delete, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy_utils import create_database, database_exists

from .models_db import Client, Session

logger = logging.getLogger(__name__)

_session_factory: async_sessionmaker | None = None


def create_db_if_not_exists(sync_url: str) -> None:
    """Create the PostgreSQL database if it does not exist.

    Table creation and migrations are handled exclusively by Alembic.
    """
    logger.info("Checking database existence")
    if not database_exists(sync_url):
        logger.info("Database not found, creating")
        create_database(sync_url)
        logger.info("Database created")


def init_db(async_url: str) -> None:
    """Initialise the async engine and session factory."""
    global _session_factory
    engine = create_async_engine(async_url)
    _session_factory = async_sessionmaker(engine, expire_on_commit=False)


def get_session() -> AsyncSession:
    """Return a new async session from the factory."""
    return _session_factory()


async def client_create(email: str, flow: str) -> Client:
    """Insert a new client with a freshly generated UUID, status=pending."""
    async with get_session() as session:
        result = await session.execute(
            insert(Client)
            .values(email=email, client_uuid=uuid4(), flow=flow)
            .returning(Client)
        )
        await session.commit()
        return result.scalar_one()


async def client_list() -> list[Client]:
    """Return all known clients, most recent first."""
    async with get_session() as session:
        result = await session.execute(
            select(Client).order_by(Client.created_at.desc())
        )
        return list(result.scalars())


async def client_get(client_id: UUID) -> Client | None:
    """Return the client row for an id, or None."""
    async with get_session() as session:
        result = await session.execute(select(Client).where(Client.id == client_id))
        return result.scalar_one_or_none()


async def client_get_by_email(email: str) -> Client | None:
    """Return the client row for an email, or None."""
    async with get_session() as session:
        result = await session.execute(select(Client).where(Client.email == email))
        return result.scalar_one_or_none()


async def client_mark_dispatched(client_id: UUID) -> None:
    """Flip a client's status to 'dispatched' and clear any prior run tracking."""
    async with get_session() as session:
        await session.execute(
            update(Client)
            .where(Client.id == client_id)
            .values(
                status="dispatched",
                github_run_id=None,
                github_run_status=None,
                github_run_conclusion=None,
                action_dispatched_at=datetime.now(UTC),
            )
        )
        await session.commit()


async def client_mark_pending_removal(client_id: UUID) -> None:
    """Flip a client's status to 'pending_removal', ahead of dispatching removal.

    Mirrors `client_create`'s initial "pending" status for the add flow: set
    before the dispatch call is even attempted, so a client stays visibly
    distinguishable (and its site login stays blocked, see auth.py) even if
    the dispatch call itself fails and `client_mark_removing` below is never
    reached.
    """
    async with get_session() as session:
        await session.execute(
            update(Client)
            .where(Client.id == client_id)
            .values(
                status="pending_removal",
                github_run_id=None,
                github_run_status=None,
                github_run_conclusion=None,
            )
        )
        await session.commit()


async def client_mark_removing(client_id: UUID) -> None:
    """Flip a client's status to 'removing' and clear any prior run tracking.

    Setting status to anything other than "dispatched" immediately blocks
    that client's site login/session (see auth.py), regardless of how long
    the removal workflow itself takes to finish.
    """
    async with get_session() as session:
        await session.execute(
            update(Client)
            .where(Client.id == client_id)
            .values(
                status="removing",
                github_run_id=None,
                github_run_status=None,
                github_run_conclusion=None,
                action_dispatched_at=datetime.now(UTC),
            )
        )
        await session.commit()


async def client_update(client_id: UUID, email: str, flow: str) -> None:
    """Update a client's email/flow with no status change.

    Only used for a client whose "add" was never actually dispatched yet
    (status "pending") — nothing exists server-side to update, so the next
    "Retry" of the add picks up these new values on its own.
    """
    async with get_session() as session:
        await session.execute(
            update(Client).where(Client.id == client_id).values(email=email, flow=flow)
        )
        await session.commit()


async def client_mark_pending_update(client_id: UUID, email: str, flow: str) -> None:
    """Update a client's email/flow and flip status to 'pending_update'.

    Set before the update-workflow dispatch is even attempted (same idea as
    `client_mark_pending_removal`), so a failed dispatch still leaves a
    distinguishable, retryable state. Unlike removal, this status still
    allows site login (see auth.py) — editing metadata isn't a security
    revocation.
    """
    async with get_session() as session:
        await session.execute(
            update(Client)
            .where(Client.id == client_id)
            .values(
                email=email,
                flow=flow,
                status="pending_update",
                github_run_id=None,
                github_run_status=None,
                github_run_conclusion=None,
            )
        )
        await session.commit()


async def client_mark_updating(client_id: UUID) -> None:
    """Flip a client's status to 'updating' and clear any prior run tracking."""
    async with get_session() as session:
        await session.execute(
            update(Client)
            .where(Client.id == client_id)
            .values(
                status="updating",
                github_run_id=None,
                github_run_status=None,
                github_run_conclusion=None,
                action_dispatched_at=datetime.now(UTC),
            )
        )
        await session.commit()


async def client_mark_updated(client_id: UUID) -> None:
    """Flip a client's status back to 'dispatched' once its edit has confirmed success.

    Deliberately does not reset the run-tracking columns — they keep
    reflecting the edit's own outcome, the same way `client_mark_removing`
    repurposes them for the remove workflow rather than the original add.
    """
    async with get_session() as session:
        await session.execute(
            update(Client).where(Client.id == client_id).values(status="dispatched")
        )
        await session.commit()


async def client_delete(client_id: UUID) -> None:
    """Hard-delete a client row once its removal workflow has confirmed success."""
    async with get_session() as session:
        await session.execute(delete(Client).where(Client.id == client_id))
        await session.commit()


async def client_set_run_id(client_id: UUID, run_id: int) -> None:
    """Record the GitHub Actions run id found for a dispatched client."""
    async with get_session() as session:
        await session.execute(
            update(Client).where(Client.id == client_id).values(github_run_id=run_id)
        )
        await session.commit()


async def client_update_run_status(
    client_id: UUID, status: str, conclusion: str | None
) -> None:
    """Update a client's tracked GitHub Actions run status/conclusion."""
    async with get_session() as session:
        await session.execute(
            update(Client)
            .where(Client.id == client_id)
            .values(github_run_status=status, github_run_conclusion=conclusion)
        )
        await session.commit()


async def session_create(
    session_id: str, kind: str, subject: str, expires_at: datetime
) -> None:
    """Store a new login session (site or admin)."""
    async with get_session() as session:
        await session.execute(
            insert(Session).values(
                session_id=session_id, kind=kind, subject=subject, expires_at=expires_at
            )
        )
        await session.commit()


async def session_get(session_id: str, kind: str) -> Session | None:
    """Return the session row for an id+kind if it exists and hasn't expired."""
    async with get_session() as session:
        result = await session.execute(
            select(Session).where(
                Session.session_id == session_id,
                Session.kind == kind,
                Session.expires_at > datetime.now(UTC),
            )
        )
        return result.scalar_one_or_none()


async def session_delete(session_id: str) -> None:
    """Delete a session row (logout)."""
    async with get_session() as session:
        await session.execute(delete(Session).where(Session.session_id == session_id))
        await session.commit()
