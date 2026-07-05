"""PostgreSQL access layer: DB creation + SQLAlchemy async CRUD."""

import logging
from uuid import UUID, uuid4

from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy_utils import create_database, database_exists

from .models_db import Client

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


async def client_create(email: str) -> Client:
    """Insert a new client with a freshly generated UUID, status=pending."""
    async with get_session() as session:
        result = await session.execute(
            insert(Client).values(email=email, client_uuid=uuid4()).returning(Client)
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
    """Flip a client's status to 'dispatched' after a successful GitHub dispatch call."""
    async with get_session() as session:
        await session.execute(
            update(Client).where(Client.id == client_id).values(status="dispatched")
        )
        await session.commit()
