import os
import re
from dotenv import load_dotenv

APP_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(APP_DIR, ".env"))

# AI Keys & Models
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_CHAT_MODEL = os.environ.get("GROQ_CHAT_MODEL", "llama-3.1-8b-instant").strip()
HUGGINGFACE_API_KEY = os.environ.get("HUGGINGFACE_API_KEY", "").strip()
HUGGINGFACE_IMAGE_MODEL = os.environ.get("HUGGINGFACE_IMAGE_MODEL", "black-forest-labs/FLUX.1-schnell").strip()

# Cloudflare R2 Config
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "").strip()
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "").strip()
R2_PUBLIC_DEV_URL = os.environ.get("R2_PUBLIC_DEV_URL", "").strip().rstrip('/')

# Google OAuth Config
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()

# Site Meta
SITE_URL = os.environ.get("SITE_URL", "https://worldbyyou.com").rstrip("/")
CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "elementaldiary@gmail.com").strip()
SITEMAP_LASTMOD = "2026-05-05"
SHARE_CODE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.~-]{3,31}$")

# Firebase Web Config
FIREBASE_WEB_CONFIG = {
    "apiKey": os.environ.get("FIREBASE_API_KEY", ""),
    "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN", ""),
    "projectId": os.environ.get("FIREBASE_PROJECT_ID", ""),
    "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
    "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID", ""),
    "appId": os.environ.get("FIREBASE_APP_ID", ""),
    "measurementId": os.environ.get("FIREBASE_MEASUREMENT_ID", ""),
}

# Theme Definitions
THEME_ORDER = ["campfire", "water", "wind", "earth", "ice", "storm", "space", "garden", "cherry"]
THEME_OPTIONS = set(THEME_ORDER)

THEME_DETAILS = {
    "campfire": {"name": "Ember Hearth", "desc": "Warm, reflective, story-lit", "icon": "Ember", "chat_subtitle": "Warm and steady writing companion."},
    "water": {"name": "Tide Whisper", "desc": "Calm, flowing, deep-thought", "icon": "Tide", "chat_subtitle": "Calm and reflective flow."},
    "wind": {"name": "Sky Drift", "desc": "Light, quick, airy", "icon": "Gale", "chat_subtitle": "Fast, curious, and lightweight."},
    "earth": {"name": "Rootstone", "desc": "Grounded, stable, practical", "icon": "Stone", "chat_subtitle": "Grounded, practical guidance."},
    "ice": {"name": "Crystal Frost", "desc": "Sharp, clear, precise", "icon": "Frost", "chat_subtitle": "Clear and exact answers."},
    "storm": {"name": "Volt Tempest", "desc": "Electric, dynamic, bold", "icon": "Volt", "chat_subtitle": "High-energy rapid ideas."},
    "space": {"name": "Nebula Orbit", "desc": "Expansive, mysterious, cosmic", "icon": "Orbit", "chat_subtitle": "Big-picture and philosophical."},
    "garden": {"name": "Bloom Haven", "desc": "Nurturing, soft, growing", "icon": "Bloom", "chat_subtitle": "Gentle, growth-focused support."},
    "cherry": {"name": "Sakura Drift", "desc": "Gentle, pink, falling petals", "icon": "Petal", "chat_subtitle": "Beautiful, fleeting moments.", "color": "#ffb7c5", "animation": "sakura"},
}

THEME_CHAT_PROFILES = {
    "campfire": "Voice: warm and reflective campfire guide. Keep replies concise, encouraging, and emotionally steady.",
    "water": "Voice: calm and deep-thinking. Use a patient pace, gentle wording, and reflective prompts.",
    "wind": "Voice: light, curious, quick-witted. Breeze Mode: if user text is long, start with a short summary and then actionable points.",
    "earth": "Voice: grounded and practical. Favor step-by-step guidance and stable, realistic advice.",
    "ice": "Voice: clear and precise. Crystal Clarity: when explaining facts or plans, add a short 'Key points' section first.",
    "storm": "Voice: bold and energetic. Lightning Round: for multi-part questions, respond in fast numbered bullets.",
    "space": "Voice: expansive and philosophical. Orbit View: when helpful, show how ideas connect with compact A -> B links.",
    "garden": "Voice: nurturing and growth-focused. Encourage progress gently, with practical next steps.",
    "cherry": "Voice: gentle and appreciative. Focus on beauty, fleeting moments, and emotional resonance.",
}

ALLOWED_IMAGE_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
ALLOWED_AUDIO_EXT = {'.mp3', '.wav', '.ogg', '.m4a', '.flac'}
GUEST_EMAIL_PREFIX = "guest-"
GUEST_EMAIL_DOMAIN = "guest.local"
