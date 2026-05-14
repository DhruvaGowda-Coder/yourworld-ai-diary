# YourWorld — Complete System Audit Report (Part 1)
## Overview, Feature Inventory & Feature Decomposition

---

## STEP 1: DEEP UNDERSTANDING

### Product Identity
- **Name**: YourWorld
- **Live URL**: https://worldbyyou.com/
- **Tagline**: "Built for privacy. Designed for immersion. Powered by AI."
- **Core Concept**: A secure, AI-powered content sharing platform where users create private notes or rich shared canvases, sharing them via unique private codes. Also supports anonymous ephemeral file sharing via Quick Share.

### Inferred User Intent
Users seek a creative, private workspace that combines note-taking with rich media (AI-generated images), ambient audio theming, and controlled sharing — unlike plain-text tools (Pastebin, Dontpad) that lack privacy controls, theming, and AI assistance.

### Inferred Behavioral Logic
- **Dual-mode content**: Private diary entries (never shared) vs. shared canvases (shareable via codes)
- **Guest-first onboarding**: No sign-in required to start writing; guest sessions auto-created
- **Progressive authentication**: AI features (chat, image generation) gated behind Google sign-in
- **Code-based sharing**: Content is private by default; sharing is explicit and code-gated
- **Ambient immersion**: 9 elemental themes affect visuals, animations, audio, and AI personality

### System Design Patterns
- **Flask Blueprint architecture** (modular routes: `main`, `auth`, `api`)
- **Server-rendered templates** with client-side JavaScript enhancement (not SPA)
- **Singleton pattern** for external service clients (R2, Firebase)
- **Decorator pattern** for auth/session enforcement (`@ensure_session`, `@auth_required`)
- **Observer pattern** for theme changes (`yw:themechange` custom events)
- **Debounced autosave** with content hashing to prevent duplicate writes
- **Cursor-based pagination** for Firestore queries
- **In-memory caching with TTL** for user theme lookups
- **Service Worker** with tiered caching strategies (network-first for pages, cache-first for assets)

---

## STEP 2: COMPLETE FEATURE INVENTORY

### 1. Core Functional Features
| # | Feature |
|---|---------|
| 1.1 | Private Notes (Diary) workspace |
| 1.2 | Shared Canvas (Story) workspace |
| 1.3 | Content creation with title + body |
| 1.4 | Content saving (manual + autosave) |
| 1.5 | Content deletion with confirmation |
| 1.6 | Entry navigation (prev/next with page-turn animation) |
| 1.7 | Entry sidebar list with selection |
| 1.8 | Share code generation (random or custom) |
| 1.9 | Share code revocation |
| 1.10 | Public viewer for shared content (`/view/<code>`) |
| 1.11 | Collaborative editing (can_edit flag on shares) |
| 1.12 | AI Chat Assistant ("Aura") |
| 1.13 | AI Image Generation (FLUX via Hugging Face) |
| 1.14 | Image upload (manual, from device) |
| 1.15 | Image attachment to canvas pages |
| 1.16 | Writing activity tracking (heatmap) |
| 1.17 | Quick Share: Anonymous file upload with unique codes (e.g. `SKY-A1B2C3`) and 48h auto-expiry |
| 1.18 | Quick Delete: Instant manual deletion of Quick Share files via secure delete token |
| 1.19 | Chat sessions: Multi-session AI chat with persistent history and cross-device sync |
| 1.20 | File attachments in Aura chat (images, PDFs, code, archives) |
| 1.21 | Multi-image support per canvas page (up to 10 images) |
| 1.22 | Mobile-centered modals for Quick Share and Image View |

### 2. Supporting Features
| # | Feature |
|---|---------|
| 2.1 | Google OAuth sign-in |
| 2.2 | Guest session creation (auto) |
| 2.3 | User profile page with stats |
| 2.4 | Settings page (theme selection, audio management) |
| 2.5 | Health check endpoint (`/health`) |
| 2.6 | Guest data cleanup (cron-triggered) with physical R2 file deletion |
| 2.7 | Cursor-based pagination for entry lists |
| 2.8 | "Load More" button for additional entries |
| 2.9 | 404 error handler with themed error page |
| 2.10 | SEO landing pages for competitive keywords (10+ keyword pages) |
| 2.11 | Competitor comparison landing pages (`/compare/google-docs`, `/compare/dontpad`, etc.) |

### 3. UI/UX Features
| # | Feature |
|---|---------|
| 3.1 | 9 elemental themes with distinct color palettes |
| 3.2 | Ambient background animations (canvas-based per theme) |
| 3.3 | Theme particle layer (DOM-based particles) |
| 3.4 | Day/night cycle (auto-detected from clock) |
| 3.5 | Page-turn animation on entry navigation |
| 3.6 | Mobile-responsive hamburger drawer navigation |
| 3.7 | Text formatting toolbar (Bold, Italic, Underline, Font Size) |
| 3.8 | Autosave toggle with visual indicator |
| 3.9 | Save status indicator with color flash feedback |
| 3.10 | Guest mode warning banner |
| 3.11 | Login prompt modal (for gated features) |
| 3.12 | Image modal (full-view, centered on mobile) |
| 3.13 | Writing activity heatmap (GitHub-style) |
| 3.14 | Quick Share upload modal (drag-and-drop with progress bar) |
| 3.15 | Markdown rendering in Aura chat (via Marked.js + DOMPurify) |
| 3.16 | Syntax-highlighted code blocks in chat (via Prism.js) |

### 4. Interaction Features
| # | Feature |
|---|---------|
| 4.1 | Keyboard shortcuts (Ctrl+S save, Ctrl+N new, Ctrl+D delete, Ctrl+B/I/U formatting, Ctrl+K chat, Ctrl+←/→ navigation) |
| 4.2 | Draggable chat panel |
| 4.3 | Resizable chat panel (pointer-based) |
| 4.4 | Draggable image illustration on canvas |
| 4.5 | Resizable image illustration |
| 4.6 | Theme preview on hover (settings page) |
| 4.7 | Theme selection tone (WebAudio API) |
| 4.8 | Share code copy to clipboard |
| 4.9 | Custom share code input with validation |
| 4.10 | Share mode selector (Full canvas / Single page) |
| 4.11 | Editable permission toggle for shares |
| 4.12 | Image download as PNG |

### 5. Automation Features
| # | Feature |
|---|---------|
| 5.1 | Autosave with 2500ms debounce |
| 5.2 | Content hash comparison to prevent duplicate saves |
| 5.3 | Activity counter auto-increment on save |
| 5.4 | Auto-title generation from content (first 40 chars) |
| 5.5 | Day/night cycle auto-sync every 5 minutes |
| 5.6 | Guest data auto-cleanup (48-hour TTL) |
| 5.7 | Audio position persistence across page navigations |
| 5.8 | Service Worker asset precaching |
| 5.9 | Public view auto-refresh (polling every 3.5s) |

### 6. Personalization Features
| # | Feature |
|---|---------|
| 6.1 | 9 selectable elemental themes |
| 6.2 | Per-theme ambient audio (default + custom uploads) |
| 6.3 | Per-theme custom audio library management |
| 6.4 | Theme-aware AI chat personality |
| 6.5 | Per-entry text styling (font size, bold, italic, underline) |
| 6.6 | Per-entry image positioning and sizing |
| 6.7 | Sound toggle with persistence |

### 7. Security & Privacy Features
| # | Feature |
|---|---------|
| 7.1 | CSRF protection (Flask-WTF) on all endpoints |
| 7.2 | Content Security Policy headers (with nonce) |
| 7.3 | HTTPS enforcement (redirect + HSTS) |
| 7.4 | XSS prevention via bleach sanitization |
| 7.5 | Rate limiting (Flask-Limiter: 1000/day, 100/hour default; 10/min chat; 5/min image; 60/min save; 10/min quick-upload) |
| 7.6 | Session cookie security (Secure, HttpOnly, SameSite=Lax) |
| 7.7 | OAuth state parameter validation |
| 7.8 | Content size limit (100KB per entry, 16MB upload) |
| 7.9 | File type whitelisting (image/audio/document extensions + MIME type validation + magic-byte signature check) |
| 7.10 | Share code regex validation (`^[A-Za-z0-9][A-Za-z0-9_.~-]{3,31}$`) |
| 7.11 | Owner-only entry modification enforcement |
| 7.12 | Trust boundary: non-owners limited to title+content edits |
| 7.13 | Firestore rules deny all direct client access |
| 7.14 | Cron endpoint protected by bearer token |
| 7.15 | `noindex, nofollow` on shared view pages |
| 7.16 | Permissions-Policy (camera, mic, geo disabled) |
| 7.17 | X-Frame-Options, X-Content-Type-Options headers |
| 7.18 | COEP/COOP headers |
| 7.19 | Filename sanitization (werkzeug `secure_filename`) |
| 7.20 | Orphaned file cleanup (Physical R2 deletion of guest data) |
| 7.21 | XSS Mitigation: Enforced 'attachment' disposition for non-media files |
| 7.22 | Rate limit increased to 60/min for autosave stability |

### 8. Performance Features
| # | Feature |
|---|---------|
| 8.1 | Cached R2 client singleton |
| 8.2 | In-memory theme cache with 5-min TTL |
| 8.3 | Context processor caching per request (`g._yw_ctx`) |
| 8.4 | DNS prefetch for external APIs |
| 8.5 | Font preconnect |
| 8.6 | CSS versioning for cache busting |
| 8.7 | Deferred script loading |
| 8.8 | Service Worker with tiered caching |
| 8.9 | Lazy image loading |
| 8.10 | Gunicorn gthread workers (4 workers × 4 threads) |
| 8.11 | ProxyFix middleware for reverse proxy |
| 8.12 | Firestore native count aggregation |

### 9. Accessibility Features
| # | Feature |
|---|---------|
| 9.1 | ARIA labels on interactive elements |
| 9.2 | `aria-hidden` management on drawers/panels |
| 9.3 | `aria-expanded` on hamburger menu |
| 9.4 | Screen-reader-only labels (`.sr-only`) |
| 9.5 | `aria-label` on heatmap cells |
| 9.6 | `prefers-reduced-motion` detection |
| 9.7 | `role="listbox"` / `role="option"` on share mode menu |
| 9.8 | Keyboard escape to close drawers |
| 9.9 | `noscript` fallback for public viewer |

### 10. Integration Features
| # | Feature |
|---|---------|
| 10.1 | Google OAuth 2.0 (sign-in) |
| 10.2 | Groq API — LLaMA 3.1 (AI chat) |
| 10.3 | Hugging Face Inference API — FLUX.1-schnell (AI image generation) |
| 10.4 | Firebase Admin SDK — Firestore (database) |
| 10.5 | Firebase Storage (legacy upload path) |
| 10.6 | Cloudflare R2 via boto3/S3 (primary file storage) |
| 10.7 | Google Fonts (Spectral, Space Grotesk, Noto Serif, Playfair Display) |

### 11. Advanced / Hidden Features
| # | Feature |
|---|---------|
| 11.1 | Procedural ambient audio generation script (`generate_audio.py`) |
| 11.2 | PWA manifest + installability |
| 11.3 | Structured data (JSON-LD: Organization + WebSite + SearchAction + SoftwareApplication + Service + HowTo + FAQPage) |
| 11.4 | XML Sitemap with priority/changefreq (20+ URL entries including comparison pages) |
| 11.5 | robots.txt with granular allow/disallow (per-bot rules for Googlebot, Bingbot, PerplexityBot) |
| 11.6 | OpenGraph + Twitter Card meta tags (per-page dynamic content) |
| 11.7 | Content hash-based duplicate save prevention |
| 11.8 | Speakable structured data for voice search (cssSelector-based) |
| 11.9 | Competitive comparison table on homepage (vs Google Docs, Notion, Pastebin, Dontpad, Telegra.ph, PrivateBin — 10 features, 7 competitors) |
| 11.10 | Human-readable Quick Share codes with elemental prefixes (SKY, FIRE, WIND, etc.) |
| 11.11 | Fallback chat responses (per-theme, client-side) |
| 11.12 | Related pages context injection into AI chat |
| 11.13 | Audio crossfade loop in generated WAV files |
| 11.14 | Blob URL cleanup in localStorage audio |

---

## STEP 3: FEATURE DECOMPOSITION (Selected Key Features)

### F1: Autosave System
- **Category**: Automation
- **Description**: Automatically saves the current entry after a period of inactivity
- **Purpose**: Prevent data loss without manual intervention
- **Trigger**: Any input event on title or content fields
- **Input**: Current title, content, styling state, image state
- **Process**: (1) `markDirty()` sets `dirty=true` → (2) `scheduleAutosave()` starts 2500ms timer → (3) Timer fires → (4) Compute content hash → (5) Compare with `_lastSavedHash` → (6) If different, call `saveEntry({auto:true})` → (7) POST to `/api/entry/save` → (8) Server sanitizes with bleach → (9) Firestore write → (10) Increment activity counter → (11) Update UI status
- **Output**: Saved entry ID, timestamp, updated sidebar label, status flash
- **Dependencies**: CSRF token, session, Firestore connection
- **Edge Behavior**: If hash matches last save, skips silently. If network fails, shows "Offline". If content >100KB, returns 400. Concurrent saves coalesced via `saveInFlight` promise.

### F2: AI Chat Assistant ("Aura")
- **Category**: Core Functional
- **Description**: Theme-aware AI writing assistant accessible via floating panel
- **Purpose**: Help users brainstorm, format, and improve their writing
- **Trigger**: Click "Aura" launch button → submit message
- **Input**: User message, chat history (last 10), current page context (title, content, type), active theme
- **Process**: (1) Client sends POST `/api/chat` with message + history + context → (2) `@auth_required` checks sign-in → (3) Server fetches 5 recent related pages → (4) Builds system prompt with theme personality profile → (5) Sends to Groq API (LLaMA 3.1, temp=0.7, 15s timeout) → (6) Returns reply with theme identifier
- **Output**: AI-generated text reply rendered in chat bubble
- **Dependencies**: Google sign-in, Groq API key, active theme
- **Edge Behavior**: Unauthenticated users get login prompt link in chat. API failure returns theme-appropriate client-side fallback response. Empty message rejected with 400.

### F3: Share Code System
- **Category**: Core Functional
- **Description**: Generate unique codes that grant access to shared canvas content
- **Purpose**: Enable controlled, private content sharing without public URLs
- **Trigger**: Click "Random Code" or "Use Code" button on story page
- **Input**: Entry ID, custom code (optional), share mode (story/single), can_edit flag
- **Process**: (1) Save entry if unsaved → (2) POST `/api/entry/<id>/share` → (3) Validate custom code format via regex → (4) Check uniqueness against Firestore → (5) If random: generate `token_urlsafe(8)` with 10 retry attempts → (6) Store code + share_type + can_edit in entry document → (7) Return code + full URL
- **Output**: Share code displayed in UI, copyable to clipboard, shown in status bar
- **Dependencies**: Saved entry, Firestore
- **Edge Behavior**: Duplicate custom codes return 400. Failed random generation after 10 attempts returns 503. Removing share sets code to null. Only story-type entries can be shared.

### F4: Theme System
- **Category**: Personalization
- **Description**: 9 elemental visual/audio themes that transform the entire UI
- **Purpose**: Create immersive, personalized writing environments
- **Trigger**: Theme selection in Settings page
- **Input**: Theme ID (campfire/water/wind/earth/ice/storm/space/garden/cherry)
- **Process**: (1) User selects theme tile → (2) Radio input change fires `setThemeState()` → (3) Body `data-theme` attribute updated → (4) CSS custom properties cascade to all elements → (5) Canvas animations switch → (6) Particle layer rebuilds → (7) Audio track changes → (8) Chat personality updates → (9) POST to `/settings/theme` persists to Firestore → (10) Theme cache invalidated
- **Output**: Complete visual transformation: colors, gradients, animations, audio, AI voice
- **Dependencies**: CSS theme variables, canvas animation JS, audio files, Firestore
- **Edge Behavior**: Invalid theme names normalize to "campfire". Guest users get default. Theme cache has 5-min TTL.

### F5: AI Image Generation
- **Category**: Core Functional
- **Description**: Generate illustrations from text prompts using Hugging Face FLUX model
- **Purpose**: Add visual richness to shared canvases
- **Trigger**: Enter prompt + click "Generate AI Image"
- **Input**: Text prompt (max 500 chars)
- **Process**: (1) POST `/api/story/image` → (2) `@auth_required` check → (3) Rate limit check (5/min) → (4) POST to Hugging Face Inference API with prompt → (5) Receive raw image bytes → (6) Upload to Cloudflare R2 as JPEG → (7) Return public URL
- **Output**: Image displayed in preview panel, attachable to page
- **Dependencies**: Google sign-in, Hugging Face API key, R2 storage
- **Edge Behavior**: Missing API key returns 500. Timeout (25s) or API error returns 502. Fallback to base64 data URI if R2 unavailable. Unauthenticated users see login modal.

### F6: File Upload System
- **Category**: Core Functional
- **Description**: Upload images or audio files to cloud storage
- **Purpose**: Allow custom images on canvases and custom audio per theme
- **Trigger**: Click upload button + select file
- **Input**: File (image or audio), file type parameter
- **Process**: (1) POST `/api/upload/<type>` with multipart form → (2) Validate file type against whitelist → (3) Generate unique filename with `secrets.token_hex(8)` prefix → (4) If R2 configured: upload via boto3 S3 client → (5) Else: save to local `static/uploads/` → (6) Return public URL
- **Output**: File URL for embedding
- **Dependencies**: R2 credentials (or local filesystem)
- **Edge Behavior**: No file → 400. Wrong extension → 400. Upload failure → 502. 16MB max enforced by Flask config.

### F7: Quick Share System
- **Category**: Core Functional
- **Description**: Anonymous, temporary file sharing with automatic 48-hour physical deletion
- **Purpose**: Zero-friction temporary asset sharing without accounts
- **Trigger**: Click "Quick Share" button in file modal
- **Input**: File (any type allowed with security headers)
- **Process**: (1) Upload to Cloudflare R2 under `/quick/` prefix → (2) Metadata stored in Guest cleanup registry → (3) Content-Disposition header forced to 'attachment' for non-media types (XSS prevention) → (4) Return shareable link → (5) Cron job periodically fetches expired URLs → (6) Physical deletion from R2 bucket.
- **Output**: Temporary shareable URL
- **Dependencies**: Cloudflare R2, Firestore, System Cleanup Cron
- **Edge Behavior**: Expired files return 404. Malicious file types blocked from browser execution via headers. Physical cleanup ensures storage efficiency.

### F7: Activity Heatmap
- **Category**: Supporting
- **Description**: GitHub-style contribution graph showing writing frequency
- **Purpose**: Track writing consistency and motivate regular use
- **Trigger**: Profile page load
- **Input**: User ID, day range (default 365)
- **Process**: (1) GET `/api/activity?days=365` → (2) Query Firestore `activity` collection for user → (3) Aggregate counts per day → (4) Calculate streak (consecutive days from today) → (5) Count total entries → (6) Client renders grid with 5 intensity levels
- **Output**: Visual heatmap + stats (pages, streak, active days)
- **Dependencies**: Activity increment on save, Firestore
- **Edge Behavior**: Missing data shows empty cells. Max 730 days. Min 7 days.

### F8: Ambient Audio System
- **Category**: Personalization
- **Description**: Looping ambient soundscapes per theme with custom upload support
- **Purpose**: Enhance immersion with atmospheric audio
- **Trigger**: Sound toggle button or theme change
- **Input**: Theme ID, custom audio URL (optional)
- **Process**: (1) Check `localStorage` for enabled state + playback position → (2) Determine audio source: custom URL > default WAV → (3) Load and play with seek to saved position → (4) Save position every 250ms to localStorage → (5) On theme change: restart from beginning → (6) On page unload: persist position
- **Output**: Continuous ambient audio across page navigations
- **Dependencies**: Audio files, localStorage, user audio settings in Firestore
- **Edge Behavior**: Autoplay blocked → show "click Sound to start". Blob URLs cleaned from localStorage.
