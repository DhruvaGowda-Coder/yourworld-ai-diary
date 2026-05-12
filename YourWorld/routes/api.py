import base64
import os
import secrets
import requests
import boto3
import bleach
from botocore.exceptions import BotoCoreError, ClientError
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request, session, current_app
from html import unescape
from werkzeug.utils import secure_filename

import firebase_db
from extensions import csrf, limiter
from config import (
    ALLOWED_IMAGE_EXT, ALLOWED_AUDIO_EXT, ALLOWED_FILE_EXT, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_DEV_URL,
    GROQ_API_KEY, GROQ_CHAT_MODEL, THEME_CHAT_PROFILES,
    HUGGINGFACE_API_KEY, HUGGINGFACE_IMAGE_MODEL, SITE_URL, SHARE_CODE_RE
)
from utils import auth_required, ensure_session, get_user_theme, normalize_theme, strip_html, normalize_share_code
from firebase_db import save_chat_history, get_chat_history

api_bp = Blueprint('api', __name__)

MAX_UPLOAD_BYTES = {
    "image": 5 * 1024 * 1024,
    "audio": 20 * 1024 * 1024,
    "file": 10 * 1024 * 1024,
}
ALLOWED_MIME_TYPES = {
    "image": {"image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"},
    "audio": {"audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4", "audio/m4a", "audio/flac", "audio/x-flac"},
    "file": {
        "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        "text/plain", "text/markdown", "text/x-markdown", "application/zip", "application/x-zip-compressed",
        "application/x-7z-compressed", "application/vnd.rar", "application/x-rar-compressed",
        "application/javascript", "text/javascript", "text/x-python", "application/x-python",
        "text/html", "text/css", "application/json", "application/sql", "text/x-sql",
        "text/x-java-source", "text/x-c++src", "text/x-c++hdr", "image/svg+xml",
        "application/epub+zip", "text/yaml", "application/x-yaml", "application/xml", "text/xml",
        "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    },
}

# ── Cached R2 client singleton ──
_r2_client = None

def get_r2_client():
    """Return a cached boto3 S3 client for Cloudflare R2."""
    global _r2_client
    if not all([R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME]):
        raise RuntimeError("R2 storage is not fully configured")
    if _r2_client is None:
        _r2_client = boto3.client(
            's3',
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name='auto'
        )
    return _r2_client

def _safe_int(value, minimum, maximum):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return max(minimum, min(parsed, maximum))

def _stream_size(file):
    try:
        pos = file.stream.tell()
        file.stream.seek(0, os.SEEK_END)
        size = file.stream.tell()
        file.stream.seek(pos)
        return size
    except (OSError, AttributeError):
        return request.content_length or 0

def _file_signature_matches(file_type, header):
    if file_type == "image":
        return (
            header.startswith(b"\x89PNG\r\n\x1a\n")
            or header.startswith(b"\xff\xd8\xff")
            or header.startswith(b"GIF87a")
            or header.startswith(b"GIF89a")
            or (header.startswith(b"RIFF") and header[8:12] == b"WEBP")
        )
    if file_type == "file":
        return True # Skip signature check for generic files
    return (
        header.startswith(b"ID3")
        or header[:2] in {b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"}
        or (header.startswith(b"RIFF") and header[8:12] == b"WAVE")
        or header.startswith(b"OggS")
        or header.startswith(b"fLaC")
        or header[4:8] == b"ftyp"
    )

def _validate_upload(file_type, file):
    filename = secure_filename(file.filename or "")
    if not filename:
        return None, None, "No selected file"
    ext = os.path.splitext(filename)[1].lower()
    allowed_ext = ALLOWED_IMAGE_EXT if file_type == "image" else (ALLOWED_AUDIO_EXT if file_type == "audio" else ALLOWED_FILE_EXT)
    if ext not in allowed_ext:
        return None, None, f"File type {ext} not allowed"
    size = _stream_size(file)
    if size <= 0:
        return None, None, "Empty file"
    if size > MAX_UPLOAD_BYTES[file_type]:
        return None, None, f"File exceeds {MAX_UPLOAD_BYTES[file_type] // (1024 * 1024)}MB limit"
    content_type = (file.mimetype or file.content_type or "").split(";")[0].lower()
    if content_type not in ALLOWED_MIME_TYPES[file_type]:
        return None, None, "File content type is not allowed"
    header = file.stream.read(16)
    file.stream.seek(0)
    if not _file_signature_matches(file_type, header):
        return None, None, "File content does not match the selected type"
    return filename, content_type, None

@api_bp.route("/api/upload/<file_type>", methods=["POST"])
@auth_required
@limiter.limit("20 per hour")
def api_upload(file_type):
    if file_type not in ("image", "audio", "file"):
        return jsonify({"error": "Invalid file type"}), 400
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    if file:
        filename, content_type, validation_error = _validate_upload(file_type, file)
        if validation_error:
            return jsonify({"error": validation_error}), 400
        unique_name = f"{secrets.token_hex(8)}_{filename}"
        try:
            if all([R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY]):
                s3_client = get_r2_client()
                object_name = f"{file_type}/{unique_name}"
                s3_client.upload_fileobj(file, R2_BUCKET_NAME, object_name, ExtraArgs={'ContentType': content_type})
                file_url = f"{R2_PUBLIC_DEV_URL}/{object_name}" if R2_PUBLIC_DEV_URL else f"https://{R2_BUCKET_NAME}.{R2_ACCOUNT_ID}.r2.cloudflarestorage.com/{object_name}"
                return jsonify({"url": file_url, "name": filename})
            
            upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', file_type)
            os.makedirs(upload_dir, exist_ok=True)
            file.save(os.path.join(upload_dir, unique_name))
            return jsonify({"url": f"/static/uploads/{file_type}/{unique_name}", "name": filename})
        except (BotoCoreError, ClientError, OSError, RuntimeError) as e:
            current_app.logger.exception("Upload failed for %s: %s", file_type, e)
            return jsonify({"error": "Failed to save file"}), 502
    return jsonify({"error": "File upload failed"}), 400

@api_bp.route("/api/settings/audio", methods=["POST"])
@ensure_session
def api_settings_audio():
    data = request.get_json()
    if not data or "theme" not in data or "url" not in data:
        return jsonify({"error": "Bad request"}), 400
    theme = normalize_theme(data.get("theme"))
    firebase_db.set_user_custom_audio(session["user_id"], theme, str(data["url"])[:2048], data.get("name"))
    return jsonify({"success": True})

@api_bp.route("/api/settings/audio/delete", methods=["POST"])
@ensure_session
def api_settings_audio_delete():
    data = request.get_json()
    if not data or "theme" not in data or "url" not in data:
        return jsonify({"error": "Bad request"}), 400
    theme = normalize_theme(data.get("theme"))
    firebase_db.remove_custom_song(session["user_id"], theme, str(data["url"])[:2048])
    return jsonify({"success": True})

@api_bp.route("/api/entries")
@ensure_session
def api_entries():
    entry_type = request.args.get("type", "diary")
    limit = _safe_int(request.args.get("limit", 20), 1, 100)
    if limit is None:
        return jsonify({"error": "Invalid limit"}), 400
    last_doc_id = request.args.get("after")
    rows, has_more = firebase_db.get_entries(session["user_id"], entry_type, limit=limit, last_doc_id=last_doc_id or None)
    return jsonify({
        "entries": [{"id": r["id"], "title": r.get("title", "Untitled"), "updated_at": r.get("updated_at"), "created_at": r.get("created_at"), "share_code": r.get("share_code")} for r in rows],
        "has_more": has_more
    })

@api_bp.route("/api/entry/<entry_id>")
@ensure_session
def api_entry(entry_id):
    row = firebase_db.get_entry(session["user_id"], entry_id)
    if not row: return jsonify({"error": "Not found"}), 404
    share_code = row.get("share_code")
    share_type = row.get("share_type")
    can_edit = row.get("can_edit")

    if row.get("type") == "story" and not share_code:
        all_stories = firebase_db.get_story_entries_for_user(session["user_id"])
        for s in all_stories:
            if s.get("share_code"):
                share_code = s.get("share_code")
                share_type = s.get("share_type")
                can_edit = s.get("can_edit")
                break

    return jsonify({
        "id": row["id"], 
        "title": unescape(row.get("title", "")), 
        "content": unescape(row.get("content", "")),
        "type": row.get("type", "diary"), 
        "image_url": row.get("image_url"), 
        "image_attached": row.get("image_attached"),
        "image_style": row.get("image_style"),
        "image_prompt": row.get("image_prompt"),
        "images": row.get("images", []),
        "title_style": row.get("title_style"),
        "content_style": row.get("content_style"),
        "share_code": share_code, 
        "share_type": share_type, 
        "can_edit": can_edit,
        "created_at": row.get("created_at"), 
        "updated_at": row.get("updated_at"),
    })

@api_bp.route("/api/entry/<entry_id>", methods=["DELETE"])
@ensure_session
def api_entry_delete(entry_id):
    share_code = request.args.get("share_code")
    if firebase_db.delete_entry(session["user_id"], entry_id, share_code=share_code):
        return jsonify({"deleted": True})
    return jsonify({"error": "Not found or unauthorized"}), 404

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
        
    if entry.get("type") == "story":
        all_stories = firebase_db.get_story_entries_for_user(session["user_id"])
        deleted = False
        for s in all_stories:
            if s.get("share_code"):
                if firebase_db.update_share_code(session["user_id"], s["id"], None, None, False):
                    deleted = True
        return jsonify({"deleted": True}) if deleted else jsonify({"error": "No active share code found"}), 404
    else:
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
        allowed_tags = ['b', 'i', 'u', 'div', 'br', 'span', 'strike', 'strong', 'em', 'p', 'ul', 'ol', 'li', 'img']
        allowed_attrs = {
            '*': ['class', 'style'],
            'img': ['src', 'alt', 'width', 'height', 'style']
        }
        try:
            from bleach.css_sanitizer import CSSSanitizer
            css_sanitizer = CSSSanitizer(allowed_css_properties=['color', 'background-color', 'text-align', 'font-size', 'font-family', 'width', 'height', 'margin', 'padding', 'border-radius', 'transform'])
            content = bleach.clean(content, tags=allowed_tags, attributes=allowed_attrs, css_sanitizer=css_sanitizer)
        except ImportError:
            content = bleach.clean(content, tags=allowed_tags, attributes=allowed_attrs)

        title = (data.get("title") or "").strip()
        if not title:
            plain = strip_html(content)
            first_line = plain.strip().splitlines()[0] if plain.strip() else "Untitled"
            title = (first_line[:40] + "...") if len(first_line) > 40 else first_line
        
        data['title'] = title[:150]
        data['content'] = content
        
        if len(content.encode("utf-8")) > 100_000:
            return jsonify({"error": "Content exceeds 100KB limit"}), 400

        # Support for multiple images
        images = data.get("images")
        if isinstance(images, list):
            data['images'] = images[:10] # Limit to 10 images per page
        
        share_code = data.get("share_code")
        saved = firebase_db.save_entry(session["user_id"], entry_id, data, share_code=share_code)
        if not saved: return jsonify({"error": "Not found or unauthorized"}), 404
        
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
    attachment = data.get("attachment")
    history = data.get("history") or []
    session_id = data.get("session_id")
    context_data = data.get("context") or {}
    user_id = session.get("user_id")
    
    # Sync-only support for when we just want to save the history
    if not message and not attachment and data.get("sync_only"):
        if user_id and not str(user_id).startswith("guest_"):
            new_id = firebase_db.save_chat_session(user_id, session_id, history)
            return jsonify({"success": True, "session_id": new_id})
        return jsonify({"success": True})

    if not message and not attachment: return jsonify({"error": "Message required"}), 400

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

    theme_profile = THEME_CHAT_PROFILES.get(active_theme, THEME_CHAT_PROFILES["campfire"])
    system_prompt = f"You are Aura, a professional AI assistant. CRITICAL: Always use double newlines (\\n\\n) between every point, paragraph, and section. Use Markdown lists and bold text. For code, always use triple-backtick code blocks. Never group points into a single dense block of text. {theme_profile}"
    
    messages = [{"role": "system", "content": system_prompt}]
    if related_pages:
        messages.append({"role": "system", "content": "Recent pages:\n" + "\n".join(related_pages)})
    
    # Append limited history, merging attachment info into text for AI context
    for h in history[-50:]:
        if h.get("role") in {"user", "assistant"}:
            content = h.get("content") or ""
            att = h.get("attachment")
            if att:
                content += f"\n\n[USER ATTACHED A FILE: {att.get('name')} - URL: {att.get('url')}]"
            messages.append({"role": h.get("role"), "content": content})

    user_content = message
    if attachment:
        user_content += f"\n\n[USER ATTACHED A FILE: {attachment.get('name')} - URL: {attachment.get('url')}]"
    
    messages.append({"role": "user", "content": user_content})

    if not GROQ_API_KEY: return jsonify({"reply": "AI unavailable.", "fallback": True})
    
    try:
        # Lower temperature to 0.4 for better instruction following (less rambling)
        r = requests.post("https://api.groq.com/openai/v1/chat/completions", json={"model": GROQ_CHAT_MODEL, "messages": messages, "temperature": 0.4}, headers={"Authorization": f"Bearer {GROQ_API_KEY}"}, timeout=15)
        r.raise_for_status()
        reply = r.json()["choices"][0]["message"]["content"]
        
        # Backend Safety Filter: If AI gives a list without newlines, force them in.
        if " * " in reply and "\n" not in reply:
            reply = reply.replace(" * ", "\n\n* ")
        if " 1. " in reply and "\n" not in reply:
            reply = reply.replace(" 1. ", "\n\n1. ")
            
        # Update Cloud History for cross-device sync
        if user_id and not str(user_id).startswith("guest_"):
            new_history = history + [{"role": "user", "content": message, "attachment": attachment}, {"role": "assistant", "content": reply}]
            new_id = firebase_db.save_chat_session(user_id, session_id, new_history[-50:])
            return jsonify({"reply": reply, "session_id": new_id})
            
        return jsonify({"reply": reply})
    except (requests.RequestException, KeyError, IndexError, ValueError) as e:
        current_app.logger.exception("Chat request failed: %s", e)
        return jsonify({"error": "Failed to reach AI"}), 502

@api_bp.route("/api/chat/sync", methods=["GET"])
@auth_required
def api_chat_sync():
    user_id = session.get("user_id")
    history = get_chat_history(user_id)
    return jsonify({"history": history})

@api_bp.route("/api/chat/sessions", methods=["GET"])
@auth_required
def api_chat_sessions():
    user_id = session.get("user_id")
    sessions = firebase_db.get_chat_sessions(user_id)
    return jsonify({"sessions": sessions})

@api_bp.route("/api/chat/session/<session_id>", methods=["GET"])
@auth_required
def api_chat_session(session_id):
    user_id = session.get("user_id")
    messages = firebase_db.get_chat_session(user_id, session_id)
    if messages is None: return jsonify({"error": "Not found"}), 404
    return jsonify({"messages": messages})

@api_bp.route("/api/chat/session/<session_id>", methods=["DELETE"])
@auth_required
def api_chat_session_delete(session_id):
    user_id = session.get("user_id")
    if firebase_db.delete_chat_session(user_id, session_id):
        return jsonify({"success": True})
    return jsonify({"error": "Failed"}), 404

@api_bp.route("/api/chat/clear", methods=["POST"])
@auth_required
def api_chat_clear():
    user_id = session.get("user_id")
    # This now just clears the legacy history field
    save_chat_history(user_id, [])
    return jsonify({"success": True})

@api_bp.route("/api/activity")
@ensure_session
def api_activity():
    days = _safe_int(request.args.get("days", 365), 7, 730)
    if days is None:
        return jsonify({"error": "Invalid days"}), 400
    try:
        counts, total_pages = firebase_db.get_activity_counts(session["user_id"], days)
        
        streak = 0
        today = datetime.now(timezone.utc).date()
        check_day = today if today.isoformat() in counts else (today - timedelta(days=1))
        while check_day.isoformat() in counts:
            streak += 1
            check_day -= timedelta(days=1)
            
        return jsonify({"days": days, "counts": counts, "total_pages": total_pages, "streak": streak, "active_days": len(counts)})
    except Exception as e:
        current_app.logger.warning("get_activity_counts failed: %s", e)
        return jsonify({"error": "Activity fetch failed"}), 500

@api_bp.route("/api/story/image", methods=["POST"])
@auth_required
@limiter.limit("5 per minute")
def api_story_image():
    data = request.get_json(force=True)
    prompt = (data.get("prompt") or "").strip()[:500] or "A quiet story moment"
    
    if not HUGGINGFACE_API_KEY: return jsonify({"error": "missing_key"}), 500
    
    try:
        r = requests.post(f"https://router.huggingface.co/hf-inference/models/{HUGGINGFACE_IMAGE_MODEL}", json={"inputs": prompt}, headers={"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}, timeout=25)
        if not r.ok:
            current_app.logger.warning("Image generation failed with status %s: %s", r.status_code, r.text[:300])
            return jsonify({"error": "Image generation failed"}), 502
        content_type = (r.headers.get("Content-Type") or "").split(";")[0].lower()
        if not content_type.startswith("image/"):
            current_app.logger.warning("Image generation returned non-image content type: %s", content_type)
            return jsonify({"error": "Image provider returned an invalid response"}), 502
        image_bytes = r.content
        if not image_bytes or len(image_bytes) > 8 * 1024 * 1024:
            return jsonify({"error": "Image response size is invalid"}), 502
        
        # R2 Upload Logic (Fixed: No more Base64 bloat)
        if all([R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY]):
            s3 = get_r2_client()
            obj_name = f"images/ai_{secrets.token_hex(8)}.jpg"
            s3.put_object(Bucket=R2_BUCKET_NAME, Key=obj_name, Body=image_bytes, ContentType=content_type)
            url = f"{R2_PUBLIC_DEV_URL}/{obj_name}" if R2_PUBLIC_DEV_URL else obj_name
            return jsonify({"image_url": url, "ai": True})
            
        return jsonify({"image_url": f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode()}", "ai": True})
    except (requests.RequestException, BotoCoreError, ClientError, RuntimeError) as e:
        current_app.logger.exception("Image generation failed: %s", e)
        return jsonify({"error": "Image generation failed"}), 502

@api_bp.route("/api/system/cleanup", methods=["POST"])
@csrf.exempt
def api_system_cleanup():
    cron_secret = os.environ.get("CRON_SECRET")
    if not cron_secret or request.headers.get("Authorization") != f"Bearer {cron_secret}":
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"success": True, "deleted": firebase_db.cleanup_guest_data()})
