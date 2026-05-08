# 📖 YourWorld — Next-Gen Secure Content Sharing Platform

An immersive, AI-powered content sharing and collaboration platform that transforms note-taking and sharing into an interactive, visually rich experience using private access codes.

---

## 🌐 Live Demo

👉 https://worldbyyou.com/

---

## 🎯 Problem Solved

Traditional pasting and sharing tools (like Pastebin or Dontpad) are highly functional but lack creativity, privacy controls, rich media, and AI assistance.

---

## 💡 Solution

YourWorld creates a personalized, secure workspace where users can write private notes or create rich shared canvases with AI-generated visuals, securely sharing them via private codes.

---

## ✨ Key Features

* 📝 Dual writing modes: **Private Notes** and **Shared Canvas**
* ⚡ Real-time autosave with **900ms debounce**
* 🎨 9 immersive elemental themes (visual + audio experience)
* 🤖 AI-powered writing assistant (Groq – LLaMA 3.1)
* 🖼️ AI-generated illustrations securely stored in **Cloudflare R2** (Hugging Face FLUX)
* 🔗 Share content securely using **unique private codes**
* 📊 Writing activity heatmap for consistency tracking
* 🌐 Offline-capable PWA experience

---

## 🏗️ Tech Stack

* **Backend**: Python, Flask (Modular Blueprints architecture)
* **Database**: Firebase Admin (Firestore)
* **Storage**: Cloudflare R2 (S3 Boto3 Integration)
* **Frontend**: Jinja Templates, Vanilla JavaScript, CSS
* **AI (Chat)**: Groq API (LLaMA 3.1)
* **AI (Images)**: Hugging Face FLUX

---

## 📁 Project Structure

```text id="ywstruct"
YourWorld/
├── app.py             # Main entry point
├── config.py          # Centralized configuration
├── extensions.py      # Flask extensions (Limiter, CSRF)
├── firebase_db.py     # Database interactions
├── utils.py           # Helper functions & decorators
├── routes/            # Blueprint Modules
│   ├── api.py         # AI, R2 Storage, & Data endpoints
│   ├── auth.py        # Google OAuth
│   └── main.py        # UI page rendering
├── static/            # CSS, JS, Images, Audio
└── templates/         # HTML templates
```

---

## 🚀 Run Locally

```bash id="yw1"
python -m venv .venv
.venv\Scripts\activate
pip install -r YourWorld/requirements.txt
cd YourWorld
python app.py
```

---

Open:
👉 http://127.0.0.1:5000

---

## 🔧 Environment Variables

```bash id="yw2"
DIARY_SECRET_KEY=your-secret
FIREBASE_ADMIN_CREDENTIALS_JSON=your-json

# Cloudflare R2 for Image Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret
R2_BUCKET_NAME=your-bucket
R2_PUBLIC_DEV_URL=your-public-url

# AI Integration
GROQ_API_KEY=your-key
HUGGINGFACE_API_KEY=your-key
```

---

## 🔐 Security & Architecture

* Strict Flask Blueprints structure for robust backend maintenance
* Flask-Limiter for API rate-limiting against AI abuse
* XSS prevention using bleach sanitization
* Secure sharing via generated codes
* CSRF protection on all API endpoints

---

*Built for privacy. Designed for immersion. Powered by AI.*
