from fastapi import APIRouter, Depends, HTTPException, Header
from supabase import create_client, Client
from backend.utils.supabase import get_supabase

import os

router = APIRouter(prefix="/user", tags=["User History"])


# ─── Supabase client ──────────────────────────────────────────────────────────



# ─── Auth: resolve user_id from Bearer token ─────────────────────────────────

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


# ─── GET /user/history ────────────────────────────────────────────────────────
# Reads {id, name} entries from user_history JSON arrays and returns them
# as summary lists for the dashboard.

@router.get("/history")
def get_user_history(user_id: str = Depends(get_user_id)):
    supabase = get_supabase()

    res = (
        supabase.table("user_history")
        .select("medicine_scan_ids, prescription_ids")
        .eq("user_id", user_id)
        .execute()
    )
    print(f"[User History] Fetched history for user_id={user_id}: {res.data}")

    if not res.data:
        return {
            "total_scans": 0,
            "medicine_scans": 0,
            "prescription_scans": 0,
            "medicines": [],
            "prescriptions": []
        }

    row = res.data[0]

    raw_medicines = row.get("medicine_scan_ids") or []
    raw_prescriptions = row.get("prescription_ids") or []

    # ✅ Simple lists (id + name only)
    medicines = [
        {
            "id": entry.get("id"),
            "name": entry.get("name", "Unknown Medicine")
        }
        for entry in raw_medicines
        if isinstance(entry, dict)
    ]

    prescriptions = [
        {
            "id": entry.get("id"),
            "name": entry.get("name", "Unknown Doctor")
        }
        for entry in raw_prescriptions
        if isinstance(entry, dict)
    ]

    # ✅ Simple counts
    medicine_scans = len(medicines)
    prescription_scans = len(prescriptions)
    total_scans = medicine_scans + prescription_scans

    return {
        "total_scans": total_scans,
        "medicine_scans": medicine_scans,
        "prescription_scans": prescription_scans,
        "medicines": medicines,
        "prescriptions": prescriptions
    }

# ─── GET /user/history/medicine/{record_id} ───────────────────────────────────
# Full medicine details — verifies ownership via user_history before returning.

@router.get("/history/medicine/{record_id}")
def get_medicine_detail(record_id: str, user_id: str = Depends(get_user_id)):
    supabase = get_supabase()

    # Ownership check: record_id must appear inside medicine_scan_ids array
    history_res = (
        supabase.table("user_history")
        .select("medicine_scan_ids")
        .eq("user_id", user_id)
        .execute()
    )

    if not history_res.data:
        raise HTTPException(status_code=404, detail="No history found for this user")

    entries = history_res.data[0].get("medicine_scan_ids") or []
    owned   = any(
        isinstance(e, dict) and e.get("id") == record_id
        for e in entries
    )
    if not owned:
        raise HTTPException(status_code=403, detail="Access denied to this record")

    # Fetch full details
    res = (
        supabase.table("medicine_ocr_data")
        .select("*")
        .eq("id", record_id)
        .single()
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Medicine record not found")

    d = res.data

    # Build ingredients / side-effects / warnings from composition & precautions
    composition = d.get("composition") or ""
    ingredients = [i.strip() for i in composition.split(",")] if composition else []

    precautions = d.get("precautions") or ""
    warnings    = [p.strip() for p in precautions.split(".") if p.strip()]

    return {
        "id":                   record_id,
        "medicine_name":        d.get("medicine_name"),
        "medicine_type":        d.get("medicine_type"),
        "strength":             d.get("dosage"),
        "manufacturer":         None,
        "ingredients":          ingredients,
        "warnings":             warnings,
        "interactions":         [],
        "dosage_instructions":  d.get("dosage"),
        "side_effects":         [],
        "status":               _confidence_to_status(d.get("confidence", 1.0)),
        "scanned_at":           d.get("created_at"),
        "expiry_date":          d.get("expiry_date"),
        "mfg_date":             d.get("mfg_date"),
        "raw_text":             d.get("raw_text"),
        "ocr_engine":           d.get("ocr_engine"),
        "confidence":           d.get("confidence"),
    }


# ─── GET /user/history/prescription/{record_id} ───────────────────────────────
# Full prescription details — verifies ownership before returning.

@router.get("/history/prescription/{record_id}")
def get_prescription_detail(record_id: str, user_id: str = Depends(get_user_id)):
    supabase = get_supabase()

    # Ownership check
    history_res = (
        supabase.table("user_history")
        .select("prescription_ids")
        .eq("user_id", user_id)
        .execute()
    )

    if not history_res.data:
        raise HTTPException(status_code=404, detail="No history found for this user")

    entries = history_res.data[0].get("prescription_ids") or []
    owned   = any(
        isinstance(e, dict) and e.get("id") == record_id
        for e in entries
    )
    if not owned:
        raise HTTPException(status_code=403, detail="Access denied to this record")

    # Fetch full details
    res = (
        supabase.table("prescription_ocr_data")
        .select("*")
        .eq("id", record_id)
        .single()
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Prescription record not found")

    d = res.data

    return {
        "id":                    record_id,
        "doctor_name":           d.get("doctor_name"),
        "doctor_specialization": None,
        "clinic_name":           None,
        "prescribed_medicines":  d.get("medicines") or [],
        "diagnosis":             d.get("diagnosis"),
        "instructions":          d.get("routes"),
        "follow_up_date":        None,
        "status":                _confidence_to_status(d.get("confidence", 1.0)),
        "scanned_at":            d.get("created_at"),
        "prescription_date":     d.get("prescription_date"),
        "raw_text":              d.get("raw_text"),
        "ocr_engine":            d.get("ocr_engine"),
        "confidence":            d.get("confidence"),
    }


# ─── Helper: map OCR confidence → status ─────────────────────────────────────

def _confidence_to_status(confidence: float) -> str:
    if confidence >= 0.85:
        return "safe"
    return "warning" if confidence >= 0.65 else "danger"