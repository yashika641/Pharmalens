import os
from supabase import create_client, Client
from typing import Optional
from dotenv import load_dotenv

load_dotenv("C:\\Users\\palya\\Desktop\\pharmalens\\Pharmalens\\backend\\.env")


_supabase: Optional[Client] = None


def get_supabase() -> Client:
    """
    Lazy-load and cache Supabase client.
    Initializes only on first call.
    """
    global _supabase

    if _supabase is None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        print(f"Supabase URL: {supabase_url}")
        print(f"Supabase Key: {supabase_key}")
        if not supabase_url or not supabase_key:
            raise RuntimeError(
                "SUPABASE_URL or SUPABASE_SERVICE_KEY is not set"
            )

        _supabase = create_client(supabase_url, supabase_key)

    return _supabase
