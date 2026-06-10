"""Fetch transcript and metadata from a YouTube video URL."""
import re
import httpx
from typing import Optional


_YT_ID_RE = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|shorts/|embed/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)


def extract_video_id(url: str) -> Optional[str]:
    m = _YT_ID_RE.search(url)
    return m.group(1) if m else None


async def get_video_metadata(video_id: str) -> dict:
    """Fetch title and thumbnail via YouTube oEmbed (no API key required)."""
    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(oembed_url)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "title": data.get("title"),
                    "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                    "author": data.get("author_name"),
                }
    except Exception:
        pass
    return {
        "title": None,
        "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "author": None,
    }


async def get_transcript(video_id: str) -> Optional[str]:
    """Return the video transcript as a single string, or None if unavailable."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi  # type: ignore

        # 0.6.x uses instance methods; older versions used class/static methods.
        # Try both styles so the code works across library versions.
        try:
            ytt = YouTubeTranscriptApi()
            transcript_list = ytt.list_transcripts(video_id)
        except TypeError:
            # Fallback for older API where YouTubeTranscriptApi() takes no args
            # and list_transcripts is a static method
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)  # type: ignore

        # Prefer manually created English, then auto-generated English, then any
        transcript = None
        try:
            transcript = transcript_list.find_manually_created_transcript(["en", "en-US", "en-GB"])
        except Exception:
            pass
        if not transcript:
            try:
                transcript = transcript_list.find_generated_transcript(["en", "en-US", "en-GB"])
            except Exception:
                pass
        if not transcript:
            try:
                transcript = next(iter(transcript_list))
            except StopIteration:
                return None

        segments = transcript.fetch()
        # Segments are dict-like objects in both old and new versions
        text = " ".join(
            seg.get("text", seg.text if hasattr(seg, "text") else "")
            for seg in segments
        )
        return text.strip() or None
    except Exception:
        return None


async def get_video_description(video_id: str) -> Optional[str]:
    """Fallback: scrape the YouTube page for the video description."""
    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        async with httpx.AsyncClient(headers=headers, timeout=15, follow_redirects=True) as client:
            resp = await client.get(url)
            html = resp.text

        # Extract description from the ytInitialData JSON blob
        m = re.search(r'"shortDescription":"((?:[^"\\]|\\.)*)"', html)
        if m:
            desc = m.group(1).encode("utf-8").decode("unicode_escape")
            return desc[:8000]
    except Exception:
        pass
    return None
