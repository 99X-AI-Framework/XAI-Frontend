from typing import Any

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from .models import Base


def build_engine(url: str) -> AsyncEngine:
    kwargs: dict[str, Any] = {}
    if url.startswith("sqlite") and ":memory:" in url:
        kwargs = {"poolclass": StaticPool, "connect_args": {"check_same_thread": False}}
    return create_async_engine(url, **kwargs)


def build_sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


async def create_schema(engine: AsyncEngine) -> None:
    """Dev convenience. Use Alembic migrations in production."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

