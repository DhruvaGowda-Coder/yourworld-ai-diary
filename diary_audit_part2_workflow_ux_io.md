# YourWorld — Complete System Audit Report (Part 2)
## System Workflow, User Journeys, I/O Matrix & UI/UX Breakdown

---

## STEP 4: SYSTEM WORKFLOW (END-TO-END)

### Entry Point
1. User navigates to `https://worldbyyou.com/`
2. DNS resolves → Render hosting → Gunicorn (4 workers, gthread, 4 threads each)
3. `ProxyFix` processes proxy headers
4. `enforce_https()` redirects HTTP → HTTPS (production)
5. CSP nonce generated per request (`secrets.token_urlsafe(16)`)

### Initialization Steps
6. Flask loads `.env` via `python-dotenv`
7. Firebase Admin SDK initializes (JSON env var or local file)
8. Extensions attach: `csrf.init_app(app)`, `limiter.init_app(app)`
9. Three Blueprints registered: `main_bp`, `auth_bp`, `api_bp`
10. Context processor injects: `current_user`, `is_guest_user`, `current_theme`, `firebase_config`, `csp_nonce`

### Main Interaction Loop (Page Load)
11. Browser loads `base.html` → CSS (6 files) → JS (5 files, deferred)
12. Service Worker registers (if supported)
13. `core.js`: CSRF token extraction, theme state init, day/night cycle sync
14. `animations.js`: Canvas-based visual effects start for active theme
15. `theme.js`: Ambient audio loads from saved position, nav link highlighting
16. `editor.js`: If on `/diary` or `/story` → fetch entries → load last entry → render sidebar
17. `chat.js`: Chat panel event bindings (open, close, drag, resize, submit)

### Decision Points
- **Is user signed in?** → Show profile/logout links, enable AI features
- **Is user a guest?** → Show sign-in button, show guest warning, restrict AI
- **Entry type?** → Diary (no sharing/images) vs. Story (full feature set)
- **Has entries?** → Load last entry vs. create blank
- **Has share code?** → Show active code, enable copy/remove
- **Autosave enabled?** → Schedule 2500ms debounced saves
- **Sound enabled?** → Auto-play ambient audio from saved position

### Output Generation
- HTML rendered server-side via Jinja2 templates
- Dynamic data fetched client-side via fetch API (entries, activity, AI responses)
- Images generated via Hugging Face → stored in R2 → URL returned to client
- Share codes generated server-side → stored in Firestore

### Exit/Termination
- User clicks Logout → `session.clear()` → redirect to index
- Browser close → `beforeunload` saves audio position to localStorage
- Guest sessions expire naturally (48h cleanup via cron)
- Server shutdown → Gunicorn graceful worker restart (max-requests: 1000)

---

## STEP 5: USER JOURNEY MAPPING

### Journey 1: Beginner User
- **Goal**: Try the platform, write a quick note
- **Steps**:
  1. Lands on homepage → sees "Share content using private codes" hero
  2. Clicks "Create and share code" button
  3. Redirected to `/story` → auto-assigned guest session (`guest_<hex>`)
  4. Sees guest warning banner: "Sign in to ensure your drafts are permanently saved"
  5. Types in title field → types content
  6. Autosave triggers after 2500ms of inactivity → "Autosaved" flash
  7. Tries "Generate AI Image" → sees login prompt modal
  8. Clicks "Not right now" → continues writing
  9. Clicks "Random Code" → code generated → displayed in share panel
  10. Copies code → shares with friend
- **System Response**: Guest data persisted in Firestore with `guest_` prefix. Cleaned after 48 hours if unused.
- **Final Outcome**: Content created and shared without sign-in. AI features blocked.

### Journey 2: Regular User
- **Goal**: Write daily entries, customize experience, share a story
- **Steps**:
  1. Clicks "Sign In" → Google OAuth flow → redirected to `/diary`
  2. Writes private note → saves → navigates to next page (Ctrl+→)
  3. Creates new note (Ctrl+N) → writes → autosave handles persistence
  4. Goes to Settings → selects "Crystal Frost" (ice) theme → Apply
  5. Entire UI transforms: colors, animations, audio change
  6. Uploads custom song for ice theme via Settings → Audio section
  7. Goes to `/story` → writes story → generates AI image with prompt
  8. Inserts image into page → drags/resizes to position
  9. Generates custom share code "MY-STORY-2026" → enables edit permission
  10. Checks Profile → sees heatmap, streak count
- **System Response**: All data persisted to Firestore. Images stored in R2. Theme cached 5 minutes.
- **Final Outcome**: Personalized workspace, AI-enhanced content, shared with editable access.

### Journey 3: Advanced User
- **Goal**: Manage multi-page story, control sharing, use keyboard shortcuts
- **Steps**:
  1. Signs in → goes to `/story`
  2. Creates 10+ pages using Ctrl+N, navigates with Ctrl+←/→
  3. Formats text: Ctrl+B for bold titles, adjusts font size via dropdown
  4. Generates multiple AI images, positions them per page
  5. Opens Aura (Ctrl+K) → asks for story structure help
  6. Aura provides theme-aware advice (ice theme = clear/precise style)
  7. Generates share code → toggles between "Full canvas" and "Single page" modes
  8. Toggles "Allow code holders to edit" → collaborator edits via public view
  9. Public view auto-refreshes every 3.5s to show collaborator changes
  10. Removes share code when done → content returns to private
  11. Uses "Load more pages" to browse older entries
  12. Downloads AI image as PNG for external use
- **System Response**: Pagination handles large entry counts. Rate limits protect AI endpoints. Trust boundary enforces non-owner edit restrictions.
- **Final Outcome**: Complete content lifecycle: create → format → illustrate → share → collaborate → revoke.

### Journey 4: Quick Share User
- **Goal**: Send a large or temporary file to a friend without an account
- **Steps**:
  1. Lands on homepage → clicks "Quick Share" (or opens file modal in editor)
  2. Selects "Quick Share" mode
  3. Uploads a 10MB PDF or Image
  4. Receives a secure link: `https://worldbyyou.com/api/quick/view/<id>`
  5. Friend opens link → file downloads directly (Content-Disposition: attachment)
  6. File persists for 48 hours then vanishes from R2 storage
- **System Response**: File stored in isolated `/quick/` R2 bucket. Metadata registered for cron cleanup.
- **Final Outcome**: High-speed, anonymous file transfer completed in seconds.

---

## STEP 6: INPUT / OUTPUT MATRIX

### INPUTS

#### User Inputs
| Input | Location | Format | Constraints |
|-------|----------|--------|-------------|
| Note/canvas title | Title input field | Plain text | Max ~150 chars (server trim) |
| Note/canvas content | Content textarea | Plain text (HTML sanitized) | Max 100KB UTF-8 |
| Image prompt | Image prompt input | Plain text | Max 500 chars |
| Custom share code | Share code input | Alphanumeric + `-_.~` | 4-32 chars, regex validated |
| Theme selection | Radio buttons (settings) | Theme ID string | Must be in `THEME_OPTIONS` set |
| Audio file | File upload input | Audio file | `.mp3/.wav/.ogg/.m4a/.flac` |
| Image file | File upload input | Image file | `.png/.jpg/.jpeg/.gif/.webp` |
| Chat message | Chat text input | Plain text | Non-empty |
| Font size | Dropdown select | Float string | `0.9/1.05/1.25/1.45/1.75` |
| Autosave toggle | Checkbox | Boolean | On/Off |
| Can-edit toggle | Checkbox | Boolean | On/Off |
| Share mode | Menu select | `story` or `single` | Two options |
| Bold/Italic/Underline | Toggle buttons | Boolean each | Per title or content |
| Chat file attachment | File upload input | Multiple files | images, PDFs, code, markdown, archives |
| Quick Share file | Drag-and-drop / file picker | Any file | Max 10MB |

#### System Inputs
| Input | Source | Purpose |
|-------|--------|---------|
| Session ID | Flask session cookie | User identification |
| CSRF token | Meta tag / hidden input | Request validation |
| CSP nonce | `g.csp_nonce` (per request) | Script authorization |
| Current time (UTC) | `datetime.now(timezone.utc)` | Timestamps, day/night cycle |
| Request headers | HTTP | HTTPS enforcement, rate limiting |
| `localStorage` keys | Browser | Audio state, autosave pref, custom audio |

#### External Inputs
| Input | Source | Purpose |
|-------|--------|---------|
| Google user profile | Google OAuth API | User identity (uid, email, name, picture) |
| AI chat response | Groq API (LLaMA 3.1) | Chat reply generation |
| AI image bytes | Hugging Face API (FLUX) | Image generation |
| Firestore documents | Firebase Admin SDK | Entry/user/activity data |
| R2 object URLs | Cloudflare R2 | File storage URLs |
| Quick Share Upload | File Upload | Anonymous binary data |
| Cleanup Registry | System Cron | List of expired URLs |

### OUTPUTS

#### Visual Outputs
| Output | Description |
|--------|-------------|
| Rendered HTML pages | Server-rendered templates with theme-specific styling |
| Themed UI | Colors, gradients, animations matching selected element |
| Canvas animations | Per-theme visual effects (fire, water, wind particles, etc.) |
| Chat bubbles | User and bot messages in floating panel |
| Image preview | Generated or uploaded image in sidebar panel |
| Page illustration | Image embedded in canvas page area |
| Activity heatmap | 365-day grid with 5 intensity levels |
| Status indicators | Save status, page count, timestamps |
| Share code display | Active code in status bar and share panel |
| Login prompt modal | Animated modal for gated features |
| Page-turn animation | CSS transition on entry navigation |
| Toast-like status feedback | Color flash on save status text |

#### Data Outputs
| Output | Destination | Format |
|--------|-------------|--------|
| Entry document | Firestore `entries` collection | JSON (title, content, styles, image, share) |
| User document | Firestore `users` collection | JSON (email, name, theme, audio prefs) |
| Activity document | Firestore `activity` collection | JSON (user_id, day, count) |
| Uploaded files | Cloudflare R2 bucket | Binary (image/audio) |
| JSON API responses | HTTP response | `{id, title, updated_at, ...}` |
| Share URL | Clipboard / display | `https://worldbyyou.com/view/<code>` |
| Sitemap XML | `/sitemap.xml` | XML (7 URL entries) |
| robots.txt | `/robots.txt` | Plain text |
| Quick Share Link | UI / Clipboard | `https://worldbyyou.com/api/quick/view/<id>` |
| Physical Deletion | R2 API | Object removal |

#### Behavioral/System Changes
| Change | Trigger |
|--------|---------|
| Session creation | First visit (guest) or Google sign-in |
| Theme cache invalidation | Theme change |
| Audio source switch | Theme change or custom upload |
| Entry list re-render | Save, delete, or navigation |
| Share code activation | Code generation |
| Activity counter increment | Every save operation |
| Service Worker cache update | New deployment (cache version change) |

---

## STEP 7: UI/UX BREAKDOWN

### Layout Structure
```
┌──────────────────────────────────────────────────┐
│ HEADER: Logo | Share Code Input | Nav Links      │
│         Home | Canvas | Notes | Settings |       │
│         Profile | Sign In/Logout                 │
├──────────────────────────────────────────────────┤
│ AMBIENT LAYERS (behind content):                 │
│   .ambient-bg | .theme-motion-a/b/c              │
│   #themeParticleLayer | Per-theme <canvas>        │
├──────────────────────────────────────────────────┤
│ MAIN CONTENT:                                    │
│ ┌────────────┬───────────────────────────────┐   │
│ │  SIDEBAR   │  BOOK AREA                    │   │
│ │  Entry list│  Status bar (save/autosave)   │   │
│ │  New/Delete│  Editor toolbar (B/I/U/Size)  │   │
│ │  ──────────│  ┌─────────────────────────┐  │   │
│ │  (Story    │  │  PAGE                   │  │   │
│ │   only):   │  │  Title input            │  │   │
│ │  Image     │  │  Content textarea       │  │   │
│ │  panel     │  │  [Illustration]         │  │   │
│ │  Share     │  └─────────────────────────┘  │   │
│ │  panel     │  Page controls (Prev/Next)    │   │
│ └────────────┴───────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│ FOOTER: Brand | Legal links | Sound toggle |     │
│         Theme indicator                          │
├──────────────────────────────────────────────────┤
│ FLOATING ELEMENTS:                               │
│   Chat launch button (bottom-right)              │
│   Chat panel (draggable, resizable)              │
│   Image modal (fullscreen overlay)               │
│   Login prompt modal (centered overlay)          │
│   Mobile drawer (slide-in from right)            │
│   Ambient audio <audio> (hidden)                 │
└──────────────────────────────────────────────────┘
```

### Key Interface Elements
1. **Book metaphor**: Content displayed in a "page" container with page-turn animations
2. **Entry sidebar**: Scrollable list of entries, active item highlighted, "Load More" at bottom
3. **Editor toolbar**: Formatting buttons with active state indicators
4. **Status bar**: Real-time save status, page counter, timestamp
5. **Image panel** (story only): Prompt input, generate/upload buttons, preview with clear button
6. **Share panel** (story only): Code display, custom code input, mode selector, permission toggle
7. **Chat panel**: Floating, draggable, resizable panel with message bubbles
8. **Heatmap** (profile): 365-day grid with tooltip per cell

### Navigation Flow
```
Homepage ──→ Story (Create & Share)
         ──→ Diary (Private Notes)
         ──→ Settings (Theme & Audio)
         ──→ Profile (Stats & Heatmap)
         ──→ Login (Google OAuth)
         ──→ /view/<code> (Public viewer)
         ──→ About / FAQ / Privacy / Terms
```

### Interaction Patterns
| Pattern | Element | Behavior |
|---------|---------|----------|
| Click | Entry sidebar item | Save current, load selected entry |
| Click | Theme tile | Preview theme, select radio |
| Click | Chat launch | Open floating panel, show greeting |
| Hover | Theme tile (settings) | Preview theme atmosphere |
| Toggle | Autosave checkbox | Enable/disable debounced saves |
| Toggle | Sound button | Play/pause ambient audio |
| Drag | Chat panel header | Reposition panel |
| Drag | Image illustration | Reposition on page |
| Resize | Chat panel corner handle | Resize with aspect ratio lock |
| Resize | Image resize handle | Resize illustration |
| Keyboard | Ctrl+S/N/D/B/I/U/K/←/→ | Shortcuts for common actions |
| Paste | Content textarea | HTML stripped, plain text inserted |
| Double-click delete | Song library item | First click shows "Confirm?", second deletes |
| Drag & drop | Quick Share modal | Drag file onto modal to initiate upload |
| Copy | Quick Share result | One-click copy of share link to clipboard |

### Feedback Mechanisms
| Mechanism | Description |
|-----------|-------------|
| Save status text | "Ready" → "Editing..." → "Saving..." → "Autosaved" with color flash |
| Page count | "Page X of Y" updates on navigation |
| Button disable states | Buttons disabled during async operations, re-enabled after |
| Chat typing indicator | "Thinking..." bubble while awaiting AI response |
| Image generation | Button text changes to "Generating..." during API call |
| Upload progress | Button text changes to "..." during upload |
| Share code validation | Error hint text below custom code input |
| Guest warning banner | Persistent yellow-bordered banner on story page |
| Login modal animation | Scale-in animation with backdrop blur |
| Sound toggle icon | 🔊/🔇 emoji changes, pulse highlight if autoplay blocked |
| Theme tone | WebAudio sine waves play on theme selection |
| Copy confirmation | "Copy" button temporarily shows "Copied" |
