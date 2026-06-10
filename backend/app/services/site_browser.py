import asyncio
import re
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}
RECIPE_PATH_PATTERNS = re.compile(
    r"/recipe[s]?/|/dish/|/food/|/cook/|/meal/", re.IGNORECASE
)
# Paths that are never recipe pages — used to filter out navigation/utility links
EXCLUDE_PATHS = re.compile(
    r"/about|/contact|/privacy|/terms|/login|/register|/cart|/shop"
    r"|/search|/author/|/page/\d|/tag/|/wp-content|/cdn-cgi|/feed"
    r"|\.(?:css|js|jpg|jpeg|png|gif|svg|ico|pdf|zip)(\?|$)",
    re.IGNORECASE
)
MAX_URLS = 200
DELAY_BETWEEN_REQUESTS = 0.5


async def browse_site_for_recipes(base_url: str, scrape_pattern: str | None = None) -> list[str]:
    """Crawl a site for recipe URLs: homepage → category pages → pagination."""
    found: set[str] = set()
    domain = urlparse(base_url).netloc

    async with httpx.AsyncClient(headers=HEADERS, timeout=10, follow_redirects=True) as client:
        # 1. Crawl homepage
        homepage_links = await _get_links(client, base_url, domain)
        found.update(_filter_recipe_links(homepage_links, scrape_pattern))

        # 2. Follow category/listing pages linked from homepage
        category_links = [l for l in homepage_links if l not in found and _looks_like_category(l)]
        for cat_link in category_links[:10]:
            if len(found) >= MAX_URLS:
                break
            await asyncio.sleep(DELAY_BETWEEN_REQUESTS)
            try:
                cat_links = await _get_links(client, cat_link, domain)
                found.update(_filter_recipe_links(cat_links, scrape_pattern))

                # 3. Follow pagination within each category (e.g. /recipes/page/2/)
                for page_link in _get_pagination_links(cat_links, domain)[:3]:
                    if len(found) >= MAX_URLS:
                        break
                    await asyncio.sleep(DELAY_BETWEEN_REQUESTS)
                    try:
                        paged_links = await _get_links(client, page_link, domain)
                        found.update(_filter_recipe_links(paged_links, scrape_pattern))
                    except Exception:
                        continue
            except Exception:
                continue

    return list(found)[:MAX_URLS]


async def _get_links(client: httpx.AsyncClient, url: str, domain: str) -> list[str]:
    try:
        resp = await client.get(url)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        absolute = urljoin(url, href)
        parsed = urlparse(absolute)
        if parsed.netloc == domain and parsed.scheme in ("http", "https"):
            links.append(absolute.split("#")[0])
    return list(set(links))


def _get_pagination_links(links: list[str], domain: str) -> list[str]:
    """Find paginated listing pages: /recipes/page/2/, /category/dinner/page/3/, etc."""
    pagination = set()
    for link in links:
        p = urlparse(link)
        if p.netloc == domain and re.search(r'/page/[2-9]\d*/?$', p.path):
            pagination.add(link)
    return sorted(pagination)


def _looks_like_recipe_slug(url: str) -> bool:
    """Catch blog-style recipe URLs like domain.com/chicken-tikka-masala/ that have
    no /recipes/ prefix — common on food blogs (Budget Bytes, Half Baked Harvest, etc.)."""
    path = urlparse(url).path
    if EXCLUDE_PATHS.search(path):
        return False
    segments = [s for s in path.strip("/").split("/") if s]
    if not segments:
        return False
    last = segments[-1]
    # Recipe slugs are typically long hyphenated strings (e.g. "easy-chicken-tikka-masala")
    return len(last) >= 10 and "-" in last


def _filter_recipe_links(links: list[str], pattern: str | None) -> list[str]:
    result = []
    for link in links:
        path = urlparse(link).path
        if pattern and re.search(pattern, link, re.IGNORECASE):
            result.append(link)
        elif RECIPE_PATH_PATTERNS.search(path):
            result.append(link)
        elif _looks_like_recipe_slug(link):
            result.append(link)
    return result


def _looks_like_category(url: str) -> bool:
    path = urlparse(url).path.lower()
    return any(kw in path for kw in [
        "/category/", "/categories/", "/cuisine/", "/type/",
        "/collection/", "/tag/", "/recipes/", "/recipe-index/", "/blog/",
    ])
