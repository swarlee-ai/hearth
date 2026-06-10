from openai import AsyncOpenAI
from app.models.settings import AppSettings


def get_llm_client(settings: AppSettings) -> AsyncOpenAI | None:
    """Return an AsyncOpenAI client configured from app settings, or None if not configured."""
    if not settings.llm_model_name:
        return None
    base_url = settings.llm_base_url or "https://api.openai.com/v1"
    api_key = settings.llm_api_key or "no-key"
    return AsyncOpenAI(base_url=base_url, api_key=api_key)


async def test_llm_connection(base_url: str, api_key: str | None, model_name: str) -> tuple[bool, str]:
    """Send a trivial prompt to verify LLM connectivity."""
    client = AsyncOpenAI(
        base_url=base_url,
        api_key=api_key or "no-key",
    )
    try:
        resp = await client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": "Reply with the single word: ok"}],
            max_tokens=10,
            temperature=0,
        )
        text = resp.choices[0].message.content or ""
        return True, f"Connected. Model responded: {text.strip()}"
    except Exception as e:
        return False, str(e)
    finally:
        await client.close()
