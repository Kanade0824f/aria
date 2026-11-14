---
name: aria-dev
description: >-
  Use this skill when the user wants to develop, debug, extend, or maintain the aria. note-taking
  app located at c:\Users\Kanade\Desktop\memoria. Covers the full architecture including the
  single-file ES module app.js, CSS custom property theme system, Markdown+LaTeX rendering pipeline,
  live math WYSIWYG backspace editing, typography separation, Color Harmony Engine with RGB unlock,
  AES-256-GCM encrypted backup, GitHub Gist sync, PWA/service worker, and GitHub Actions deploy workflow.
---

# aria. Developer Skill

> **Scope:** Everything needed to develop, debug, extend, and maintain the **aria.** note-taking app at `c:\Users\Kanade\Desktop\memoria`.

---

## 1. Project Overview

**aria.** is an ultra-minimalist, offline-first, private note-taking PWA with an elegant typographic and visual aesthetic inspired by its name — an aria, an expressive musical melody.

### Zero-Build Principle
- **No bundlers, no transpilers, no npm dependencies** — runs directly as vanilla HTML5, CSS3, and ES Modules.
- Deployable directly to GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).
- Markdown, KaTeX, and Highlight.js are loaded strictly via CDN.

### Tech Stack

| Layer | Technology |
|---|---|
| Structure | Vanilla HTML5 (`index.html`) |
| Styling | Vanilla CSS3 (`css/style.css`, 2400+ lines) |
| Logic | Vanilla ES Modules (`js/app.js`, single file) |
| Markdown | [Marked.js](https://marked.js.org/) (CDN) |
| Math | [KaTeX](https://katex.org/) (CDN) |
| Syntax Highlighting | [highlight.js](https://highlightjs.org/) (CDN) |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2 100k rounds) |
| Sync | GitHub Gist REST API |
| Hosting | GitHub Pages + GitHub Actions |
| PWA | Service Worker (`sw.js`) + Web App Manifest |
| Fonts | IBM Plex Sans, Source Serif 4, IBM Plex Mono, Cormorant Garamond (Google Fonts CDN) |

### Design & Brand Identity
- **Name**: `aria.` (the trailing dot is an intentional part of the brand name).
- **App Icon (`assets/icon.svg`)**: Pure line-art drawing (純線條畫) inspired by musical acoustics and vocal melody — a flowing melodic sine wave, an echoing harmonic resonance curve, and an overtone dot. Strictly no letter "a" and no literal notebook/pen icons.
- **Lines & Spacing**: Ultra-fine 1–1.5 px lines, 8 px spacing grid, quiet and restrained whitespace.
- **No Tacky Emojis**: Strictly avoid emojis like `💡`, `🚀`, `🎯` in UI. Use elegant typographic glyphs: `✦`, `·`, `—`, `◈`.
- **No Pretentious Theme Marketing**: Pure mathematical color harmony driven by user-selected hue and saturation, rather than marketing themes.

---

## 2. Core Subsystems in `js/app.js`

The entire application lives in `js/app.js`, clearly divided into numbered sections (`// ── §N Name ──`). **Never split this into multiple files.**

### §1 Store — Persistence & Note Model
Notes are stored in `localStorage` as a JSON array under `aria_notes_v1`.
```js
{
  id: string,             // Date.now().toString(36) + random
  title: string,          // Note title
  content: string,        // Raw Markdown + LaTeX
  tags: string[],         // Tags array
  createdAt: number,      // Unix timestamp
  updatedAt: number,      // Unix timestamp
  pinned: boolean,        // Pin to top
  color: string,          // Optional card accent color
  font: string            // Optional per-note font override
}
```

### §2 I18n — Trilingual Internationalization
Complete UI translations across English (`en`), Traditional/Simplified Chinese (`zh`), and Japanese (`ja`).
- `I18n.t(key)`: Returns localized string.
- `I18n.apply()`: Scans DOM for `[data-i18n]` and updates `textContent` or `placeholder`.
- Whenever adding a UI element, all three language keys **must** be populated.

### §3 Renderer & Interactive Live Math Pipeline
Marked.js corrupts LaTeX syntax (e.g. escaping underscores or backticks), so math blocks must be protected.

#### Read-Only Markdown+LaTeX Pipeline (`Renderer.render(md)`)
```
raw markdown
  → extract display math ($$…$$, \[…\]) to __MATH_BLOCK_N__
  → extract inline math ($…$, \(…\)) to __MATH_INLINE_N__
  → marked.parse(text)
  → restore placeholders
  → katex.renderToString() with displayMode true/false
  → highlight.js code block formatting
```

#### Interactive Live Math Pipeline (`Renderer.renderLive(md)`)
In the **Live View** mode (`#live-editor`):
1. Formulas (`$...$` and `$$...$$`) are rendered into interactive `.math-live-box` DOM nodes:
   ```html
   <span class="math-live-box [display]" data-latex="E = mc^2" tabindex="0">
     <span class="math-rendered"><!-- KaTeX HTML --></span>
     <span class="math-editor hidden">
       <span class="math-delim">$</span>
       <input type="text" class="math-raw-input" value="E = mc^2" />
       <span class="math-delim">$</span>
     </span>
   </span>
   ```
2. **Clicking** the rendered formula reveals the raw LaTeX `<input>` for instant editing.
3. **Pressing Backspace** on the focused `.math-live-box` or at the boundary expands the formula code.
4. **Enter, Escape, or Blur** re-compiles the LaTeX in real-time with KaTeX and restores the visual view.
5. If the input is empty and Backspace is pressed, the entire math box is cleanly deleted.
6. `Editor.syncFromLive()` serializes DOM back into raw Markdown for autosaving.

---

## 3. Dedicated Typography Separation

To achieve professional typesetting:
1. **Code Blocks & Inline Code**:
   - Strictly forced to `var(--font-mono) !important` (JetBrains Mono / IBM Plex Mono).
   - Dedicated styling: subtle tinted background, 1px border, padded pills for inline code.
2. **Math Formulas**:
   - Rendered using KaTeX's dedicated math typefaces (`KaTeX_Main`, `KaTeX_Math`, `KaTeX_AMS !important`).
   - Formulas stand out with distinct typographic weight, never inheriting generic prose fonts.
3. **Prose & UI Text**:
   - Governed by `[data-font]` on `<html>`:
     - `sans`: IBM Plex Sans + Noto Sans SC/JP.
     - `serif`: Source Serif 4 + Noto Serif SC/JP.
     - `mono`: IBM Plex Mono.
     - `literary`: Cormorant Garamond.
     - `custom`: Dynamically assigned via `--font-custom`.

### Custom Font Engine
Users can specify ANY system or web font:
- In Settings, selecting "自訂字體 (Custom Font)" displays `#custom-font-input`.
- Inputting a font family name (e.g. `"Cinzel", "Fira Code", "Songti SC"`) dynamically sets `document.documentElement.style.setProperty('--font-custom', fontFamily)`.
- Applied seamlessly across all notes.

---

## 4. Color Harmony Engine (`ColorEngine`)

aria. replaces flowery marketing themes with a mathematical **Color Harmony Engine**:
- **Automatic Coordinated Palette**: When the user selects a primary hue or preset:
  - Generates balanced lightness and saturation curves for Background, Surface, Borders, Secondary text, and Accent.
  - Generates distinct harmonic palettes for **Light Mode** (high luminance, muted saturation) and **Dark Mode** (deep charcoal, tuned low-light contrast).
- **RGB Unlock / Custom Override**:
  - The "解鎖手動調整 (Unlock RGB Sliders)" toggle allows users to break out of automatic harmony and manually tweak R, G, B channels or direct hex values.
  - When locked, hue and preset selections re-harmonize the entire palette.

---

## 5. Encrypted Backup & Security (`CryptoBackup`)

Client-side zero-knowledge encryption ensures note privacy when backing up or migrating notes:
- **Algorithm**: `AES-256-GCM` authenticated symmetric encryption.
- **Key Derivation**: `PBKDF2` with `SHA-256`, `100,000` iterations, and cryptographically secure 16-byte random salt (`crypto.getRandomValues`).
- **Initialization Vector**: Unique 12-byte random IV per export.
- **File Format**: Encrypted `.aria` file containing a JSON envelope:
  ```json
  {
    "aria_backup": true,
    "version": 1,
    "algorithm": "AES-256-GCM",
    "kdf": "PBKDF2",
    "iterations": 100000,
    "salt": "<hex-string>",
    "iv": "<hex-string>",
    "ciphertext": "<hex-string>"
  }
  ```
- **Import**: Prompts for the decryption password via `#crypto-modal`, derives the key, decrypts and validates the JSON payload, then merges into `Store`.

---

## 6. Habit & Streak Tracker (`Streak`)

- Computes consecutive writing days by evaluating `createdAt` and `updatedAt` timestamps across all notes in local storage.
- Renders a minimal 7-day dot trail indicator in the sidebar:
  - Active days are filled with the accent color.
  - Idle days remain subtle hollow rings.
- Keeps users motivated with zero clutter or gamified distraction.

---

## 7. Cloud Sync (GitHub Gist)

- Connects to GitHub Gist REST API via user-supplied Personal Access Token (PAT with `gist` scope).
- Auto-sync debounced after changes, plus manual Push / Pull.
- Intelligent merge: matches note IDs and retains the version with the newer `updatedAt` timestamp.
- Tokens and Gist IDs are stored strictly in the user's `localStorage` and never transmitted elsewhere.

---

## 8. Development & Maintenance Guidelines

### Verification Commands
Always verify syntax after editing `js/app.js`:
```powershell
node -c js/app.js
```

### Git Commits
Stage changes and commit with concise, descriptive commit messages:
```powershell
git add -A
git commit -m "feat: [brief description]"
```

### Static Testing Server
To test locally without external tooling:
```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path'),mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml'};http.createServer((req,res)=>{let f=path.join('.',req.url.split('?')[0]);try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');const d=fs.readFileSync(f);res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});res.end(d)}catch(e){res.writeHead(404);res.end('Not Found')}}).listen(3333,()=>console.log('Server running on 3333'))"
```
Navigate to `http://localhost:3333`.
