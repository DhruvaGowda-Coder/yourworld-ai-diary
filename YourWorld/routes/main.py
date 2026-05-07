from flask import Blueprint, render_template, redirect, url_for, request, session, Response, send_from_directory
import os
from html import unescape
from config import THEME_ORDER, THEME_DETAILS, SITE_URL, CONTACT_EMAIL, SITEMAP_LASTMOD, APP_DIR
from utils import ensure_session, get_user_theme, normalize_theme
import firebase_db

main_bp = Blueprint('main', __name__)

def build_theme_list():
    items = []
    for theme_id in THEME_ORDER:
        meta = THEME_DETAILS[theme_id]
        items.append({
            "id": theme_id,
            "name": meta["name"],
            "desc": meta["desc"],
            "icon": meta["icon"],
            "chat_subtitle": meta["chat_subtitle"],
            "color": meta.get("color"),
            "animation": meta.get("animation"),
        })
    return items

@main_bp.route("/")
def index():
    return render_template("index.html")

@main_bp.route("/about")
def about():
    return render_template("legal.html", page="about")

@main_bp.route("/faq")
def faq():
    return render_template("legal.html", page="faq")

@main_bp.route("/create")
def create_info():
    return redirect(url_for("main.story"))

@main_bp.route("/how-it-works")
def how_it_works():
    return render_template("legal.html", page="how")

@main_bp.route("/privacy-policy")
def privacy_policy():
    return render_template("legal.html", page="privacy")

@main_bp.route("/terms-and-conditions")
def terms_and_conditions():
    return render_template("legal.html", page="terms")

@main_bp.route("/diary")
@ensure_session
def diary():
    return render_template("diary.html")

@main_bp.route("/story")
@ensure_session
def story():
    return render_template("story.html")

@main_bp.route("/settings")
@ensure_session
def settings():
    user_id = session.get("user_id")
    current_theme = get_user_theme(user_id)
    themes = build_theme_list()
    info = request.args.get("info")
    return render_template("settings.html", themes=themes, current_theme=current_theme, info=info)

@main_bp.route("/settings/theme", methods=["POST"])
@ensure_session
def settings_theme():
    selected = normalize_theme(request.form.get("theme"))
    session["theme"] = selected
    firebase_db.set_user_theme(session["user_id"], selected)
    return redirect(url_for("main.settings", info="Theme updated."))

@main_bp.route("/profile")
@ensure_session
def profile():
    return render_template("profile.html")

@main_bp.route("/view")
def view_by_code():
    from utils import normalize_share_code
    code = normalize_share_code(request.args.get("code"))
    if not code:
        return redirect(url_for("main.index"))
    return redirect(url_for("main.view_story", code=code))

@main_bp.route("/view/<code>")
def view_story(code):
    from utils import normalize_share_code
    safe_code = normalize_share_code(code)
    if not safe_code:
        return redirect(url_for("main.index"))
        
    owner_row = firebase_db.get_entry_by_share_code(safe_code)
    if not owner_row:
        return render_template("view_story.html", not_found=True, code=safe_code)

    rows = firebase_db.get_story_entries_for_user(owner_row.get("user_id"))

    if not rows:
        return render_template("view_story.html", not_found=True, code=safe_code)

    return render_template(
        "view_story.html",
        pages=[
            {
                "id": r.get("id"),
                "title": unescape(r.get("title", "")),
                "content": unescape(r.get("content", "")),
                "image_url": r.get("image_url"),
                "image_attached": bool(r.get("image_attached")),
                "image_style": r.get("image_style"),
                "title_style": r.get("title_style"),
                "content_style": r.get("content_style"),
                "updated_at": r.get("updated_at"),
                "created_at": r.get("created_at"),
            }
            for r in rows
        ],
        code=safe_code,
        not_found=False,
        can_edit=owner_row.get("can_edit", False)
    )

@main_bp.route("/robots.txt")
def robots_txt():
    body = f"""User-agent: *
Allow: /
Allow: /favicon.ico
Allow: /favicon-48x48.png
Allow: /apple-touch-icon.png
Allow: /about
Allow: /privacy-policy
Allow: /terms-and-conditions
Allow: /faq
Allow: /create
Allow: /how-it-works
Disallow: /code/
Disallow: /view/
Disallow: /view/*
Disallow: /api/
Disallow: /settings
Disallow: /profile
Disallow: /diary
Disallow: /story

Sitemap: {SITE_URL}/sitemap.xml
"""
    return Response(body, mimetype="text/plain")

@main_bp.route("/sitemap.xml")
def sitemap_xml():
    pages = [
        ("", "daily", "1.0"),
        ("/how-it-works", "weekly", "0.9"),
        ("/create", "weekly", "0.85"),
        ("/faq", "weekly", "0.85"),
        ("/about", "weekly", "0.8"),
        ("/privacy-policy", "monthly", "0.7"),
        ("/terms-and-conditions", "monthly", "0.6"),
    ]
    urls = "\n".join(
        f"""  <url>
    <loc>{SITE_URL}{path}</loc>
    <lastmod>{SITEMAP_LASTMOD}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>"""
        for path, changefreq, priority in pages
    )
    body = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{urls}
</urlset>
"""
    return Response(body, mimetype="application/xml")

@main_bp.route("/favicon.ico")
def favicon():
    return send_from_directory(os.path.join(APP_DIR, "static", "img"), "favicon.ico", mimetype="image/x-icon")

@main_bp.route("/favicon-48x48.png")
def favicon_48():
    return send_from_directory(os.path.join(APP_DIR, "static", "img"), "favicon-48x48.png", mimetype="image/png")

@main_bp.route("/apple-touch-icon.png")
def apple_touch_icon():
    return send_from_directory(os.path.join(APP_DIR, "static", "img"), "apple-touch-icon.png", mimetype="image/png")
