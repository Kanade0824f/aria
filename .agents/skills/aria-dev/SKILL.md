---
name: aria-dev
description: >-
  Use this skill when the user wants to develop, debug, extend, or maintain the aria. note-taking
  app located at c:\Users\Kanade\Desktop\memoria. Covers the full architecture including the
  single-file ES module app.js, CSS custom property theme system, Markdown+LaTeX rendering pipeline,
  GitHub Gist sync, PWA/service worker, and GitHub Actions deploy workflow.
---

# aria. Developer Skill

> **Scope:** Everything needed to develop, debug, extend, and maintain the **aria.** note-taking app at `c:\Users\Kanade\Desktop\memoria`.

---

## 1. Project Overview

**aria.** is a minimalist, offline-capable note-taking PWA built with **zero build tooling** — no bundler, no framework, no transpiler. It runs directly in any modern browser and can be deployed as a static site via GitHub Pages.

### Tech Stack

| Layer | Technology |
|---|---|
| Structure | Vanilla HTML5 (`index.html`) |
| Styling | Vanilla CSS3 (`css/style.css`, 2200+ lines) |
| Logic | Vanilla ES Modules (`js/app.js`, single file) |
| Markdown | [Marked.js](https://marked.js.org/) (CDN) |
| Math | [KaTeX](https://katex.org/) (CDN) |
| Syntax Highlighting | [highlight.js](https://highlightjs.org/) (CDN) |
| Sync | GitHub Gist REST API |
| Hosting | GitHub Pages + GitHub Actions |
| PWA | Service Worker (`sw.js`) + Web App Manifest |
| Fonts | IBM Plex Sans, Source Serif 4, IBM Plex Mono, Cormorant Garamond (Google Fonts CDN) |

### Design Philosophy

- **Minimalist line-based design** — 1–1.5 px strokes, warm muted palette, generous whitespace
- **8 px spacing grid** — all margins, paddings, and gaps are multiples of 8 px
- **Subtle animations** — 200–300 ms transitions only; no gratuitous motion
- **Multilingual first** — full UI strings in English, Simplified Chinese, and Japanese

---

## 2. Architecture Map — `js/app.js`

The entire application lives in one file, divided into clearly commented sections (`// ── §N Name ──`). Never split this into multiple files.

### §1 Store — `localStorage` CRUD

Responsible for all persistence. Notes are stored as a JSON array under a namespaced key. Provides:
- `Store.getAll()` — returns all notes sorted by `updatedAt` desc
- `Store.get(id)` — returns a single note by ID
- `Store.save(note)` — upserts (create or update) a note
- `Store.delete(id)` — removes a note
- `Store.export()` / `Store.import(json)` — bulk IO helpers

All note objects have the shape:
```js
{ id, title, content, tags, createdAt, updatedAt, pinned, color, font }
```

### §2 I18n — Internationalization

Holds a `translations` map keyed by locale (`en`, `zh`, `ja`). Every user-visible string must have an entry in all three locales.

- Active locale is stored in `localStorage` and read at boot
- `I18n.t(key)` returns the translated string for the active locale
- `I18n.apply()` updates all DOM elements with `[data-i18n]` attributes
- When adding a new string, **always** add it to all three locale objects

### §3 Renderer — Markdown + LaTeX Pipeline

The most critical section. The pipeline is:

```
raw content
  → extract LaTeX blocks ($$…$$, $…$, \[…\], \(…\))  ← PROTECT
  → run Marked.js on the remaining Markdown
  → restore LaTeX placeholders
  → render each placeholder with KaTeX
  → pass code blocks to highlight.js
```

**The math-protection step is non-negotiable.** Marked.js would corrupt LaTeX syntax (escaping underscores, backtick-wrapping, etc.) if math were not extracted first. When touching the Renderer:
- Never reorder the extract → render → reinsert steps
- Never pass raw LaTeX through `marked()`
- Always test with both inline (`$...$`) and display (`$$...$$`) math after changes

### §4 Editor — Textarea, Toolbar, View Modes, Resize Handle

Manages the note editing experience:
- **View modes:** `edit` (textarea only), `split` (side-by-side), `preview` (rendered only)
- **Toolbar:** bold, italic, code, link, heading, list, math, HR buttons — each wraps/inserts Markdown syntax into the textarea at the cursor
- **Resize handle:** a draggable divider between editor and preview panes in split mode
- **Auto-save:** debounced `Store.save()` on every `input` event (300 ms debounce)
- **Word/char count:** updated live in the status bar

### §5 GitHubSync — Gist API Push/Pull/Merge

Implements cloud backup via a private GitHub Gist:
- Token and Gist ID stored in `localStorage` (never committed to source)
- `GitHubSync.push()` — serialises all notes to JSON, PATCHes the Gist
- `GitHubSync.pull()` — fetches Gist, parses JSON, merges by `updatedAt` (newest wins)
- `GitHubSync.merge(remote, local)` — the merge algorithm; deduplicates by ID
- Status indicator in the sidebar reflects last sync time and error state

### §6 CountdownManager

Tracks notes that contain a special `<!-- countdown: ISO8601 -->` frontmatter directive. Renders a live countdown badge on matching note cards. Cleaned up on note deletion.

### §7 Toast

Lightweight notification system. `Toast.show(message, type)` where `type` is `'success'`, `'error'`, or `'info'`. Toasts stack vertically, auto-dismiss after 3 s, and support manual close.

### §8 ContextMenu

Right-click / long-press context menu for note cards. Items: Pin/Unpin, Duplicate, Export, Delete. Positioned relative to cursor; dismissed on outside click or Escape.

### §9 Appearance / ColorEngine

- `Appearance` — manages dark/light mode toggle (flips `[data-dark]` on `<html>`) and font variant (flips `[data-font]` on `<html>`)
- `ColorEngine.applyAccent(r, g, b)` — programmatically rewrites every `--accent-*` CSS custom property on `:root` using the provided RGB values, enabling the user-selectable accent colour picker without any page reload

### §10 IO — Import / Export

- **Export:** serialises notes to JSON and triggers a browser download; also supports per-note Markdown export
- **Import:** accepts a JSON file, validates structure, merges via `Store.import()`

### §11 App — Bootstrap & Event Binding

The top-level controller. `App.init()` is the entry point called at the bottom of the file (never inside a module export — the file is a plain script tag with `type="module"`).

Key responsibilities:
- Render the initial note list
- Bind all UI events (`App.bindEvents()`)
- Register the Service Worker
- Apply saved theme/font/locale preferences

### Streak — Day Streak Tracker

A small utility that reads note `createdAt`/`updatedAt` timestamps to compute consecutive days of activity. Displayed as a flame badge in the sidebar. Resets if no note is modified for 24 h.

---

## 3. Key Design Rules

These rules are **mandatory**. Violating them will break the app or the aesthetic.

### Code Rules

| Rule | Rationale |
|---|---|
| **Never break the math-protection pipeline** | Marked.js corrupts LaTeX — the extract→render→reinsert order is load-bearing |
| **Keep everything in `js/app.js`** | Zero-build principle; no bundler means no `import` resolution |
| **No `import` / `export` statements** | The file is loaded as `<script type="module">` for top-level `await` only; internal structure uses `const` modules (plain objects/closures) |
| **Run `node -c js/app.js` after every JS edit** | Catches syntax errors before the browser does |
| **`git commit` after each meaningful change** | Keeps history granular and reversible |

### Aesthetic Rules

| Rule | Rationale |
|---|---|
| **No hardcoded hex values in CSS** | All colours must reference `--accent`, `--bg`, `--text`, etc. |
| **No emoji in UI text** | Breaks the elegant, typographic aesthetic |
| **No framework dependencies** | Preserves the zero-build, zero-dependency principle |
| **8 px spacing grid** | All padding/margin values must be multiples of 8 px |
| **Transitions 200–300 ms only** | Slower feels sluggish; faster feels jarring |

---

## 4. CSS Architecture — `css/style.css`

The stylesheet is ~2200 lines, structured as follows:

### Custom Properties (`:root`)

All design tokens are declared here. Never declare a colour anywhere else.

```css
:root {
  /* Surfaces */
  --bg: #FAFAF9;
  --bg-secondary: #F3F3F1;
  --surface: #FFFFFF;

  /* Borders */
  --border: #E8E8E6;
  --border-light: #F0F0EE;

  /* Text */
  --text: #1A1A1A;
  --text-secondary: #6B6B6B;
  --text-tertiary: #9B9B9B;

  /* Accent (overwritten dynamically by ColorEngine) */
  --accent: #7C9885;
  --accent-hover: #6B8774;
  --accent-light: #E8F0EB;

  /* Semantic */
  --danger: #C97B7B;
  --danger-light: #F5E8E8;

  /* Typography */
  --font-sans: 'IBM Plex Sans', 'Noto Sans SC', 'Noto Sans JP', system-ui, sans-serif;
  --font-serif: 'Source Serif 4', 'Noto Serif SC', 'Noto Serif JP', Georgia, serif;
  --font-mono: 'IBM Plex Mono', 'SF Mono', 'Consolas', monospace;
  --font-literary: 'Cormorant Garamond', 'Noto Serif SC', 'Noto Serif JP', serif;
  --font-code: var(--font-mono);

  /* Spacing grid (8 px base) */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
}
```

### Dark Mode — `[data-dark]` Attribute

Dark theme overrides live in `[data-dark] { … }`. `Appearance.toggleDark()` sets or removes `data-dark` on `<html>`. Never use `@media (prefers-color-scheme)` for theming — always follow the explicit attribute.

```css
[data-dark] {
  --bg: #1A1A1E;
  --bg-secondary: #222226;
  --surface: #2A2A2F;
  /* … all tokens overridden … */
}
```

### Font Variants — `[data-font]` Attribute

The editor's font family is controlled by the `data-font` attribute on `<html>`:

```css
[data-font="serif"]  .editor-textarea { font-family: var(--font-serif); }
[data-font="mono"]   .editor-textarea { font-family: var(--font-mono); }
[data-font="literary"] .editor-textarea { font-family: var(--font-literary); }
/* default (no attribute) = --font-sans */
```

### Dynamic Accent Colour — `ColorEngine.applyAccent(r, g, b)`

When the user picks a custom accent, `ColorEngine` calls:

```js
ColorEngine.applyAccent(r, g, b) {
  const root = document.documentElement.style;
  root.setProperty('--accent', `rgb(${r},${g},${b})`);
  root.setProperty('--accent-hover', /* darkened */);
  root.setProperty('--accent-light', /* lightened, low opacity */);
}
```

This overwrites the `:root` declarations inline, so it takes priority in the cascade without touching the stylesheet.

---

## 5. Adding New Features — Step-by-Step Procedure

Follow this checklist in order. Do not skip steps.

### a. Add HTML to `index.html`

- Use semantic elements (`<button>`, `<dialog>`, `<section>`, etc.)
- Add `data-i18n="your.key"` to any element that shows user-visible text
- Use BEM-style class names: `.component__element--modifier`
- Never inline styles — use CSS classes

### b. Add Translations to All 3 Locales in §2 I18n

```js
const translations = {
  en: { /* ... */ 'your.key': 'Your text here' },
  zh: { /* ... */ 'your.key': '你的文字' },
  ja: { /* ... */ 'your.key': 'あなたのテキスト' },
};
```

**All three are required.** A missing key falls back to the key string, which is visible to users.

### c. Add CSS Rules — Custom Properties Only

```css
/* Good */
.my-component { background: var(--surface); color: var(--text); border: 1px solid var(--border); }

/* Bad — never do this */
.my-component { background: #ffffff; color: #1a1a1a; }
```

Add dark-mode overrides under `[data-dark] .my-component { … }` only if the custom property override is insufficient.

### d. Add JS Logic

For a self-contained feature, add a new `const` module object near the bottom of `js/app.js`, before `App`:

```js
// ── §N MyFeature ──────────────────────────────────────────────
const MyFeature = {
  init() { /* setup */ },
  doThing() { /* logic */ },
};
```

For small additions, extend the most relevant existing section.

### e. Wire Up Events in `App.bindEvents()`

```js
App.bindEvents() {
  // ... existing bindings ...
  document.getElementById('my-button').addEventListener('click', () => MyFeature.doThing());
},
```

Call `MyFeature.init()` inside `App.init()` after all other initialisations.

### f. Verify Syntax

```powershell
node -c js/app.js
```

Must print `js/app.js is OK`. Fix any reported syntax errors before committing.

### g. Git Commit

```powershell
git add -A
git commit -m "feat: describe what you added"
```

Use conventional commit prefixes: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`.

---

## 6. GitHub Deployment

### First-Time Push

```powershell
cd c:\Users\Kanade\Desktop\memoria
git init                                   # if not already a repo
git add -A
git commit -m "feat: initial aria. commit"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

### Configure GitHub Pages

1. Go to the repository on GitHub
2. **Settings → Pages → Build and deployment → Source:** select **GitHub Actions**
3. The workflow at `.github/workflows/deploy.yml` handles the rest automatically on every push to `main`

### Deploy Workflow (`.github/workflows/deploy.yml`)

The workflow copies the static files to GitHub Pages. It requires no build step — the output is the source itself.

---

## 7. GitHub Sync Setup (Gist-Based)

### How It Works

1. The user creates a **Personal Access Token** (PAT) with the `gist` scope at `github.com/settings/tokens`
2. The token and an optional Gist ID are saved in `localStorage` via the Settings panel (never in source code)
3. On **Push:** `GitHubSync.push()` serialises all notes to a single JSON blob and PATCHes (or POSTs if no Gist ID yet) the Gist via `fetch('https://api.github.com/gists/…')`
4. On **Pull:** `GitHubSync.pull()` GETs the Gist, deserialises the JSON, and merges with local notes — newest `updatedAt` wins per note ID
5. The Gist ID is stored after first push so subsequent syncs update the same Gist

### Security Notes

- The PAT is stored only in `localStorage` of the user's own browser
- Never log, transmit, or display the token in the UI beyond the masked input field
- The Gist should be **private** (default when created via the API with a PAT)

---

## 8. Common Pitfalls

### Things You Must NEVER Do

| Anti-Pattern | Why It's Wrong |
|---|---|
| **Use emoji in UI strings** | Breaks the typographic aesthetic and CJK font rendering |
| **Add framework/library dependencies** (`npm install …`) | Violates the zero-build principle; breaks the CDN-only deployment |
| **Hardcode hex values in CSS** | Breaks dark mode and the accent colour system |
| **Add `import` / `export` statements** | The file is not processed by a bundler; they will cause runtime errors |
| **Use `document.write()`** | Deprecated, synchronous, destructive |
| **Use `innerHTML` with untrusted content** | XSS vector — always sanitise or use `textContent` / DOM methods for user data |
| **Reorder the Renderer pipeline** | Will corrupt all notes that contain LaTeX |
| **Modify `sw.js` cache list without testing offline** | Can brick the PWA offline mode |
| **Commit secrets (tokens, passwords) to git** | Never — tokens live only in `localStorage` |
| **Use `var` or non-strict patterns** | Use `const`/`let` throughout; the file is implicitly strict as a module |
| **Write transitions faster than 150 ms or slower than 400 ms** | 150 ms feels broken; 400 ms feels sluggish |
| **Use `px` for font sizes in the editor** | Use `rem` or `em` to respect user browser font preferences |

### Debugging Tips

- **Math not rendering?** Check the Renderer's placeholder extraction regex — a regex change is almost always the cause
- **Dark mode flicker on load?** The `[data-dark]` attribute must be set synchronously in a `<script>` tag in `<head>` before first paint
- **Sync failing silently?** Open DevTools Network tab — the Gist API returns descriptive error JSON; also check that the PAT has the `gist` scope
- **Service worker serving stale files?** Bump the `CACHE_VERSION` constant in `sw.js` and redeploy
- **CJK text rendering wrong font?** Ensure the Noto Sans/Serif SC and JP font weights are loaded via the Google Fonts `<link>` in `<head>`
