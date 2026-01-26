import requests
from models.ocr.exceptions import OCREngineError

OCR_SPACE_API_KEY = "K83818984888957"
OCR_SPACE_URL = "https://api.ocr.space/parse/image"


def run_ocr_space(image_bytes: bytes) -> tuple[str, float]:
    print("[OCR.Space] Starting OCR.Space request...")

    try:
        return _extracted_from_run_ocr_space_8(image_bytes)
    except Exception as exc:
        print("[OCR.Space ❌] Exception occurred")
        print("[OCR.Space ❌]", exc)
        raise OCREngineError(f"OCR.Space failure: {exc}") from exc


# TODO Rename this here and in `run_ocr_space`
def _extracted_from_run_ocr_space_8(image_bytes):
    # -------------------------------------------------
    # 1️⃣ Prepare request
    # -------------------------------------------------
    print("[OCR.Space] Preparing multipart payload")

    files = {
        # filename + content-type is CRITICAL
        "file": ("image.png", image_bytes, "image/png")
    }

    data = {
        "apikey": "K83818984888957",
        "language": "eng",
       "isOverlayRequired": False,
        "OCREngine": 2,  # better for handwriting
    }

    # -------------------------------------------------
    # 2️⃣ Send request
    # -------------------------------------------------
    print("[OCR.Space] Sending request to OCR.Space API...")
    response = requests.post(
        OCR_SPACE_URL,
        files=files,
        data=data,
        timeout=30,
    )

    print(f"[OCR.Space] HTTP status code: {response.status_code}")
    response.raise_for_status()

    # -------------------------------------------------
    # 3️⃣ Parse response JSON
    # -------------------------------------------------
    result = response.json()
    print("[OCR.Space] Response received")

    if result.get("IsErroredOnProcessing"):
        print("[OCR.Space ❌] OCR.Space returned an error")
        print("[OCR.Space ❌] Error message:", result.get("ErrorMessage"))
        raise OCREngineError(
            f"OCR.Space error: {result.get('ErrorMessage')}"
        )

    parsed_results = result.get("ParsedResults")

    if not parsed_results:
        print("[OCR.Space ⚠️] No parsed results returned")
        return "", 0.0

    # -------------------------------------------------
    # 4️⃣ Extract text + confidence
    # -------------------------------------------------
    print("[OCR.Space] Extracting text and confidence scores")

    text_blocks: list[str] = []
    confidences: list[float] = []

    for idx, block in enumerate(parsed_results):
        text = block.get("ParsedText", "").strip()
        print(f"[OCR.Space] Block {idx + 1} text length:", len(text))

        if text:
            text_blocks.append(text)

        overlay = block.get("TextOverlay", {})
        for line in overlay.get("Lines", []):
            for word in line.get("Words", []):
                conf = word.get("Confidence")
                if isinstance(conf, (int, float)):
                    confidences.append(conf / 100)

    full_text = "\n".join(text_blocks).strip()

    avg_confidence = (
        sum(confidences) / len(confidences)
        if confidences else 0.6  # safe default
    )

    print("[OCR.Space] OCR completed successfully")
    print("[OCR.Space] Total text length:", len(full_text))
    print("[OCR.Space] Avg confidence:", round(avg_confidence, 3))

    return full_text, round(avg_confidence, 3)
