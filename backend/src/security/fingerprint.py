import hashlib
import hmac
import time
from typing import Optional

RATE_LIMIT_WINDOW = 86400
RATE_LIMIT_MAX_REPORTS = 10

def generate_fingerprint(user_agent: str, ip: str) -> str:
    raw = f"{user_agent}|{ip}|{int(time.time() / 86400)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def deterministic_fingerprint(user_agent: str, ip: str) -> str:
    raw = f"{user_agent}|{ip}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def is_rate_limited(last_report_at: Optional[float], report_count: int) -> bool:
    if last_report_at is None:
        return False
    elapsed = time.time() - last_report_at
    if elapsed >= RATE_LIMIT_WINDOW:
        return False
    return report_count >= RATE_LIMIT_MAX_REPORTS