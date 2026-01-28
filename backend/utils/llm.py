import os
from typing import AsyncGenerator, Optional
from google import genai

_MODEL_NAME = "gemini-2.5-flash"

_client: Optional[genai.Client] = None
_llm: Optional["GeminiLLM"] = None


def _get_client() -> genai.Client:
    global _client

    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")

        _client = genai.Client(api_key=api_key)

    return _client


class GeminiLLM:
    async def stream(self, query: str) -> AsyncGenerator[str, None]:
        client = _get_client()

        response = client.models.generate_content_stream(
            model=_MODEL_NAME,
            contents=query,
        )

        for chunk in response:
            if chunk.text:
                yield chunk.text


def get_gemini_llm() -> GeminiLLM:
    """
    Lazy-load Gemini LLM wrapper.
    """
    global _llm

    if _llm is None:
        _llm = GeminiLLM()

    return _llm
