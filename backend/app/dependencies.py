from typing import AsyncGenerator
import redis.asyncio as aioredis

from app.database import AsyncSessionLocal
from app.config import settings


async def get_db() -> AsyncGenerator:
    async with AsyncSessionLocal() as session:
        yield session


async def get_redis():
    client = None
    try:
        client = aioredis.from_url(settings.redis_url, decode_responses=True)
        yield client
    except Exception:
        yield None
    finally:
        if client:
            await client.aclose()
