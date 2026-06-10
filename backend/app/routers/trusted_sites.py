import asyncio
import re
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db
from app.models.trusted_site import TrustedSite
from app.models.recipe import Recipe
from app.schemas.trusted_site import (
    TrustedSiteCreate, TrustedSiteResponse,
    BrowseSiteResponse, ImportFromUrlsRequest, ImportFromUrlsResponse,
)
from app.services.recipe_scraper import _fetch_html, _parse_html
from app.services.site_browser import browse_site_for_recipes
from app.services.auto_tagger import auto_tag, detect_cuisine, detect_kid_friendly, detect_leftover_friendly

router = APIRouter(prefix="/api/trusted-sites", tags=["trusted-sites"])

IMPORT_CONCURRENCY = 10


@router.get("", response_model=list[TrustedSiteResponse])
async def list_sites(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrustedSite).order_by(TrustedSite.name))
    return result.scalars().all()


@router.post("", response_model=TrustedSiteResponse, status_code=201)
async def add_site(data: TrustedSiteCreate, db: AsyncSession = Depends(get_db)):
    site = TrustedSite(**data.model_dump())
    db.add(site)
    await db.commit()
    await db.refresh(site)
    return site


@router.delete("/{site_id}", status_code=204)
async def delete_site(site_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    site = await db.get(TrustedSite, site_id)
    if not site:
        raise HTTPException(404, "Site not found")
    await db.delete(site)
    await db.commit()


@router.post("/{site_id}/browse", response_model=BrowseSiteResponse)
async def browse_site(site_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    site = await db.get(TrustedSite, site_id)
    if not site:
        raise HTTPException(404, "Site not found")
    base_url = site.base_url
    scrape_pattern = site.scrape_pattern
    # Release DB connection before the crawl — browsing can take several seconds
    await db.close()
    urls = await browse_site_for_recipes(base_url, scrape_pattern)
    # Reopen connection to stamp last_browsed_at and filter already-imported URLs
    site = await db.get(TrustedSite, site_id)
    if site:
        site.last_browsed_at = datetime.now(timezone.utc)
        await db.commit()
    if urls:
        existing = await db.execute(select(Recipe.source_url).where(Recipe.source_url.in_(urls)))
        already_imported_set = set(existing.scalars().all())
        new_urls = [u for u in urls if u not in already_imported_set]
        already_imported = len(urls) - len(new_urls)
        urls = new_urls
    else:
        already_imported = 0
    return BrowseSiteResponse(urls=urls, count=len(urls), already_imported=already_imported)


@router.post("/{site_id}/import-all", response_model=ImportFromUrlsResponse)
async def import_from_urls(
    site_id: uuid.UUID, data: ImportFromUrlsRequest, db: AsyncSession = Depends(get_db)
):
    site = await db.get(TrustedSite, site_id)
    if not site:
        raise HTTPException(404, "Site not found")

    urls = data.urls[:200]
    imported = 0
    failed = 0
    skipped = 0
    recipes = []
    errors = []

    existing = await db.execute(select(Recipe.source_url).where(Recipe.source_url.in_(urls)))
    already_imported_set = set(existing.scalars().all())
    urls_to_fetch = [u for u in urls if u not in already_imported_set]
    skipped = len(urls) - len(urls_to_fetch)

    # Phase 1: fetch all HTML concurrently (IMPORT_CONCURRENCY at a time)
    sem = asyncio.Semaphore(IMPORT_CONCURRENCY)

    async def fetch_one(url: str):
        async with sem:
            try:
                html = await _fetch_html(url)
                return url, html, None
            except Exception as e:
                return url, None, str(e)

    fetch_results = await asyncio.gather(*[fetch_one(u) for u in urls_to_fetch])

    # Phase 2: parse and insert sequentially (DB session is not concurrent-safe)
    for url, html, fetch_error in fetch_results:
        if fetch_error:
            failed += 1
            errors.append(f"{url}: {fetch_error}")
            continue
        try:
            scraped = _parse_html(html, url)
            servings_raw = scraped.get("servings", 4)
            if isinstance(servings_raw, str):
                nums = re.findall(r"\d+", servings_raw)
                servings_int = int(nums[0]) if nums else 4
            else:
                servings_int = int(servings_raw) if servings_raw else 4

            _ingredients = scraped.get("ingredients", [])
            _tags = auto_tag(
                scraped["title"],
                _ingredients,
                scraped.get("total_time_minutes"),
                scraped.get("tags", []),
            )
            recipe = Recipe(
                title=scraped["title"],
                description=scraped.get("description"),
                source_url=scraped.get("source_url"),
                image_url=scraped.get("image_url"),
                prep_time_minutes=scraped.get("prep_time_minutes"),
                cook_time_minutes=scraped.get("cook_time_minutes"),
                total_time_minutes=scraped.get("total_time_minutes"),
                servings=servings_int,
                ingredients=_ingredients,
                instructions=scraped.get("instructions", []),
                cuisine_type=(
                    scraped.get("cuisine_type")
                    or detect_cuisine(scraped["title"], _ingredients)
                ),
                tags=_tags,
                is_kid_friendly=detect_kid_friendly(scraped["title"], _ingredients, _tags),
                is_leftover_friendly=detect_leftover_friendly(_tags),
            )
            db.add(recipe)
            await db.commit()
            await db.refresh(recipe)
            recipes.append({"id": str(recipe.id), "title": recipe.title, "url": url})
            imported += 1
        except Exception as e:
            failed += 1
            errors.append(f"{url}: {str(e)}")

    return ImportFromUrlsResponse(imported=imported, failed=failed, skipped=skipped, recipes=recipes, errors=errors)
