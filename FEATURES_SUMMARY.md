# YourWorld — Features Executive Summary

A concise overview of the premium features and capabilities of the YourWorld platform.

---

### 🚀 1. Core Sharing & Privacy
*   **Zero-Login Onboarding**: Create and share content instantly as a guest. No account required.
*   **Private Code Access**: Content is never indexed by search engines. Access is granted only via unique, high-entropy codes (Random or Custom).
*   **Quick Share (Ephemeral Files)**: Anonymous file sharing with human-readable codes (e.g. `FIRE-A3C2D1`). Files auto-expire after 48 hours and are physically deleted from storage.
*   **Quick Delete**: Users can instantly delete Quick Share files at any time using a secure delete token.
*   **Dual Modes**:
    *   **Diary**: 100% private personal workspace.
    *   **Shared Canvas**: Collaborative multi-page storyboards with optional "Allow Edit" permissions.

### 🧠 2. AI-Powered Tools
*   **Aura Writing Assistant**: A theme-aware AI companion (Groq LLaMA 3.1) that helps brainstorm, edit, and format content with full page context awareness.
*   **Multi-Session Chat**: Persistent chat history with cross-device sync. Create, switch between, and delete sessions.
*   **File Attachments in Chat**: Upload images, PDFs, code files, markdown, and archives directly into Aura conversations.
*   **AI Image Generation**: Built-in FLUX model (Hugging Face) to generate high-quality illustrations from text prompts directly into stories.
*   **Auto-Title Generation**: Smart extraction of titles from your content to keep your workspace organized.
*   **Markdown & Code Rendering**: Aura responses rendered with Marked.js, sanitized with DOMPurify, and syntax-highlighted with Prism.js.

### 🎭 3. Immersive Experience
*   **9 Elemental Themes**: Complete UI transformation across 9 elements (Campfire, Water, Wind, Earth, Ice, Storm, Space, Garden, Cherry Blossom).
*   **Ambient Soundscapes**: Procedurally generated, looping audio for each theme to enhance focus and creativity. Custom audio upload supported.
*   **Dynamic Visuals**: Theme-specific canvas animations and particle layers that bring your writing environment to life.
*   **Day/Night Cycle**: UI automatically adjusts its atmosphere based on the time of day.

### 🛠️ 4. Premium Editor & UX
*   **Rich Text Formatting**: Full support for Bold, Italic, Underline, and multiple font sizes.
*   **Multi-Image Pages**: Up to 10 draggable and resizable image illustrations per page.
*   **Reliable Autosave**: 2.5s debounced saves with content hashing (60 req/min rate limit for stability).
*   **Writing Activity Heatmap**: GitHub-style contribution graph to track your writing consistency and streaks.
*   **Keyboard Shortcuts**: Full suite of Power-User shortcuts (Ctrl+S, Ctrl+K, Ctrl+N, etc.) for high-speed productivity.
*   **Quick Share Modal**: Drag-and-drop file upload with progress bar and one-click link copying.

### 🛡️ 5. Production Security
*   **Hardened Infrastructure**: CSRF protection, strict CSP headers (with nonce), and multi-layered XSS sanitization (bleach).
*   **File Validation**: Triple-layer security — extension whitelist, MIME type check, and magic-byte signature verification.
*   **XSS Mitigation**: Non-media files served with forced `Content-Disposition: attachment` to prevent browser execution.
*   **Cloudflare R2 Integration**: High-speed, secure global object storage for all media and quick-share files.
*   **Automated Cleanup**: Orphaned guest data and expired Quick Share files physically deleted from R2 via cron job.

### 📈 6. SEO & AEO (Answer Engine Optimization)
*   **Rich Structured Data**: JSON-LD schemas for Organization, WebSite, SoftwareApplication, Service, HowTo, FAQPage, and Speakable.
*   **20+ Sitemap Entries**: Including competitive keyword landing pages and competitor comparison pages.
*   **Per-Bot Robots.txt**: Granular crawl rules for Googlebot, Bingbot, and PerplexityBot.
*   **Dynamic OG/Twitter Tags**: Per-page meta tags for optimal social sharing and AI discovery.
*   **Competitor Comparison Table**: Homepage feature matrix comparing YourWorld against Google Docs, Notion, Dontpad, Pastebin, and nologin.in.

---
*For technical implementation details, see the full 3-part Audit Reports.*
