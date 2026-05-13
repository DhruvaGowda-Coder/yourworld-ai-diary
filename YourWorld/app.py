import os
from datetime import timedelta
import secrets
from flask import Flask, g, session, request, redirect, jsonify, render_template
from werkzeug.middleware.proxy_fix import ProxyFix

from extensions import csrf, limiter
from config import FIREBASE_WEB_CONFIG, SITE_URL, CONTACT_EMAIL, THEME_DETAILS, SITEMAP_LASTMOD
from utils import get_current_user, normalize_theme, get_user_theme
import firebase_db

# Import Blueprints
from routes.main import main_bp
from routes.auth import auth_bp
from routes.api import api_bp

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# App Security & Config
is_production = os.environ.get("FLASK_DEBUG", "0") != "1"
secret_key = os.environ.get("DIARY_SECRET_KEY")
if not secret_key:
    if is_production:
        raise ValueError("DIARY_SECRET_KEY environment variable is not set")
    else:
        print("WARNING: DIARY_SECRET_KEY not set. Using random key — sessions will not persist across restarts.")
        secret_key = secrets.token_hex(32)
app.secret_key = secret_key
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['SESSION_COOKIE_SECURE'] = is_production
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['SESSION_PERMANENT'] = True

csrf.init_app(app)
limiter.init_app(app)

# Register Blueprints
app.register_blueprint(main_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)

@app.before_request
def enforce_https():
    g.csp_nonce = secrets.token_urlsafe(16)
    if app.debug: return None
    forwarded_proto = request.headers.get("X-Forwarded-Proto")
    if forwarded_proto != "https":
        return redirect(request.url.replace("http://", "https://", 1), code=301)

@app.after_request
def add_security_headers(response):
    if request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    else:
        response.headers['Cache-Control'] = 'no-store' if request.path.startswith('/view') else 'no-cache'
    
    nonce = g.get('csp_nonce', '')
    csp = (
        f"default-src 'self'; script-src 'self' 'nonce-{nonce}' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        "font-src 'self' https://fonts.gstatic.com data:; "
        "img-src 'self' data: https:; media-src 'self' data: https:; "
        "connect-src 'self' https://api.groq.com https://router.huggingface.co https://*.googleapis.com https://*.firebaseio.com; "
    )
    response.headers['Content-Security-Policy'] = csp
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    if not app.debug:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
    return response

@app.context_processor
def inject_global_context():
    if not hasattr(g, '_yw_ctx'):
        user_id = session.get("user_id")
        current_user = get_current_user()
        theme = get_user_theme(user_id)
        theme_meta = THEME_DETAILS.get(theme, THEME_DETAILS["campfire"])
        
        g._yw_ctx = {
            "current_user": current_user,
            "is_guest_user": session.get("is_guest", False),
            "current_theme": theme,
            "current_theme_meta": theme_meta,
            "firebase_config": FIREBASE_WEB_CONFIG,
            "site_url": SITE_URL,
            "contact_email": CONTACT_EMAIL,
            "sitemap_lastmod": SITEMAP_LASTMOD,
            "csp_nonce": g.get("csp_nonce", ""),
        }
    return g._yw_ctx

@app.route("/health")
@limiter.exempt
def health_check():
    return jsonify({"status": "ok"}), 200

@app.errorhandler(404)
def not_found(e):
    return render_template("404.html"), 404

@app.errorhandler(429)
def rate_limit_error(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Too many requests. Please slow down."}), 429
    return "Too many requests. Please wait a moment and try again.", 429

@app.errorhandler(500)
def internal_server_error(e):
    app.logger.exception("Internal Server Error")
    if request.path.startswith("/api/"):
        return jsonify({"error": "Internal Server Error"}), 500
    return "Internal Server Error", 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="127.0.0.1", port=port)
