# 📖 YourWorld — AI Diary & Story Platform

Immersive AI-powered journaling and storytelling platform that transforms writing into an interactive, emotional, and visually rich experience.

---

## 🌐 Live Demo

👉 https://online-elemental-diary.onrender.com

---

## 🎯 Problem Solved

Traditional note-taking apps are functional but lack emotional depth, creativity, and engagement, making writing feel repetitive and uninspiring.

---

## 💡 Solution

YourWorld creates a personalized writing environment using dynamic themes, AI assistance, and visual storytelling — turning journaling into an immersive and expressive experience.

---

## ✨ Key Features

* 📝 Dual writing modes: **Diary** and **Story Mode**
* ⚡ Real-time autosave with **900ms debounce**
* 🎨 9 immersive elemental themes (visual + audio experience)
* 🤖 AI-powered writing assistant (Groq – LLaMA 3.1)
* 🖼️ AI-generated story illustrations (Hugging Face FLUX)
* 🔗 Share stories using secure **read-only links**
* 📊 Writing activity heatmap for consistency tracking
* 🌐 Offline-capable PWA experience

---

## 🧠 How It Works

User Input → Autosave System → Theme Engine → AI Context Processing → Enhanced Writing Output → Shareable Story

---

## 🏗️ Tech Stack

* **Backend**: Python, Flask, Firebase (Firestore + Storage)
* **Frontend**: Jinja Templates, JavaScript, CSS
* **AI (Chat)**: Groq API (LLaMA 3.1)
* **AI (Images)**: Hugging Face FLUX
* **Storage**: Firebase + Local fallback

---

## 🧩 Architecture

```id="ywarch"
Frontend (Flask Templates) → User Input → Autosave Engine → Firebase Storage  
                                      ↓  
                            AI Processing (Groq + HuggingFace)  
                                      ↓  
                              Enhanced Content Output
```

---

## 📊 Performance & Behavior

* Autosave triggered every **~900ms after input**
* Guest-first onboarding (no login required)
* Works offline with cached assets (PWA support)
* AI features degrade gracefully if API keys are missing

---

## 📁 Project Structure

```text id="ywstruct"
YourWorld/
├── app.py
├── static/
├── templates/
├── data/
└── requirements.txt
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
FIREBASE_STORAGE_BUCKET=your-bucket

GROQ_API_KEY=your-key
HUGGINGFACE_API_KEY=your-key
```

---

## 🔐 Security & Design

* Guest-first architecture with session-based identity
* Private-by-default writing model
* Secure sharing via generated codes
* CSRF protection on all API endpoints

---

## 🎯 Impact

* Encourages consistent writing habits through immersive design
* Enhances creativity with AI-assisted storytelling
* Demonstrates full-stack AI integration with real-time interaction

---

*Built for creativity. Designed for immersion. Powered by AI.*
