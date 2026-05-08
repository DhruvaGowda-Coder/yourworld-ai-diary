from flask import Blueprint, session, redirect, url_for, render_template, request, current_app
import secrets
import requests
from urllib.parse import urlencode
import firebase_db
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SITE_URL

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    return render_template("login.html")

@auth_bp.route("/login/google")
def login_google():
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return render_template(
            "login.html",
            error="Google sign-in is not configured. Please try again later.",
        ), 503

    state = secrets.token_urlsafe(16)
    session["oauth_state"] = state

    redirect_uri = f"{SITE_URL}/auth/google/callback"
    auth_params = {
        "response_type": "code",
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(auth_params)
    return redirect(auth_url)

@auth_bp.route("/auth/google/callback")
def auth_google_callback():
    code = request.args.get("code")
    state = request.args.get("state")
    
    if state != session.pop("oauth_state", None):
        return "Invalid state parameter.", 400

    redirect_uri = f"{SITE_URL}/auth/google/callback"
    
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    try:
        r = requests.post(token_url, data=data, timeout=10)
    except requests.RequestException:
        return "Authentication failed. Please try again.", 400
    if not r.ok:
        return "Authentication failed. Please try again.", 400
        
    token_data = r.json()
    access_token = token_data.get("access_token")
    if not access_token:
        return "No access token in response.", 400
    
    userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        r2 = requests.get(userinfo_url, headers=headers, timeout=10)
    except requests.RequestException:
        return "Failed to retrieve user info. Please try again.", 400
    if not r2.ok:
        return "Failed to retrieve user info. Please try again.", 400
        
    user_info = r2.json()
    uid = user_info.get("id")
    email = user_info.get("email", "")
    name = user_info.get("name", "") or (email.split("@")[0] if email else "User")
    picture = user_info.get("picture", "")
    
    firebase_db.create_or_update_user(uid, email, name, picture)
    
    session.permanent = True
    session["user_id"] = uid
    session["is_guest"] = False
    session.pop("theme", None)
    
    return redirect(url_for("main.diary"))

@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("main.index"))
