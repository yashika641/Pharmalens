"""
API Speed Test — Pharmalens Backend
====================================
Auto-logs in via /auth/login, fetches a real token + user_id, then hits
every endpoint N times and reports min / avg / max / p95 latency.

Results saved to backend/results/api_speed_<timestamp>.csv

Usage:
    python test_api_speed.py

Run from: backend/
"""

import csv
import sys
import time
import statistics
from pathlib import Path
from datetime import datetime

try:
    import httpx
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx"])
    import httpx

# ══════════════════════════════════════════════════════════════════════════════
# CONFIG — only edit these
# ══════════════════════════════════════════════════════════════════════════════
BASE_URL = "http://localhost:8000"
EMAIL    = "palyashika61@gmail.com"   # your Supabase account email
PASSWORD = "Yashi@pal01"        # your Supabase password

REPEATS = 3      # calls per endpoint
DELAY_S = 0.2    # seconds between calls

RESULTS_DIR = Path(__file__).parent / "results"
# ══════════════════════════════════════════════════════════════════════════════

# ── Helpers ────────────────────────────────────────────────────────────────────
def sep(char="─", w=76): print(char * w)
def hdr(t): sep("═"); print(f"  {t}"); sep("═")

CSV_COLS = ["tag", "method", "endpoint", "repeat", "status_code", "latency_ms", "error"]
SUMMARY_COLS = ["tag", "method", "endpoint", "repeats",
                "min_ms", "avg_ms", "max_ms", "p95_ms", "success_rate", "status_codes"]

# ── Auto-login ─────────────────────────────────────────────────────────────────
def login(client: httpx.Client) -> tuple[str, str]:
    """Returns (access_token, user_id). Exits on failure."""
    print("  Logging in …")
    try:
        resp = client.post("/auth/login",
                           json={"email": EMAIL, "password": PASSWORD},
                           timeout=15)
        if resp.status_code != 200:
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text
            print(f"\n  Login failed ({resp.status_code}): {detail}")
            print("  Check EMAIL / PASSWORD in the CONFIG block.")
            sys.exit(1)
        data    = resp.json()
        token   = data["access_token"]
        user_id = data["user"]["id"]
        print(f"  Token   : {token[:24]}…")
        print(f"  User ID : {user_id}\n")
        return token, user_id
    except SystemExit:
        raise
    except Exception as e:
        print(f"\n  Login failed (connection error): {e}")
        print("  Is the FastAPI server running at", BASE_URL, "?")
        sys.exit(1)

# ── Auto-fetch first available record IDs ─────────────────────────────────────
def fetch_record_ids(client: httpx.Client, auth_headers: dict) -> tuple[str, str]:
    """Returns (med_record_id, prx_record_id) — empty string if none found."""
    med_id = prx_id = ""
    try:
        resp = client.get("/user/history", headers=auth_headers, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            for rec in data if isinstance(data, list) else data.get("data", []):
                if not med_id and rec.get("image_type") == "medicine":
                    med_id = str(rec.get("id", ""))
                if not prx_id and rec.get("image_type") == "prescription":
                    prx_id = str(rec.get("id", ""))
    except Exception:
        pass
    print(f"  Med record ID : {med_id or '(none found — detail endpoint skipped)'}")
    print(f"  Prx record ID : {prx_id or '(none found — detail endpoint skipped)'}\n")
    return med_id, prx_id

# ── Build endpoint list after login ───────────────────────────────────────────
def build_endpoints(auth_headers: dict, user_id: str,
                    med_id: str, prx_id: str) -> list:
    h  = auth_headers
    hu = {**auth_headers, "x-user-id": user_id}

    endpoints = [
        # ── Auth ──────────────────────────────────────────────────────────────
        ("Auth", "POST", "/auth/login",
         {"json": {"email": EMAIL, "password": PASSWORD}}),

        ("Auth", "POST", "/auth/logout",
         {"headers": h}),

        # ── Drug Interactions ──────────────────────────────────────────────────
        ("Drug Interactions", "POST", "/drug-interactions/check",
         {"json": {"drugs": ["aspirin", "warfarin"]}}),

        ("Drug Interactions", "POST", "/drug-interactions/check",
         {"json": {"drugs": ["sertraline", "tramadol"]},
          "_label": "/drug-interactions/check (serotonin pair)"}),

        # ── Translation ────────────────────────────────────────────────────────
        ("Translation", "POST", "/translate",
         {"json": {"text": "Take one tablet twice a day after meals.",
                   "target_lang": "hi"}}),

        # ── Chatbot ────────────────────────────────────────────────────────────
        ("Chatbot", "GET", "/chat/history",
         {"headers": h}),

        # ── User History ───────────────────────────────────────────────────────
        ("User History", "GET", "/user/history",
         {"headers": h}),

        # ── User Profile ───────────────────────────────────────────────────────
        ("User Profile", "GET", "/user-profile/details",
         {"headers": h}),

        ("User Profile", "PATCH", "/user-profile/update",
         {"headers": h, "json": {"full_name": "Speed Test User"}}),

        ("User Profile", "POST", "/user-profile/add-allergy",
         {"headers": h, "json": {"allergy": "penicillin"}}),

        ("User Profile", "DELETE", "/user-profile/remove-allergy",
         {"headers": h, "json": {"allergy": "penicillin"}}),

        ("User Profile", "POST", "/user-profile/add-condition",
         {"headers": h, "json": {"condition": "hypertension"}}),

        ("User Profile", "DELETE", "/user-profile/remove-condition",
         {"headers": h, "json": {"condition": "hypertension"}}),

        # ── Scan / Upload ──────────────────────────────────────────────────────
        ("Scan", "POST", "/images/upload",
         {"headers": hu,
          "data":   {"image_type": "medicine"},
          "files":  {"file": ("test.png",
                               b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
                               b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
                               b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
                               b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82",
                               "image/png")}}),
    ]

    # Only add detail endpoints if we found real record IDs
    if med_id:
        endpoints.append(
            ("User History", "GET", f"/user/history/medicine/{med_id}",
             {"headers": h})
        )
    if prx_id:
        endpoints.append(
            ("User History", "GET", f"/user/history/prescription/{prx_id}",
             {"headers": h})
        )

    return endpoints

# ── Single call with timing ────────────────────────────────────────────────────
def call_endpoint(client: httpx.Client, method: str, path: str, kwargs: dict) -> tuple:
    kw = {k: v for k, v in kwargs.items() if not k.startswith("_")}
    t0 = time.perf_counter()
    try:
        resp = client.request(method, path, timeout=60, **kw)
        ms   = round((time.perf_counter() - t0) * 1000, 1)
        return resp.status_code, ms, ""
    except Exception as e:
        ms = round((time.perf_counter() - t0) * 1000, 1)
        return 0, ms, str(e)[:120]

# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    hdr(f"API Speed Test — {BASE_URL}")

    with httpx.Client(base_url=BASE_URL) as client:

        # Step 1: login
        token, user_id   = login(client)
        auth_headers     = {"Authorization": f"Bearer {token}"}

        # Step 2: fetch first available record IDs from history
        med_id, prx_id   = fetch_record_ids(client, auth_headers)

        # Step 3: build endpoint list
        endpoints = build_endpoints(auth_headers, user_id, med_id, prx_id)

        print(f"  Endpoints : {len(endpoints)}")
        print(f"  Repeats   : {REPEATS} per endpoint")
        print(f"  Delay     : {DELAY_S}s between calls\n")

        RESULTS_DIR.mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")

        all_raw = []
        summary = []

        # Step 4: run tests
        for entry in endpoints:
            tag, method, path = entry[0], entry[1], entry[2]
            kwargs = entry[3]
            label  = kwargs.get("_label", path)

            print(f"  {method:<7} {label}")

            latencies, statuses = [], []

            for r in range(1, REPEATS + 1):
                status, ms, err = call_endpoint(client, method, path, kwargs)
                latencies.append(ms)
                statuses.append(status)
                status_str = str(status) if status else "ERR"
                print(f"    [{r}/{REPEATS}]  {status_str}  {ms:.0f} ms"
                      + (f"  ⚠ {err[:60]}" if err else ""))
                all_raw.append({
                    "tag": tag, "method": method, "endpoint": label,
                    "repeat": r, "status_code": status,
                    "latency_ms": ms, "error": err,
                })
                time.sleep(DELAY_S)

            ok       = sum(1 for s in statuses if 200 <= s < 500)
            sorted_l = sorted(latencies)
            p95_idx  = max(0, int(len(sorted_l) * 0.95) - 1)

            summary.append({
                "tag":          tag,
                "method":       method,
                "endpoint":     label,
                "repeats":      REPEATS,
                "min_ms":       round(min(latencies), 1),
                "avg_ms":       round(statistics.mean(latencies), 1),
                "max_ms":       round(max(latencies), 1),
                "p95_ms":       round(sorted_l[p95_idx], 1),
                "success_rate": f"{ok}/{REPEATS}",
                "status_codes": " ".join(str(s) for s in statuses),
            })
            print()

    # ── Console summary ────────────────────────────────────────────────────────
    hdr("SUMMARY")
    print(f"  {'Endpoint':<48} {'Avg ms':>8}  {'Min':>7}  {'Max':>7}  {'p95':>7}  OK")
    sep()
    prev_tag = None
    for r in summary:
        if r["tag"] != prev_tag:
            print(f"\n  ── {r['tag']}")
            prev_tag = r["tag"]
        print(f"  {r['endpoint']:<48} {r['avg_ms']:>8.0f}  {r['min_ms']:>7.0f}"
              f"  {r['max_ms']:>7.0f}  {r['p95_ms']:>7.0f}  {r['success_rate']}")

    sep("═")

    # ── Save CSVs ──────────────────────────────────────────────────────────────
    raw_path = RESULTS_DIR / f"api_speed_raw_{ts}.csv"
    sum_path = RESULTS_DIR / f"api_speed_summary_{ts}.csv"

    with open(raw_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLS)
        w.writeheader(); w.writerows(all_raw)

    with open(sum_path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SUMMARY_COLS)
        w.writeheader(); w.writerows(summary)

    print(f"\n  Raw CSV     → {raw_path}")
    print(f"  Summary CSV → {sum_path}")


if __name__ == "__main__":
    main()
