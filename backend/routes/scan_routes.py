from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from backend.utils.supabase import get_supabase
import uuid
from backend.models.ocr.main import run_latest_image_ocr_pipeline

router = APIRouter(prefix="/images", tags=["Images"])

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    image_type: str = Form(...),
    authorization: str = Header(None)
):
    supabase = get_supabase()
    print("[AUTH] Authorization header:", authorization)

    # 🔐 Auth
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = authorization.replace("Bearer ", "")
    user_response = supabase.auth.get_user(token)

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = user_response.user.id

    # ✅ Validate image type
    if image_type not in ("medicine", "prescription"):
        raise HTTPException(status_code=400, detail="Invalid image type")

    # ✅ Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    ext = file.filename.split(".")[-1]
    filename = f"{user_id}/{image_type}/{uuid.uuid4()}.{ext}"

    file_bytes = await file.read()

    # ☁️ Upload
    supabase.storage.from_("pharmalens").upload(
        path=filename,
        file=file_bytes,
        file_options={"content-type": file.content_type}
    )

    public_url = supabase.storage.from_("pharmalens").get_public_url(filename)

    # 🗄️ Save metadata
    image_insert = supabase.table("images").insert({
        "user_id": user_id,
        "image_url": public_url,
        "image_type": image_type
    }).execute()

    if image_insert.data is None or len(image_insert.data) == 0:
        raise HTTPException(status_code=500, detail="Failed to save image metadata")
    
    image_id = image_insert.data[0]["id"]
    print(f"Image metadata saved with ID: {image_id}")
    # 🚀 Trigger OCR pipeline
    await  run_latest_image_ocr_pipeline(user_id=user_id)
    result = (
        supabase
        .table("medicine_ocr_data")
        .select("*")
        .eq("image_id", image_id)
        .limit(1)
        .execute()
    )

    return {
            "success": True,
            "image_url": public_url,
            "ocr_result": result.data[0] if result.data else None
        }
