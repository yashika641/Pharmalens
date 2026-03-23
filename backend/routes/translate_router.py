from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from urllib.parse import quote
import httpx
import html
import os

router = APIRouter(prefix="/translate", tags=["Translation"])

GOOGLE_API_KEY = os.environ.get("GOOGLE_TRANSLATE_API_KEY", "")

LANG_CODE = {
    "english": "en", "spanish": "es", "french": "fr", "german": "de",
    "chinese": "zh", "arabic": "ar", "hindi": "hi", "japanese": "ja",
    "portuguese": "pt", "russian": "ru",
}

VALID_CODES = set(LANG_CODE.values())  # {"en", "es", "fr", ...}


class TranslateRequest(BaseModel):
    texts: list[str]
    target: str
    source: str = "en"

    @field_validator("target", mode="before")
    @classmethod
    def normalize_target(cls, v: str) -> str:
        # If it's already a valid code like "es", pass through
        if v in VALID_CODES:
            return v
        # If it's a full name like "Spanish", convert it
        converted = LANG_CODE.get(v.lower())
        if converted:
            return converted
        raise ValueError(f"Unknown target language: '{v}'. Use a code like 'es' or full name like 'Spanish'.")


@router.post("")
async def translate(payload: TranslateRequest):
    print(f"DEBUG: target='{payload.target}', texts={payload.texts}")

    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="Translation API key not configured")

    if not payload.texts:
        return {"translations": []}

    if payload.target == "en":
        return {"translations": payload.texts}

    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            "https://translation.googleapis.com/language/translate/v2",
            params={
                "key": GOOGLE_API_KEY,
                "target": payload.target,
                "source": payload.source,
                "format": "text",
            },
            content="&".join([f"q={quote(text)}" for text in payload.texts]),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)

        translations = res.json()["data"]["translations"]
        results = [html.unescape(tr["translatedText"]) for tr in translations]

    return {"translations": results}