from fastapi import APIRouter, Response, status

router = APIRouter(prefix="/api/auth", tags=["Auth"])


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
