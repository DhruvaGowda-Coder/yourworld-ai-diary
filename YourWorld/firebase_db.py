import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime, timezone

APP_DIR = os.path.dirname(os.path.abspath(__file__))
CRED_PATH = os.path.join(APP_DIR, "firebase-adminsdk.json")

if not firebase_admin._apps:
    try:
        json_cred = os.environ.get("FIREBASE_ADMIN_CREDENTIALS_JSON")
        if json_cred:
            cred_dict = json.loads(json_cred)
            cred = credentials.Certificate(cred_dict)
        else:
            cred = credentials.Certificate(CRED_PATH)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"Error initializing Firebase Admin: {e}")

def get_db():
    return firestore.client()

def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()

def verify_token(id_token):
    try:
        return auth.verify_id_token(id_token)
    except Exception:
        return None

def get_user_theme(user_id):
    if not user_id: return "campfire"
    doc = get_db().collection('users').document(str(user_id)).get()
    if doc.exists:
        return doc.to_dict().get('theme', 'campfire')
    return "campfire"

def set_user_theme(user_id, theme):
    get_db().collection('users').document(str(user_id)).set({'theme': theme}, merge=True)

def get_current_user_data(user_id):
    if not user_id: return None
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

def get_entries(user_id, entry_type="diary"):
    db = get_db()
    docs = db.collection('entries').where('user_id', '==', str(user_id)).where('type', '==', entry_type).stream()
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
        if not existing.exists or existing.to_dict().get('user_id') != str(user_id):
            return None # Not found or unauthorized
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

def update_share_code(user_id, entry_id, code, share_type):
    db = get_db()
    doc_ref = db.collection('entries').document(str(entry_id))
    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get('user_id') == str(user_id):
        doc_ref.update({'share_code': code, 'share_type': share_type})
        return True
    return False

def get_entry_by_share_code(code):
    docs = get_db().collection('entries').where('share_code', '==', str(code)).stream()
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return None

def get_story_entries_for_user(user_id):
    docs = get_db().collection('entries').where('user_id', '==', str(user_id)).where('type', '==', 'story').stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        data['id'] = doc.id
        result.append(data)
    result.sort(key=lambda x: x.get('created_at', ''))
    return result

def get_activity_counts(user_id, days):
    db = get_db()
    docs = db.collection('activity').where('user_id', '==', str(user_id)).stream()
    counts = {}
    for doc in docs:
        data = doc.to_dict()
        counts[data.get('day')] = data.get('count', 0)
    return counts

def increment_activity(user_id, day):
    db = get_db()
    docs = db.collection('activity').where('user_id', '==', str(user_id)).where('day', '==', day).stream()
    doc_id = None
    count = 0
    for doc in docs:
        doc_id = doc.id
        count = doc.to_dict().get('count', 0)
        break
    
    if doc_id:
        db.collection('activity').document(doc_id).update({'count': count + 1, 'updated_at': utc_now_iso()})
    else:
        db.collection('activity').add({
            'user_id': str(user_id),
            'day': day,
            'count': 1,
            'updated_at': utc_now_iso()
        })
