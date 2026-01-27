from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
from typing import Optional, Tuple
from backend.utils.supabase import supabase

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

def get_user_from_auth(authorization: Optional[str]):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization format")

    access_token = authorization.replace("Bearer ", "")

    user_response = supabase.auth.get_user(access_token)

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = user_response.user

    return {
        "user_id": user.id,
        "email": user.email,
        "full_name": user.user_metadata.get("full_name"),
    }
    
@router.get("/details")
def get_user_details(authorization: Optional[str] = Header(None)):
    # 1️⃣ Get auth user
    auth_user = get_user_from_auth(authorization)

    # 2️⃣ Fetch profile from DB using FK (auth.users.id)
    profile_response = (
        supabase
        .table("user_profile")
        .select("age, allergies, conditions")
        .eq("user_id", auth_user["user_id"])
        .single()
        .execute()
    )
    print("PROFILE RESPONSE:", profile_response)
    if not profile_response.data:
        raise HTTPException(status_code=404, detail="User profile not found")

    profile = profile_response.data

    # 3️⃣ Merge auth + profile data
    return {
        "status": "success",
        "data": {
            "user_id": auth_user["user_id"],
            "email": auth_user["email"],
            "full_name": auth_user["full_name"],
            "age": profile.get("age") if isinstance(profile, dict) else profile.age, #type: ignore
            "allergies": profile.get("allergies") if isinstance(profile, dict) else profile.allergies, #type: ignore
            "conditions": profile.get("conditions") if isinstance(profile, dict) else profile.conditions, #type: ignore
        }
    }