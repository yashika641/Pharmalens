from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, Tuple
from backend.utils.supabase import get_supabase

router = APIRouter(prefix="/user-profile", tags=["User Profile"])


# -------------------------------
# Request schema
# -------------------------------
class UserProfilePayload(BaseModel):
    age: int
    phone: str
    allergies: str
    conditions: str
    medications: Optional[str] = None


# -------------------------------
# Helper: extract user from JWT
# -------------------------------
def get_user_from_authorization(
    authorization: Optional[str],
) -> Tuple[str, Optional[str], Optional[str]]:
    supabase = get_supabase()
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization format")

    access_token = authorization.replace("Bearer ", "").strip()

    # ✅ Supabase validates the JWT internally
    user_response = supabase.auth.get_user(access_token)

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = user_response.user

    user_id = str(user.id)
    email = user.email

    # 🔥 Full name lives in user_metadata
    full_name = (
        user.user_metadata.get("full_name")
        or user.user_metadata.get("name")
        or None
    )

    return user_id, email, full_name

# -------------------------------
# Route
# -------------------------------
@router.post("")
def save_user_profile(
    payload: UserProfilePayload,
    authorization: Optional[str] = Header(None),
):
    supabase = get_supabase()
    user_id, email, full_name = get_user_from_authorization(authorization)

    data = {
        "user_id": user_id,   # ✅ FK → auth.users.id
        "age": payload.age,
        "phone": payload.phone,
        "allergies": payload.allergies,
        "conditions": payload.conditions,
        "medications": payload.medications,
        "email":email,
        "username":full_name
    }

    response = (
        supabase
        .table("user_profile")
        .upsert(data, on_conflict="user_id")
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to save profile")

    return {
        "status": "success",
        "profile": response.data[0],
    }

