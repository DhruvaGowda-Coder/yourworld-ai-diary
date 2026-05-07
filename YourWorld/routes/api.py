import base64
import os
import secrets
import requests
import boto3
import bleach
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request, session, current_app
from html import unescape
from werkzeug.utils import secure_filename

import firebase_db
from extensions import limiter
from config import (
    ALLOWED_IMAGE_EXT, ALLOWED_AUDIO_EXT, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_DEV_URL,
    GROQ_API_KEY, GROQ_CHAT_MODEL, THEME_CHAT_PROFILES,
    HUGGINGFACE_API_KEY, HUGGINGFACE_IMAGE_MODEL, SITE_URL, SHARE_CODE_RE
)
from utils import auth_required, ensure_session, get_user_theme, strip_html, normalize_share_code

api_bp = Blueprint('api', __name__)

# ── Cached R2 client singleton ──
_r2_client = None

def get_r2_client():
    """Return a cached boto3 S3 client for Cloudflare R2."""
    global _r2_client
    if _r2_client is None:
        _r2_client = boto3.client(
            's3',
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name='auto'
        )
    return _r2_client

@api_bp.route("/api/upload/<file_type>", methods=["POST"])
@ensure_session
def api_upload(file_type):
    if file_type not in ("image", "audio"):
        return jsonify({"error": "Invalid file type"}), 400
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if file:
        filename = secure_filename(file.filename)
        ext = os.path.splitext(filename)[1].lower()
        allowed = ALLOWED_IMAGE_EXT if file_type == "image" else ALLOWED_AUDIO_EXT
        if ext not in allowed:
            return jsonify({"error": f"File type {ext} not allowed"}), 400
        unique_name = f"{secrets.token_hex(8)}_{filename}"
        try:
            if R2_ACCOUNT_ID and R2_BUCKET_NAME and R2_ACCESS_KEY_ID:
                s3_client = get_r2_client()
                content_type = file.content_type or 'application/octet-stream'
                object_name = f"{file_type}/{unique_name}"
                s3_client.upload_fileobj(file, R2_BUCKET_NAME, object_name, ExtraArgs={'ContentType': content_type})
                file_url = f"{R2_PUBLIC_DEV_URL}/{object_name}" if R2_PUBLIC_DEV_URL else f"https://{R2_BUCKET_NAME}.{R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{object_name}"
                return jsonify({"url": file_url, "name": filename})
            
            upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', file_type)
            os.makedirs(upload_dir, exist_ok=True)
            file.save(os.path.join(upload_dir, unique_name))
            return jsonify({"url": f"/static/uploads/{file_type}/{unique_name}", "name": filename})
        except Exception as e:
            return jsonify({"error": f"Failed to save file: {str(e)}"}), 502
    return jsonify({"error": "File upload failed"}), 400

@api_bp.route("/api/settings/audio", methods=["POST"])
@ensure_session
def api_settings_audio():
    data = request.get_json()
    if not data or "theme" not in data or "url" not in data:
        return jsonify({"error": "Bad request"}), 400
    firebase_db.set_user_custom_audio(session["user_id"], data["theme"], data["url"], data.get("name"))
    return jsonify({"success": True})

@api_bp.route("/api/settings/audio/delete", methods=["POST"])
@ensure_session
def api_settings_audio_delete():
    data = request.get_json()
    if not data or "theme" not in data or "url" not in data:
        return jsonify({"error": "Bad request"}), 400
    firebase_db.remove_custom_song(session["user_id"], data["theme"], data["url"])
    return jsonify({"success": True})

@api_bp.route("/api/entries")
@ensure_session
def api_entries():
    entry_type = request.args.get("type", "diary")
    limit = min(int(request.args.get("limit", 20)), 100)
    last_doc_id = request.args.get("after")
    rows, has_more = firebase_db.get_entries(session["user_id"], entry_type, limit=limit, last_doc_id=last_doc_id or None)
    return jsonify({
        "entries": [{"id": r["id"], "title": r.get("title", "Untitled"), "updated_at": r.get("updated_at"), "created_at": r.get("created_at")} for r in rows],
        "has_more": has_more
    })

@api_bp.route("/api/entry/<entry_id>")
@ensure_session
def api_entry(entry_id):
    row = firebase_db.get_entry(session["user_id"], entry_id)
    if not row: return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id": row["id"], 
        "title": unescape(row.get("title", "")), 
        "content": unescape(row.get("content", "")),
        "type": row.get("type", "diary"), 
        "image_url": row.get("image_url"), 
        "image_attached": row.get("image_attached"),
        "image_style": row.get("image_style"),
        "image_prompt": row.get("image_prompt"),
        "title_style": row.get("title_style"),
        "content_style": row.get("content_style"),
        "share_code": row.get("share_code"), 
        "share_type": row.get("share_type"), 
        "can_edit": row.get("can_edit"),
        "created_at": row.get("created_at"), 
        "updated_at": row.get("updated_at"),
    })

@api_bp.route("/api/entry/<entry_id>", methods=["DELETE"])
@ensure_session
def api_entry_delete(entry_id):
    if firebase_db.delete_entry(session["user_id"], entry_id):
        return jsonify({"deleted": True})
    return jsonify({"error": "Not found"}), 404

@api_bp.route("/api/entry/<entry_id>/share", methods=["POST"])
@ensure_session
def api_entry_share(entry_id):
    data = request.get_json(force=True)
    mode = data.get("mode")
    custom_code = data.get("custom_code")
    can_edit = bool(data.get("can_edit", False))
    rotate = bool(data.get("rotate", False))
    
    entry = firebase_db.get_entry(session["user_id"], entry_id)
    if not entry:
        return jsonify({"error": "Not found"}), 404
    if entry.get("type") != "story":
        return jsonify({"error": "Only stories can be shared"}), 400

    if mode == "off":
        firebase_db.update_share_code(session["user_id"], entry_id, None, None, False)
        return jsonify({"share_code": None, "url": None})

    share_type = mode if mode in ["story", "single"] else "story"
    
    code = None
    is_new_code = False
    if custom_code:
        code = normalize_share_code(custom_code)
        if not code:
            return jsonify({"error": "code_unavailable", "message": "Invalid custom code format. Use 4-32 letters, numbers, or hyphens."}), 400
        existing = firebase_db.get_entry_by_share_code(code)
        if existing and str(existing.get("id")) != str(entry_id):
            return jsonify({"error": "code_unavailable", "message": "This code already exists. Please choose another code."}), 400
        is_new_code = (code != entry.get("share_code"))
    else:
        if rotate or not entry.get("share_code"):
            for _attempt in range(10):
                code = secrets.token_urlsafe(8).replace("_", "-").replace("~", "")[:8]
                if not firebase_db.get_entry_by_share_code(code):
                    break
            else:
                return jsonify({"error": "Could not generate unique code, try again"}), 503
            is_new_code = True
        else:
            code = entry.get("share_code")
            
    # Enforce "one active code per user" — always clear codes from OTHER entries
    # This only skips when the exact same code is being kept on the same entry
    # (e.g., just toggling can_edit or changing share_type)
    all_stories = firebase_db.get_story_entries_for_user(session["user_id"])
    for s in all_stories:
        if s.get("share_code") and str(s.get("id")) != str(entry_id):
            firebase_db.update_share_code(session["user_id"], s["id"], None, None, False)

    firebase_db.update_share_code(session["user_id"], entry_id, code, share_type, can_edit)
    url = f"{SITE_URL}/view/{code}"
    return jsonify({"share_code": code, "url": url, "can_edit": can_edit, "share_type": share_type})

@api_bp.route("/api/entry/<entry_id>/share", methods=["DELETE"])
@ensure_session
def api_entry_share_delete(entry_id):
    entry = firebase_db.get_entry(session["user_id"], entry_id)
    if not entry:
        return jsonify({"error": "Not found"}), 404
    if firebase_db.update_share_code(session["user_id"], entry_id, None, None, False):
        return jsonify({"deleted": True})
    return jsonify({"error": "Update failed"}), 500

@api_bp.route("/api/entry/save", methods=["POST"])
@ensure_session
@limiter.limit("30 per minute")
def api_entry_save():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Empty request body"}), 400
            
        entry_id = data.get("id")
        if entry_id in ("", "null", "undefined"): entry_id = None
        
        current_app.logger.info("Saving entry %s for user %s", entry_id, session.get("user_id"))
        
        content = data.get("content", "").strip()
        allowed_tags = ['b', 'i', 'u', 'div', 'br', 'span', 'strike', 'strong', 'em', 'p', 'ul', 'ol', 'li']
        try:
            from bleach.css_sanitizer import CSSSanitizer
            css_sanitizer = CSSSanitizer(allowed_css_properties=['color', 'background-color', 'text-align', 'font-size', 'font-family'])
            content = bleach.clean(content, tags=allowed_tags, attributes={'*': ['class']}, css_sanitizer=css_sanitizer)
        except ImportError:
            content = bleach.clean(content, tags=allowed_tags, attributes={'*': ['class']})

        title = (data.get("title") or "").strip()
        if not title:
            plain = strip_html(content)
            first_line = plain.strip().splitlines()[0] if plain.strip() else "Untitled"
            title = (first_line[:40] + "...") if len(first_line) > 40 else first_line
        
        data['title'] = title[:150]
        data['content'] = content
        
        if len(content.encode("utf-8")) > 100_000:
            return jsonify({"error": "Content exceeds 100KB limit"}), 400
        
        saved = firebase_db.save_entry(session["user_id"], entry_id, data)
        if not saved: return jsonify({"error": "Not found"}), 404
        
        try:
            firebase_db.increment_activity(session["user_id"], datetime.now(timezone.utc).date().isoformat())
        except Exception as e:
            current_app.logger.warning("Activity increment failed: %s", e)
            
        return jsonify({"id": saved["id"], "title": saved["title"], "updated_at": saved["updated_at"]})
    except Exception as e:
        current_app.logger.exception("api_entry_save failed: %s", e)
        return jsonify({"error": "Internal server error"}), 500

@api_bp.route("/api/chat", methods=["POST"])
@auth_required
@limiter.limit("10 per minute")
def api_chat():
    data = request.get_json(force=True)
    message = (data.get("message") or "").strip()
    history = data.get("history") or []
    context_data = data.get("context") or {}
    if not message: return jsonify({"error": "Message required"}), 400

    user_id = session.get("user_id")
    active_theme = get_user_theme(user_id)
    
    # Context Optimization (Pagination fix)
    related_pages = []
    entry_type = (context_data.get("entry_type") or "").strip().lower()
    if user_id and entry_type in {"diary", "story"}:
        rows, _ = firebase_db.get_entries(user_id, entry_type, limit=5)
        for r in rows:
            if str(context_data.get("entry_id")) == r.get("id"): continue
            snippet = strip_html(r.get("content") or "").replace("\n", " ")[:170]
            related_pages.append(f"- {r.get('title', 'Untitled')}: {snippet}")

    theme_profiles = {
        "campfire": "Voice: warm, reflective, and extremely concise. Encourage the user briefly.",
        "water": "Voice: calm, patient, and brief. Use minimal, high-impact wording.",
        "wind": "Voice: quick, curious, and very short. Use bullet points primarily.",
        "earth": "Voice: grounded, practical, and direct. Provide clear, short steps.",
        "ice": "Voice: sharp, clear, and precise. Avoid any unnecessary words.",
        "storm": "Voice: bold, energetic, and rapid. Use short, punchy sentences.",
        "space": "Voice: expansive yet concise. Connect ideas with minimal chatter.",
        "garden": "Voice: nurturing and brief. Focus on the very next step only.",
        "cherry": "Voice: gentle, appreciative, and short. Capture the essence quickly.",
    }
    theme_profile = theme_profiles.get(active_theme, theme_profiles["campfire"])
    system_prompt = f"You are Aura, a professional AI assistant. CRITICAL: Always use double newlines (\\n\\n) between every point, paragraph, and section. Use Markdown lists and bold text. For code, always use triple-backtick code blocks. Never group points into a single dense block of text. {theme_profile}"
    
    messages = [{"role": "system", "content": system_prompt}]
    if related_pages:
        messages.append({"role": "system", "content": "Recent pages:\n" + "\n".join(related_pages)})
    messages.extend([{"role": h.get("role"), "content": h.get("content")} for h in history[-10:] if h.get("role") in {"user", "assistant"}])
    messages.append({"role": "user", "content": message})

    if not GROQ_API_KEY: return jsonify({"reply": "AI unavailable.", "fallback": True})
    
    try:
        r = requests.post("https://api.groq.com/openai/v1/chat/completions", json={"model": GROQ_CHAT_MODEL, "messages": messages, "temperature": 0.7}, headers={"Authorization": f"Bearer {GROQ_API_KEY}"}, timeout=15)
        reply = r.json()["choices"][0]["message"]["content"]
        return jsonify({"reply": reply.strip(), "theme": active_theme})
    except Exception:
        return jsonify({"reply": "I am here with you. Tell me more.", "fallback": True, "theme": active_theme})

@api_bp.route("/api/activity")
@ensure_session
def api_activity():
    days = max(7, min(int(request.args.get("days", 365)), 730))
    try:
        counts = firebase_db.get_activity_counts(session["user_id"], days)
    except Exception as e:
        current_app.logger.warning("get_activity_counts failed: %s", e)
        counts = {}
    try:
        total_pages = firebase_db.get_entry_count(session["user_id"])
    except Exception as e:
        current_app.logger.warning("get_entry_count failed: %s", e)
        total_pages = 0
    
    streak = 0
    today = datetime.now(timezone.utc).date()
    check_day = today if today.isoformat() in counts else (today - timedelta(days=1))
    while check_day.isoformat() in counts:
        streak += 1
        check_day -= timedelta(days=1)
        
    return jsonify({"days": days, "counts": counts, "total_pages": total_pages, "streak": streak, "active_days": len(counts)})

@api_bp.route("/api/story/image", methods=["POST"])
@auth_required
@limiter.limit("5 per minute")
def api_story_image():
    data = request.get_json(force=True)
    prompt = (data.get("prompt") or "").strip()[:500] or "A quiet story moment"
    
    if not HUGGINGFACE_API_KEY: return jsonify({"error": "missing_key"}), 500
    
    try:
        r = requests.post(f"https://router.huggingface.co/hf-inference/models/{HUGGINGFACE_IMAGE_MODEL}", json={"inputs": prompt}, headers={"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}, timeout=25)
        image_bytes = r.content
        
        # R2 Upload Logic (Fixed: No more Base64 bloat)
        if R2_ACCOUNT_ID and R2_BUCKET_NAME:
            s3 = get_r2_client()
            obj_name = f"images/ai_{secrets.token_hex(8)}.jpg"
            s3.put_object(Bucket=R2_BUCKET_NAME, Key=obj_name, Body=image_bytes, ContentType='image/jpeg')
            url = f"{R2_PUBLIC_DEV_URL}/{obj_name}" if R2_PUBLIC_DEV_URL else obj_name
            return jsonify({"image_url": url, "ai": True})
            
        return jsonify({"image_url": f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode()}", "ai": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@api_bp.route("/api/system/cleanup", methods=["POST"])
def api_system_cleanup():
    if request.headers.get("Authorization") != f"Bearer {os.environ.get('CRON_SECRET')}":
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"success": True, "deleted": firebase_db.cleanup_guest_data()})
