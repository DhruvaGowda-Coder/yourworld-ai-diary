import secrets
import re
from functools import wraps
from html import unescape
from flask import session, jsonify, g
import firebase_db
from config import THEME_OPTIONS, THEME_DETAILS, GUEST_EMAIL_PREFIX, GUEST_EMAIL_DOMAIN, SHARE_CODE_RE

def normalize_theme(theme: str | None) -> str:
    value = (theme or "").strip().lower()
    if value in THEME_OPTIONS:
        return value
    return "campfire"

def get_user_theme(user_id: str | None) -> str:
    sess_theme = session.get("theme")
    if sess_theme:
        return normalize_theme(sess_theme)
    if not user_id:
        return "campfire"
    try:
        return normalize_theme(firebase_db.get_user_theme(user_id))
    except Exception:
        return "campfire"

def get_current_user():
    user_id = session.get("user_id")
    if not user_id or session.get("is_guest"):
        return None
    return firebase_db.get_current_user_data(user_id)

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            session["user_id"] = "guest_" + secrets.token_hex(12)
            session["is_guest"] = True
        return fn(*args, **kwargs)
    return wrapper

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id") or session.get("is_guest"):
            return jsonify({
                "error": "login_required",
                "message": "Please sign in to use AI features."
            }), 401
        return fn(*args, **kwargs)
    return wrapper

def strip_html(text: str) -> str:
    if not text:
        return ""
    cleaned = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    cleaned = re.sub(r"</p>|</div>|</li>", "\n", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"<[^>]+>", "", cleaned)
    cleaned = unescape(cleaned)
    return cleaned

def normalize_share_code(raw_code: str | None) -> str | None:
    if not raw_code:
        return None
    code = re.sub(r"\s+", "-", raw_code.strip()).upper()
    if not SHARE_CODE_RE.fullmatch(code):
        return None
    return code
