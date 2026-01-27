import os
from google import genai
from typing import AsyncGenerator
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = "gemini-2.5-flash"


class GeminiLLM:
    async def stream(self, query: str) -> AsyncGenerator[str, None]:
        response = client.models.generate_content_stream(
            model=MODEL_NAME,
            contents=query,
        )

        for chunk in response:
            if chunk.text:
                yield chunk.text


llm = GeminiLLM()
