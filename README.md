<div align="center">

# aria.

**A minimalist, elegant note-taking app**

*Write beautifully. Think clearly.*

[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-7C9885?style=flat-square)](https://pages.github.com)
[![License](https://img.shields.io/badge/license-MIT-7C9885?style=flat-square)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-ready-7C9885?style=flat-square)](manifest.json)

</div>

---

## ✨ Features

- 📝 **Markdown editor** — Write in Markdown with real-time preview
- 🔢 **LaTeX math** — Beautiful math rendering with KaTeX (`$inline$` and `$$block$$`)
- 🎨 **Syntax highlighting** — Code blocks with automatic language detection
- 🌗 **Dark mode** — Warm light and dark themes that respect your system preference
- 📂 **Folder organization** — Organize notes with nested folders and drag-to-reorder
- 🔍 **Full-text search** — Instantly find any note by content or title
- 📌 **Pin notes** — Keep important notes at the top
- 🏷️ **Tags** — Categorize notes with color-coded tags
- ☁️ **GitHub sync** — Backup and sync notes via GitHub Gists
- 📱 **PWA support** — Install as a native app, works offline
- 🌐 **Multilingual** — English, 中文, 日本語 with matching typography
- ⌨️ **Keyboard-first** — Full keyboard navigation and shortcuts
- 💾 **Local-first** — All data stored in your browser, no account required

---

## 📸 Screenshots

<div align="center">

| Light Mode | Dark Mode |
|:---:|:---:|
| *screenshot coming soon* | *screenshot coming soon* |

</div>

---

## 🚀 Quick Start

### Use Online

Visit the deployed app at your GitHub Pages URL:

```
https://<username>.github.io/<repo>/
```

### Run Locally

No build step needed — just serve the files:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Open `http://localhost:8000` in your browser.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|:---|:---|
| `Ctrl/⌘ + N` | New note |
| `Ctrl/⌘ + S` | Save note |
| `Ctrl/⌘ + F` | Search notes |
| `Ctrl/⌘ + E` | Toggle edit / preview |
| `Ctrl/⌘ + D` | Toggle dark mode |
| `Ctrl/⌘ + P` | Pin / unpin note |
| `Ctrl/⌘ + Shift + F` | New folder |
| `Ctrl/⌘ + ⌫` | Delete note |
| `Escape` | Close modal / cancel |

---

## ☁️ GitHub Sync

aria. can sync your notes to a private GitHub Gist for backup and cross-device access.

### Setup

1. Generate a [GitHub Personal Access Token](https://github.com/settings/tokens/new) with the **`gist`** scope
2. Open **Settings** (gear icon) in aria.
3. Paste your token and click **Connect**
4. Use the sync button to push/pull notes

> **Note:** Your token is stored locally in your browser and never sent anywhere except GitHub's API.

---

## 🌐 Deploy to GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Set source to **GitHub Actions**
4. The included workflow will deploy automatically on push to `main`

Or simply fork this repo and enable Pages — it works out of the box.

---

## 🛠 Tech Stack

| Layer | Technology |
|:---|:---|
| **Markup** | Vanilla HTML5 |
| **Styling** | Vanilla CSS3 (Custom Properties) |
| **Logic** | Vanilla JavaScript (ES Modules) |
| **Markdown** | [Marked](https://marked.js.org/) |
| **Math** | [KaTeX](https://katex.org/) |
| **Code** | [highlight.js](https://highlightjs.org/) |
| **Fonts** | [Google Fonts](https://fonts.google.com/) — IBM Plex, Source Serif, Cormorant Garamond |
| **Storage** | IndexedDB / localStorage |
| **Sync** | GitHub Gist API |
| **Hosting** | GitHub Pages |

> **Zero dependencies. Zero build step. Pure web.**

---

## 📁 Project Structure

```
aria.
├── index.html          # App entry point
├── css/
│   └── style.css       # All styles (themes, layout, components)
├── js/
│   └── app.js          # Application logic
├── assets/
│   └── icon.svg        # App icon
├── sw.js               # Service worker (offline support)
├── manifest.json       # PWA manifest
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Pages deployment
├── .nojekyll           # GitHub Pages config
├── LICENSE             # MIT License
└── README.md           # This file
```

---

## 📄 License

[MIT](LICENSE) © 2024 aria. contributors

---

<div align="center">

*Made with quietude and care.*

**aria.**

</div>
