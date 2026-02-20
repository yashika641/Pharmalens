from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel
import supabase
from backend.utils.supabase import get_supabase

class LoginRequest(BaseModel):
    email: str
    password: str

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/login")
def login(data: LoginRequest):
    """
    Login using Supabase Auth
    Returns access_token for API testing
    """

    try:
        supabase = get_supabase()
        response = supabase.auth.sign_in_with_password(
            {
                "email": data.email,
                "password": data.password,
            }
        )

        if not response.session:
            raise HTTPException(
                status_code=401,
                detail="Invalid credentials",
            )

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": response.user,
            "token_type": "bearer",
        }

    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )
        
@router.post("/logout")
def logout(response: Response):
    """
    Logs out the user by clearing JWT cookie
    """

    response.delete_cookie(
        key="token",
        httponly=True,
        secure=False,          # True in production (HTTPS)
        samesite="strict",
    )

    return {
        "success": True,
        "message": "Logged out successfully"
    }
