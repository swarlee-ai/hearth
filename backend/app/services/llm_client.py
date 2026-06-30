from openai import AsyncOpenAI
from app.models.settings import AppSettings


def completion_extra_args(settings: AppSettings) -> dict:
    """Provider-specific options for chat completion calls.

    Qwen thinking models served through vLLM can spend the entire token budget
    in `reasoning` and return no `content`, which makes Hearth's chat and JSON
    generation look like they hang or return empty output. vLLM supports
    disabling this through chat_template_kwargs.
    """
    model = (settings.llm_model_name or "").lower()
    base_url = (settings.llm_base_url or "").lower()
    if "qwen" in model and "api.openai.com" not in base_url:
        return {"extra_body": {"chat_template_kwargs": {"enable_thinking": False}}}
    return {}


def get_llm_client(settings: AppSettings) -> AsyncOpenAI | None:
    """Return an AsyncOpenAI client configured from app settings, or None if not configured."""
    if not settings.llm_model_name:
        return None
    base_url = settings.llm_base_url or "https://api.openai.com/v1"
    api_key = settings.llm_api_key or "no-key"
    return AsyncOpenAI(
        base_url=base_url,
        api_key=api_key,
        timeout=300.0,
        max_retries=0,
    )


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
            **completion_extra_args(AppSettings(llm_base_url=base_url, llm_api_key=api_key, llm_model_name=model_name)),
        )
        text = resp.choices[0].message.content or ""
        return True, f"Connected. Model responded: {text.strip()}"
    except Exception as e:
        return False, str(e)
    finally:
        await client.close()
