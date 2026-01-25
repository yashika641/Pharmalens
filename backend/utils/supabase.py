import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_SERVICE_KEY is not set in environment variables"
    )

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
print("✅ Supabase client initialized")
