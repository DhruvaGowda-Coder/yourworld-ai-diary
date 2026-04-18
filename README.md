# YourWorld: Elemental Diary & Story Studio

YourWorld is a Flask-based writing web app focused on immersive journaling and storytelling. It combines a page-based writing experience, live autosave, theme-driven UI atmospheres, AI assistance, and share-by-code publishing.

## Highlights
- No-login onboarding: users can open and use the app immediately.
- Dual writing modes: `Diary` and `Story Mode` with separate page collections.
- Real-time autosave with page navigation and delete/create flows.
- Rich writing controls: title/content styling support and formatting toolbar.
- Aura AI companion chat with optional page-context guidance.
- Optional story image generation via OpenAI image API.
- 9 elemental themes with matching visuals and assistant tone.
- Read-only sharing by code (`single page` or `full story`).
- Writing activity heatmap for consistency tracking.

## Current Product Behavior
- The app currently runs in a guest-first model.
- Authentication pages/routes are disabled in UX and redirect to home.
- A session-backed guest profile is created automatically when needed.
- Theme, entries, sharing, and activity all work in this model.

## Tech Stack
- Backend: Python, Flask, Firebase (Firestore + Storage)
- Frontend: Jinja templates, Vanilla JavaScript, CSS
- AI Integrations:
  - Groq API for Aura Chat (Llama 3.1)
  - Hugging Face Inference for Story Illustrations

## Project Structure
```text
.
|-- README.md
`-- YourWorld/
    |-- app.py
    |-- requirements.txt
    |-- data/
    |   `-- app.db
    |-- static/
    |   |-- css/styles.css
    |   |-- js/app.js
    |   `-- img/yourworld-symbol.svg
    `-- templates/
        |-- base.html
        |-- index.html
        |-- diary.html
        |-- story.html
        |-- settings.html
        |-- profile.html
        `-- view_story.html
```

## Quick Start (Local)
1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r YourWorld/requirements.txt
   ```
3. (Optional) create `YourWorld/.env` for AI features.
4. Run:
   ```bash
   cd YourWorld
   python app.py
   ```
5. Open `http://127.0.0.1:5000`.

## Environment Variables
Set these in `YourWorld/.env`.

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `DIARY_SECRET_KEY` | `dev-secret-change-me` | Yes (production) | Flask session signing key |
| `FIREBASE_ADMIN_CREDENTIALS_JSON` | empty | Yes | JSON string of Firebase Service Account |
| `FIREBASE_STORAGE_BUCKET` | empty | Yes | Firebase Storage bucket name |
| `GROQ_API_KEY` | empty | Optional | Enables Aura AI responses via Groq |
| `GROQ_CHAT_MODEL` | `llama-3.1-8b-instant` | Optional | Groq chat model |
| `HUGGINGFACE_API_KEY` | empty | Optional | Enables story image generation via Hugging Face |
| `HUGGINGFACE_IMAGE_MODEL` | `black-forest-labs/FLUX.1-schnell` | Optional | Hugging Face image model |
| `GOOGLE_CLIENT_ID` | empty | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | empty | Optional | Google OAuth client secret |
| `SHOW_AI_ERRORS` | `0` | Optional | Include AI error detail in responses |
| `FLASK_DEBUG` | `1` | Optional | Set to `0` in production |

Notes:
- If AI keys are missing, chat and image endpoints fail gracefully.

## Web Routes
Active pages:
- `/`
- `/diary`
- `/story`
- `/settings`
- `/profile`
- `/view/<code>`

Legacy auth URLs currently redirect to home:
- `/login`, `/signup`, `/verify`, `/forgot-password`, `/reset-password`

## API Endpoints
- `GET /api/entries?type=diary|story`
- `GET /api/entry/<id>`
- `POST /api/entry/save`
- `DELETE /api/entry/<id>`
- `POST /api/entry/<id>/share`
- `DELETE /api/entry/<id>/share`
- `GET /api/activity`
- `POST /api/chat`
- `POST /api/story/image`

## Data Model
Cloud Firestore (NoSQL):
- `users`: Profiles and theme preferences
- `entries`: Diary and story pages
- `activity`: Writing consistency tracking

## Production Notes
- Use a strong `DIARY_SECRET_KEY`.
- Run with debug disabled.
- Put Flask behind a production WSGI server + reverse proxy.
- Back up `YourWorld/data/app.db` regularly.
- If you enable AI features in production, monitor API cost and rate limits.

## Troubleshooting
- `AI unavailable`: verify `GEMINI_API_KEY` and outbound network access.
- `Image generation failed`: verify `OPENAI_API_KEY` and model access.
- Empty history in a fresh session: this is expected until first save.
