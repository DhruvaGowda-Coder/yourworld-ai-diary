import os
import json
import threading
import datetime as _dt
import firebase_admin
from firebase_admin import credentials, firestore, storage
from google.cloud.firestore_v1 import Increment
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timezone, timedelta
from functools import lru_cache

# ── Simple in-memory cache for user themes (avoids repeated Firestore reads) ──
_theme_cache = {}  # {user_id: (theme, timestamp)}
_theme_cache_lock = threading.Lock()
_THEME_CACHE_TTL = 300  # 5 minutes

APP_DIR = os.path.dirname(os.path.abspath(__file__))
CRED_PATH = os.path.join(APP_DIR, "firebase-adminsdk.json")
STORAGE_BUCKET = os.environ.get("FIREBASE_STORAGE_BUCKET", "diary-13644.appspot.com")

if not firebase_admin._apps:
    try:
        json_cred = os.environ.get("FIREBASE_ADMIN_CREDENTIALS_JSON")
        if json_cred:
            cred_dict = json.loads(json_cred)
            cred = credentials.Certificate(cred_dict)
        else:
            if os.path.exists(CRED_PATH):
                cred = credentials.Certificate(CRED_PATH)
            else:
                raise Exception("Missing Firebase credentials (env or file)")
        
        firebase_admin.initialize_app(cred, {
            'storageBucket': STORAGE_BUCKET
        })
    except Exception as e:
        print(f"Error initializing Firebase Admin: {e}")

def get_db():
    return firestore.client()

def get_bucket():
    return storage.bucket()

def upload_to_storage(file_stream, destination_path, content_type):
    """Upload a file to Firebase Storage and make it public permanently."""
    bucket = get_bucket()
    blob = bucket.blob(destination_path)
    blob.upload_from_file(file_stream, content_type=content_type)

    try:
        blob.make_public()
        return blob.public_url
    except Exception as e:
        # If bucket-level ACLs prevent make_public, fallback to the standard unauthenticated download URL
        # Note: This requires the Firebase Storage rules to allow public reads to the uploads/ directory
        bucket_name = bucket.name
        encoded_path = destination_path.replace("/", "%2F")
        return f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}/o/{encoded_path}?alt=media"

# get_db is defined above at line 30

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()

def get_user_theme(user_id):
    if not user_id: return "campfire"
    uid = str(user_id)
    if uid.startswith("guest_"): return "campfire"
    
    # Check in-memory cache first
    with _theme_cache_lock:
        cached = _theme_cache.get(uid)
        if cached:
            theme, ts = cached
            if (datetime.now(timezone.utc) - ts).total_seconds() < _THEME_CACHE_TTL:
                return theme
    
    doc = get_db().collection('users').document(uid).get()
    theme = doc.to_dict().get('theme', 'campfire') if doc.exists else "campfire"
    
    with _theme_cache_lock:
        _theme_cache[uid] = (theme, datetime.now(timezone.utc))
    return theme

def set_user_theme(user_id, theme):
    uid = str(user_id)
    get_db().collection('users').document(uid).set({'theme': theme}, merge=True)
    # Invalidate cache
    with _theme_cache_lock:
        _theme_cache.pop(uid, None)

def set_user_custom_audio(user_id, theme, audio_url, filename=None):
    """Set the active audio URL and add it to the list of songs for this theme."""
    db = get_db()
    doc_ref = db.collection('users').document(str(user_id))
    doc = doc_ref.get()
    
    updates = {f'audio_{theme}': audio_url}
    
    if filename and audio_url:
        # Add to list if it doesn't exist
        songs_key = f'audio_list_{theme}'
        current_data = doc.to_dict() if doc.exists else {}
        current_list = current_data.get(songs_key, [])
        
        # Check if URL already in list
        if not any(s.get('url') == audio_url for s in current_list):
            current_list.append({'url': audio_url, 'name': filename})
            updates[songs_key] = current_list
            
    doc_ref.set(updates, merge=True)

def remove_custom_song(user_id, theme, audio_url):
    """Remove a specific song from the library and clear active if it matches."""
    db = get_db()
    doc_ref = db.collection('users').document(str(user_id))
    doc = doc_ref.get()
    if not doc.exists: return
    
    data = doc.to_dict()
    songs_key = f'audio_list_{theme}'
    current_list = data.get(songs_key, [])
    
    new_list = [s for s in current_list if s.get('url') != audio_url]
    updates = {songs_key: new_list}
    
    if data.get(f'audio_{theme}') == audio_url:
        updates[f'audio_{theme}'] = ""
        
    doc_ref.set(updates, merge=True)

def get_current_user_data(user_id):
    if not user_id or str(user_id).startswith("guest_"): return None
    doc = get_db().collection('users').document(str(user_id)).get()
    if doc.exists:
        data = doc.to_dict()
        data['id'] = user_id
        return data
    return None

def create_or_update_user(uid, email, name, picture=""):
    """Create or update user document in Firestore on Google sign-in."""
    db = get_db()
    doc_ref = db.collection('users').document(str(uid))
    doc = doc_ref.get()
    
    user_data = {
        'email': email,
        'name': name,
        'picture': picture,
        'last_login': utc_now_iso(),
    }
    
    if not doc.exists:
        # First-time user: set defaults
        user_data['theme'] = 'campfire'
        user_data['created_at'] = utc_now_iso()
        doc_ref.set(user_data)
    else:
        # Returning user: merge (preserves theme, etc.)
        doc_ref.set(user_data, merge=True)

def get_entries(user_id, entry_type="diary", limit=20, last_doc_id=None):
    """Fetch entries with cursor-based pagination.
    
    Args:
        user_id: The user's ID
        entry_type: 'diary' or 'story'
        limit: Max entries per page (default 20)
        last_doc_id: ID of last document from previous page (for cursor pagination)
    
    Returns:
        tuple: (entries_list, has_more)
    """
    db = get_db()
    docs = (db.collection('entries')
            .where(filter=FieldFilter('user_id', '==', str(user_id)))
            .where(filter=FieldFilter('type', '==', entry_type))
            .limit(2000)
            .stream())

    entries = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        entries.append(data)

    entries.sort(key=lambda x: (x.get('created_at', ''), x.get('id', '')))

    start_index = 0
    if last_doc_id:
        for index, entry in enumerate(entries):
            if entry.get('id') == last_doc_id:
                start_index = index + 1
                break

    page = entries[start_index:start_index + limit + 1]
    has_more = len(page) > limit
    return page[:limit], has_more


def get_entries_all(user_id, entry_type="diary"):
    """Legacy: fetch ALL entries (used by chat context, activity). Use sparingly."""
    db = get_db()
    docs = db.collection('entries').where(filter=FieldFilter('user_id', '==', str(user_id))).where(filter=FieldFilter('type', '==', entry_type)).limit(2000).stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        result.append(data)
    result.sort(key=lambda x: x.get('created_at', ''))
    return result

def get_entry(user_id, entry_id):
    doc = get_db().collection('entries').document(str(entry_id)).get()
    if doc.exists:
        data = doc.to_dict()
        if data.get('user_id') == str(user_id):
            data['id'] = doc.id
            return data
    return None

def delete_entry(user_id, entry_id):
    db = get_db()
    doc_ref = db.collection('entries').document(str(entry_id))
    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get('user_id') == str(user_id):
        doc_ref.delete()
        return True
    return False

def save_entry(user_id, entry_id, data):
    db = get_db()
    now = utc_now_iso()
    
    doc_data = {
        'user_id': str(user_id),
        'title': data.get('title', 'Untitled'),
        'content': data.get('content', ''),
        'type': data.get('type', 'diary'),
        'image_prompt': data.get('image_prompt'),
        'image_url': data.get('image_url'),
        'image_attached': data.get('image_attached', 0),
        'image_style': data.get('image_style'),
        'title_style': data.get('title_style'),
        'content_style': data.get('content_style'),
        'updated_at': now
    }
    
    if entry_id:
        doc_ref = db.collection('entries').document(str(entry_id))
        existing = doc_ref.get()
        if not existing.exists:
            return None
        existing_data = existing.to_dict()
        if existing_data.get('user_id') != str(user_id) and not existing_data.get('can_edit'):
            return None # Not found or unauthorized
        doc_data['user_id'] = existing_data.get('user_id') # Preserve the original owner
        doc_ref.update(doc_data)
        doc_data['id'] = entry_id
        return doc_data
    else:
        doc_data['created_at'] = now
        doc_data['share_code'] = None
        doc_data['share_type'] = None
        new_ref = db.collection('entries').document()
        new_ref.set(doc_data)
        doc_data['id'] = new_ref.id
        return doc_data

def update_share_code(user_id, entry_id, code, share_type, can_edit=False):
    db = get_db()
    doc_ref = db.collection('entries').document(str(entry_id))
    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get('user_id') == str(user_id):
        doc_ref.update({'share_code': code, 'share_type': share_type, 'can_edit': can_edit})
        return True
    return False

def get_entry_by_share_code(code):
    docs = get_db().collection('entries').where(filter=FieldFilter('share_code', '==', str(code))).stream()
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return None

def get_story_entries_for_user(user_id):
    docs = (get_db().collection('entries')
            .where(filter=FieldFilter('user_id', '==', str(user_id)))
            .where(filter=FieldFilter('type', '==', 'story'))
            .limit(500)
            .stream())
    result = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        result.append(data)
    result.sort(key=lambda x: (x.get('created_at', ''), x.get('id', '')))
    return result

def get_activity_counts(user_id, days):
    db = get_db()
    cutoff_date = (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()
    docs = (db.collection('activity')
            .where(filter=FieldFilter('user_id', '==', str(user_id)))
            .limit(2000)
            .stream())
    counts = {}
    for doc in docs:
        data = doc.to_dict()
        day = data.get('day')
        if day and day >= cutoff_date:
            counts[day] = data.get('count', 0)
    return counts

def increment_activity(user_id, day):
    db = get_db()
    docs = list(db.collection('activity').where(filter=FieldFilter('user_id', '==', str(user_id))).where(filter=FieldFilter('day', '==', day)).limit(1).stream())
    
    if docs:
        db.collection('activity').document(docs[0].id).update({
            'count': Increment(1),
            'updated_at': utc_now_iso()
        })
    else:
        db.collection('activity').add({
            'user_id': str(user_id),
            'day': day,
            'count': 1,
            'updated_at': utc_now_iso()
        })

def cleanup_guest_data():
    """Delete guest user entries and activity older than 48 hours."""
    db = get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    
    # Query guest users via prefix
    docs = db.collection('entries').where(filter=FieldFilter('user_id', '>=', 'guest_')).where(filter=FieldFilter('user_id', '<', 'guest`')).stream()
    
    deleted_count = 0
    for doc in docs:
        data = doc.to_dict()
        updated_at = data.get('updated_at', '')
        if updated_at < cutoff:
            db.collection('entries').document(doc.id).delete()
            deleted_count += 1
            
    # Clean up activity logs for guests
    activity_docs = db.collection('activity').where(filter=FieldFilter('user_id', '>=', 'guest_')).where(filter=FieldFilter('user_id', '<', 'guest`')).stream()
    for doc in activity_docs:
        data = doc.to_dict()
        updated_at = data.get('updated_at', '')
        if updated_at < cutoff:
            db.collection('activity').document(doc.id).delete()
            
    return deleted_count
