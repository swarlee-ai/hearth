import json
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin, urlparse
import httpx
from recipe_scrapers import scrape_html, WebsiteNotImplementedError, NoSchemaFoundInWildMode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.scrape_cache import RecipeScrapeCache
from app.services.utils.ingredient_parser import parse_ingredient

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}
CACHE_TTL_DAYS = 7


async def _fetch_html(url: str) -> str:
    async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.text


async def scrape_recipe_url(url: str, db: AsyncSession) -> dict:
    """Scrape a recipe URL, using DB cache to avoid redundant fetches."""
    now = datetime.now(timezone.utc)

    cached = await db.scalar(
        select(RecipeScrapeCache).where(
            RecipeScrapeCache.url == url,
            RecipeScrapeCache.expires_at > now,
        )
    )
    if cached:
        return cached.scraped_data

    html = await _fetch_html(url)
    data = _parse_html(html, url)

    existing = await db.scalar(select(RecipeScrapeCache).where(RecipeScrapeCache.url == url))
    if existing:
        existing.scraped_data = data
        existing.scraped_at = now
        existing.expires_at = now + timedelta(days=CACHE_TTL_DAYS)
    else:
        db.add(RecipeScrapeCache(
            url=url,
            scraped_data=data,
            scraped_at=now,
            expires_at=now + timedelta(days=CACHE_TTL_DAYS),
        ))
    await db.commit()
    return data


def _parse_html(html: str, url: str) -> dict:
    try:
        scraper = scrape_html(html=html, org_url=url, wild_mode=True)
    except (WebsiteNotImplementedError, NoSchemaFoundInWildMode) as e:
        raise ValueError(f"Could not parse recipe from this URL: {e}")

    raw_ingredients = []
    try:
        raw_ingredients = scraper.ingredients() or []
    except Exception:
        pass

    parsed_ingredients = [parse_ingredient(i) for i in raw_ingredients]

    raw_instructions = []
    try:
        inst_text = scraper.instructions_list()
        if inst_text:
            raw_instructions = [{"step": i + 1, "text": t} for i, t in enumerate(inst_text)]
        else:
            full = scraper.instructions()
            if full:
                lines = [l.strip() for l in full.split("\n") if l.strip()]
                raw_instructions = [{"step": i + 1, "text": l} for i, l in enumerate(lines)]
    except Exception:
        pass

    image = None
    try:
        image = scraper.image()
        if image and not image.startswith("http"):
            image = urljoin(url, image)
    except Exception:
        pass

    def safe(fn):
        try:
            return fn()
        except Exception:
            return None

    return {
        "title": safe(scraper.title) or _url_to_title(url),
        "description": safe(scraper.description),
        "source_url": url,
        "image_url": image,
        "prep_time_minutes": safe(scraper.prep_time),
        "cook_time_minutes": safe(scraper.cook_time),
        "total_time_minutes": safe(scraper.total_time),
        "servings": safe(scraper.yields) or 4,
        "ingredients": parsed_ingredients,
        "instructions": raw_instructions,
        "cuisine_type": None,
        "tags": [],
    }


def _url_to_title(url: str) -> str:
    path = urlparse(url).path.rstrip("/").split("/")[-1]
    return path.replace("-", " ").replace("_", " ").title() or "Imported Recipe"
