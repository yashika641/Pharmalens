from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from supabase import Client
import os
from backend.utils.supabase import get_supabase

router = APIRouter(prefix="/user-profile", tags=["User Profile"])


# ─── Auth ─────────────────────────────────────────────────────────────────────

def get_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return response.user.id
    except Exception as e:
        raise HTTPException(
            status_code=401, detail=f"Token verification failed: {str(e)}"
        ) from e


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_list(raw: str | None) -> list[str]:
    """Split a comma-separated string into a cleaned list, ignoring blanks."""
    return [item.strip() for item in raw.split(",") if item.strip()] if raw else []


def _join_list(items: list[str]) -> str:
    return ",".join(items)


# ✅ Fixed: was `supabase: supabase` (module ref) → now `supabase: Client`
def _fetch_profile_row(user_id: str, supabase: Client) -> dict:
    res = (
        supabase.table("user_profile")
        .select("*")
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return res.data


# ─── Schemas ──────────────────────────────────────────────────────────────────

class AllergyPayload(BaseModel):
    allergy: str

class ConditionPayload(BaseModel):
    condition: str

class UpdateProfilePayload(BaseModel):
    full_name: str | None = None
    age: int | None = None
    phone: str | None = None
    username: str | None = None


# ─── GET /user-profile/details ────────────────────────────────────────────────

@router.get("/details")
def get_profile(user_id: str = Depends(get_user_id)):
    """Return the full user profile row."""
    supabase = get_supabase()
    row = _fetch_profile_row(user_id, supabase)
    return {"data": row}


# ─── PATCH /user-profile/update ───────────────────────────────────────────────

@router.patch("/update")
def update_profile(payload: UpdateProfilePayload, user_id: str = Depends(get_user_id)):
    """Update basic profile fields (name, age, phone, username)."""
    supabase = get_supabase()

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    res = (
        supabase.table("user_profile")
        .update(updates)
        .eq("user_id", user_id)
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=500, detail="Update failed")

    return {"message": "Profile updated", "data": res.data[0]}


# ─── POST /user-profile/add-allergy ──────────────────────────────────────────

@router.post("/add-allergy")
def add_allergy(payload: AllergyPayload, user_id: str = Depends(get_user_id)):
    supabase = get_supabase()
    row = _fetch_profile_row(user_id, supabase)

    current  = _parse_list(row.get("allergies"))
    new_item = payload.allergy.strip()

    if not new_item:
        raise HTTPException(status_code=400, detail="Allergy name cannot be empty")

    if any(a.lower() == new_item.lower() for a in current):
        raise HTTPException(status_code=409, detail=f"'{new_item}' is already in your allergies list")

    current.append(new_item)
    updated = _join_list(current)

    supabase.table("user_profile").update({"allergies": updated}).eq("user_id", user_id).execute()

    return {"message": "Allergy added", "allergies": updated}


# ─── DELETE /user-profile/remove-allergy ─────────────────────────────────────

@router.delete("/remove-allergy")
def remove_allergy(payload: AllergyPayload, user_id: str = Depends(get_user_id)):
    supabase = get_supabase()
    row = _fetch_profile_row(user_id, supabase)

    current   = _parse_list(row.get("allergies"))
    to_remove = payload.allergy.strip()

    updated_list = [a for a in current if a.lower() != to_remove.lower()]

    if len(updated_list) == len(current):
        raise HTTPException(status_code=404, detail=f"'{to_remove}' not found in allergies")

    updated = _join_list(updated_list)

    supabase.table("user_profile").update({"allergies": updated}).eq("user_id", user_id).execute()

    return {"message": "Allergy removed", "allergies": updated}


# ─── POST /user-profile/add-condition ────────────────────────────────────────

@router.post("/add-condition")
def add_condition(payload: ConditionPayload, user_id: str = Depends(get_user_id)):
    supabase = get_supabase()
    row = _fetch_profile_row(user_id, supabase)

    current  = _parse_list(row.get("conditions"))
    new_item = payload.condition.strip()

    if not new_item:
        raise HTTPException(status_code=400, detail="Condition name cannot be empty")

    if any(c.lower() == new_item.lower() for c in current):
        raise HTTPException(status_code=409, detail=f"'{new_item}' is already in your conditions list")

    current.append(new_item)
    updated = _join_list(current)

    supabase.table("user_profile").update({"conditions": updated}).eq("user_id", user_id).execute()

    return {"message": "Condition added", "conditions": updated}


# ─── DELETE /user-profile/remove-condition ───────────────────────────────────

@router.delete("/remove-condition")
def remove_condition(payload: ConditionPayload, user_id: str = Depends(get_user_id)):
    supabase = get_supabase()
    row = _fetch_profile_row(user_id, supabase)

    current   = _parse_list(row.get("conditions"))
    to_remove = payload.condition.strip()

    updated_list = [c for c in current if c.lower() != to_remove.lower()]

    if len(updated_list) == len(current):
        raise HTTPException(status_code=404, detail=f"'{to_remove}' not found in conditions")

    updated = _join_list(updated_list)

    supabase.table("user_profile").update({"conditions": updated}).eq("user_id", user_id).execute()

    return {"message": "Condition removed", "conditions": updated}