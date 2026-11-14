/**
 * aria. — Minimalist Note-Taking App
 * Main Application Controller (Single ES Module)
 * 
 * Architecture:
 *   1. Store          – localStorage CRUD for notes, folders, countdowns, settings
 *   2. I18n           – Trilingual support (en / zh / ja)
 *   3. Renderer       – Markdown + LaTeX rendering pipeline
 *   4. Editor         – Textarea editing, toolbar, keyboard shortcuts
 *   5. GitHubSync     – Gist-based backup & restore
 *   6. Countdowns     – Countdown timer management & display
 *   7. Toast          – Notification toasts
 *   8. ContextMenu    – Right-click actions on notes
 *   9. Theme / Font   – Appearance management
 *  10. Import / Export – File I/O
 *  11. App Init       – Bootstrap & event binding
 */

/* ═══════════════════════════════════════════════════════════════════
   §1  STORE — Data persistence via localStorage
   ═══════════════════════════════════════════════════════════════════ */

const Store = {
  // ── Keys ──────────────────────────────────────────────────────────
  KEYS: {
    notes: 'aria_notes',
    folders: 'aria_folders',
    countdowns: 'aria_countdowns',
    settings: 'aria_settings',
  },

  /** Generate a UUID v4 */
  uuid() {
    return crypto.randomUUID?.() ??
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  },

  // ── Generic helpers ───────────────────────────────────────────────
  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },

  // ── Notes ─────────────────────────────────────────────────────────
  getNotes()        { return this._get(this.KEYS.notes); },
  setNotes(notes)   { this._set(this.KEYS.notes, notes); },

  createNote(folderId = null) {
    const notes = this.getNotes();
    const note = {
      id: this.uuid(),
      title: '',
      content: '',
      folderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
    };
    notes.unshift(note);
    this.setNotes(notes);
    return note;
  },

  updateNote(id, changes) {
    const notes = this.getNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return null;
    Object.assign(notes[idx], changes, { updatedAt: new Date().toISOString() });
    this.setNotes(notes);
    return notes[idx];
  },

  deleteNote(id) {
    this.setNotes(this.getNotes().filter(n => n.id !== id));
  },

  duplicateNote(id) {
    const notes = this.getNotes();
    const src = notes.find(n => n.id === id);
    if (!src) return null;
    const dup = { ...src, id: this.uuid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    notes.unshift(dup);
    this.setNotes(notes);
    return dup;
  },

  searchNotes(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getNotes();
    return this.getNotes().filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q)
    );
  },

  // ── Folders ───────────────────────────────────────────────────────
  getFolders()          { return this._get(this.KEYS.folders); },
  setFolders(folders)   { this._set(this.KEYS.folders, folders); },

  createFolder(name) {
    const folders = this.getFolders();
    const folder = { id: this.uuid(), name, createdAt: new Date().toISOString() };
    folders.push(folder);
    this.setFolders(folders);
    return folder;
  },

  updateFolder(id, name) {
    const folders = this.getFolders();
    const f = folders.find(f => f.id === id);
    if (f) { f.name = name; this.setFolders(folders); }
    return f;
  },

  deleteFolder(id) {
    this.setFolders(this.getFolders().filter(f => f.id !== id));
    // Un-assign notes from deleted folder
    const notes = this.getNotes().map(n => n.folderId === id ? { ...n, folderId: null } : n);
    this.setNotes(notes);
  },

  // ── Countdowns ────────────────────────────────────────────────────
  getCountdowns()           { return this._get(this.KEYS.countdowns); },
  setCountdowns(countdowns) { this._set(this.KEYS.countdowns, countdowns); },

  createCountdown(name, targetDate, color) {
    const countdowns = this.getCountdowns();
    const cd = { id: this.uuid(), name, targetDate, color, createdAt: new Date().toISOString() };
    countdowns.push(cd);
    this.setCountdowns(countdowns);
    return cd;
  },

  deleteCountdown(id) {
    this.setCountdowns(this.getCountdowns().filter(c => c.id !== id));
  },

  seedIfEmpty() {
    if (this.getNotes().length > 0) return;

    const welcomeContent = `# 歡迎使用 aria.

*Write beautifully. Think clearly.*

**aria.** 是一款極簡、優雅且功能強大的個人萬能筆記應用，專為純粹的思考與記錄而設計。

---

## ✦ 多語言與極簡排版 (Multilingual Typography)

完美支援中、英、日三種語言，並可隨時切換字體風格：

- **中文**：繁簡字體清晰秀麗，適合隨手紀錄與深度長文。
- **English**: Every line and margin is carefully calibrated.
- **日本語**：静寂の中に、思考が研ぎ澄まされる。

> 💡 **提示**：點擊右下角狀態欄的字體切換鈕（如 **Sans**），可在 **Sans（無襯線）**、**Serif（精緻襯線）**、**Mono（等寬字體）** 與 **Literary（古典文藝）** 之間即時切換。

---

## ✦ 數學符號與 LaTeX (Math & LaTeX)

支援行內公式與獨立區塊公式，由 **KaTeX** 即時極速渲染：

### 行內公式
- 愛因斯坦質能轉換：$E = mc^2$
- 歐拉恆等式：$e^{i\\pi} + 1 = 0$
- 常態分佈概率密度：$f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$

### 區塊公式
高斯積分：
$$ \\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi} $$

薛丁格波動方程：
$$ i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\left[ -\\frac{\\hbar^2}{2m}\\nabla^2 + V(\\mathbf{r}, t) \\right] \\Psi(\\mathbf{r}, t) $$

---

## ✦ 重要事情倒計時 (Countdowns)

在左側欄的 **「倒數計時」** 區塊，點擊「+」即可為重要事件建立專屬倒數：
- 專案 Deadline
- 重要考試或發表會
- 紀念日與倒數

倒計時進度條隨時間推進，精確計算天、時、分、秒，提醒你把握每分每秒。

---

## ✦ 待辦事項清單 (Interactive Checklist)

- [x] 體驗極簡線條介面與質感配色
- [x] 嘗試切換編輯 (Edit)、雙欄對照 (Split) 與預覽 (Preview) 模式
- [x] 試試用鍵盤快捷鍵：Ctrl+B 粗體、Ctrl+I 斜體、Ctrl+S 儲存、Ctrl+N 新增
- [ ] 點擊側邊欄底部的設定圖示，輸入 GitHub Token 啟用跨裝置雲端同步
- [ ] 透過 GitHub Actions 自動部署到 GitHub Pages 給自己隨時使用

---

## ✦ 程式碼語法高亮 (Code Highlighting)

\`\`\`typescript
interface NoteApp {
  name: 'aria.';
  aesthetic: 'Minimalist Line Art';
  offlineReady: true;
  sync: 'GitHub Gist API';
  features: ['Markdown', 'LaTeX', 'Multilingual', 'Countdowns'];
}

const myNoteApp: NoteApp = {
  name: 'aria.',
  aesthetic: 'Minimalist Line Art',
  offlineReady: true,
  sync: 'GitHub Gist API',
  features: ['Markdown', 'LaTeX', 'Multilingual', 'Countdowns'],
};

console.log('Welcome to aria.');
\`\`\`

---

> 「删繁就简三秋树，领异标新二月花。」
`;

    const sampleNote = {
      id: this.uuid(),
      title: '歡迎使用 aria. — 極簡萬能筆記',
      content: welcomeContent,
      folderId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: true,
    };
    this.setNotes([sampleNote]);

    // Sample folder
    const sampleFolder = {
      id: this.uuid(),
      name: '日常隨想',
      createdAt: new Date().toISOString(),
    };
    this.setFolders([sampleFolder]);

    // Sample countdown (30 days from now)
    const target = new Date();
    target.setDate(target.getDate() + 30);
    target.setHours(23, 59, 0, 0);

    const sampleCountdown = {
      id: this.uuid(),
      name: '重要目標倒數 🎯',
      targetDate: target.toISOString().slice(0, 16),
      color: '#7C9885',
      createdAt: new Date().toISOString(),
    };
    this.setCountdowns([sampleCountdown]);
  },

  // ── Settings ──────────────────────────────────────────────────────
  defaultSettings: {
    theme: 'light', font: 'sans', fontSize: 15,
    editorWidth: 720, language: 'en',
    githubToken: '', gistId: '', autoSync: false,
  },

  getSettings() {
    try {
      return { ...this.defaultSettings, ...JSON.parse(localStorage.getItem(this.KEYS.settings)) };
    } catch { return { ...this.defaultSettings }; }
  },

  saveSettings(patch) {
    const s = { ...this.getSettings(), ...patch };
    localStorage.setItem(this.KEYS.settings, JSON.stringify(s));
    return s;
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §2  I18N — Internationalization
   ═══════════════════════════════════════════════════════════════════ */

const translations = {
  en: {
    search: 'Search notes...', newNote: 'New Note', allNotes: 'All Notes',
    folders: 'Folders', countdowns: 'Countdowns', settings: 'Settings',
    githubSync: 'GitHub Sync', personalAccessToken: 'Personal Access Token',
    tokenHint: "Create a token with 'gist' scope at github.com/settings/tokens",
    gistId: 'Gist ID (optional)',
    gistIdHint: 'Leave empty to create a new Gist on first sync',
    autoSync: 'Auto Sync', appearance: 'Appearance', font: 'Font',
    fontSize: 'Font Size', editorWidth: 'Editor Width', language: 'Language',
    export: 'Export', exportMd: 'Export as Markdown', exportHtml: 'Export as HTML',
    exportAll: 'Export All Notes', data: 'Data', importNotes: 'Import Notes',
    clearAll: 'Clear All Data', newCountdown: 'New Countdown',
    eventName: 'Event Name', eventNamePlaceholder: 'e.g., Project Deadline',
    targetDate: 'Target Date', color: 'Color', save: 'Save',
    newFolder: 'New Folder', folderName: 'Folder Name',
    folderNamePlaceholder: 'e.g., Work Notes', rename: 'Rename',
    moveToFolder: 'Move to Folder', duplicate: 'Duplicate', delete: 'Delete',
    local: 'Local', saved: 'Saved', saving: 'Saving...', synced: 'Synced',
    syncing: 'Syncing...', syncError: 'Sync Error', chars: 'chars',
    untitled: 'Untitled', startWriting: 'Start writing... (Markdown & LaTeX supported)',
    emptyState: 'Select a note or create a new one',
    emptyStateHint: 'Press Ctrl+N to create a new note',
    deleteConfirm: 'Are you sure you want to delete this?',
    clearConfirm: 'This will delete all data. Continue?',
    days: 'd', hours: 'h', minutes: 'm', seconds: 's', expired: 'Expired',
    allNotesFolder: 'All', noResults: 'No notes found',
  },
  zh: {
    search: '搜尋筆記...', newNote: '新增筆記', allNotes: '全部筆記',
    folders: '資料夾', countdowns: '倒數計時', settings: '設定',
    githubSync: 'GitHub 同步', personalAccessToken: '個人存取令牌',
    tokenHint: "在 github.com/settings/tokens 建立具有 'gist' 權限的令牌",
    gistId: 'Gist ID（可選）',
    gistIdHint: '留空以在首次同步時建立新的 Gist',
    autoSync: '自動同步', appearance: '外觀', font: '字體',
    fontSize: '字體大小', editorWidth: '編輯器寬度', language: '語言',
    export: '匯出', exportMd: '匯出為 Markdown', exportHtml: '匯出為 HTML',
    exportAll: '匯出全部筆記', data: '資料', importNotes: '匯入筆記',
    clearAll: '清除所有資料', newCountdown: '新增倒數',
    eventName: '事件名稱', eventNamePlaceholder: '例：專案截止日',
    targetDate: '目標日期', color: '顏色', save: '儲存',
    newFolder: '新增資料夾', folderName: '資料夾名稱',
    folderNamePlaceholder: '例：工作筆記', rename: '重新命名',
    moveToFolder: '移至資料夾', duplicate: '複製', delete: '刪除',
    local: '本地', saved: '已儲存', saving: '儲存中...', synced: '已同步',
    syncing: '同步中...', syncError: '同步錯誤', chars: '字',
    untitled: '無標題', startWriting: '開始寫作...（支援 Markdown 和 LaTeX）',
    emptyState: '選擇一個筆記或建立新的',
    emptyStateHint: '按 Ctrl+N 建立新筆記',
    deleteConfirm: '確定要刪除嗎？',
    clearConfirm: '這將刪除所有資料。繼續？',
    days: '天', hours: '時', minutes: '分', seconds: '秒', expired: '已過期',
    allNotesFolder: '全部', noResults: '找不到筆記',
  },
  ja: {
    search: 'ノートを検索...', newNote: '新規ノート', allNotes: 'すべてのノート',
    folders: 'フォルダ', countdowns: 'カウントダウン', settings: '設定',
    githubSync: 'GitHub 同期', personalAccessToken: 'パーソナルアクセストークン',
    tokenHint: "github.com/settings/tokens で 'gist' スコープのトークンを作成",
    gistId: 'Gist ID（任意）',
    gistIdHint: '初回同期時に新しい Gist を作成するには空欄にしてください',
    autoSync: '自動同期', appearance: '外観', font: 'フォント',
    fontSize: 'フォントサイズ', editorWidth: 'エディタ幅', language: '言語',
    export: 'エクスポート', exportMd: 'Markdownとしてエクスポート',
    exportHtml: 'HTMLとしてエクスポート', exportAll: 'すべてのノートをエクスポート',
    data: 'データ', importNotes: 'ノートをインポート',
    clearAll: 'すべてのデータを消去', newCountdown: '新規カウントダウン',
    eventName: 'イベント名', eventNamePlaceholder: '例：プロジェクト締切',
    targetDate: '目標日', color: 'カラー', save: '保存',
    newFolder: '新規フォルダ', folderName: 'フォルダ名',
    folderNamePlaceholder: '例：仕事メモ', rename: '名前を変更',
    moveToFolder: 'フォルダに移動', duplicate: '複製', delete: '削除',
    local: 'ローカル', saved: '保存済み', saving: '保存中...', synced: '同期済み',
    syncing: '同期中...', syncError: '同期エラー', chars: '文字',
    untitled: '無題', startWriting: '書き始めましょう...（Markdown と LaTeX に対応）',
    emptyState: 'ノートを選択するか新規作成してください',
    emptyStateHint: 'Ctrl+N で新規ノートを作成',
    deleteConfirm: '本当に削除しますか？',
    clearConfirm: 'すべてのデータが削除されます。続行しますか？',
    days: '日', hours: '時間', minutes: '分', seconds: '秒', expired: '期限切れ',
    allNotesFolder: 'すべて', noResults: 'ノートが見つかりません',
  },
};

const I18n = {
  lang: 'en',

  t(key) { return translations[this.lang]?.[key] ?? translations.en[key] ?? key; },

  apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = this.t(el.dataset.i18nPlaceholder);
    });
  },

  setLanguage(lang) {
    this.lang = lang;
    document.documentElement.lang = lang;
    this.apply();
    Store.saveSettings({ language: lang });
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §3  RENDERER — Markdown + LaTeX rendering pipeline
   ═══════════════════════════════════════════════════════════════════ */

const Renderer = {
  _initialized: false,

  init() {
    if (this._initialized) return;
    const marked = window.marked;
    if (!marked) return;
    marked.setOptions({
      gfm: true,
      breaks: true,
      highlight(code, lang) {
        if (window.hljs && lang && window.hljs.getLanguage(lang)) {
          try { return window.hljs.highlight(code, { language: lang }).value; } catch {}
        }
        return code;
      },
    });
    this._initialized = true;
  },

  /** Render markdown string → HTML, then process LaTeX */
  render(md) {
    this.init();
    if (!md) return '';

    // Protect LaTeX blocks from Markdown parser
    const mathBlocks = [];
    let src = md;

    // Display math: $$...$$ or \[...\]
    src = src.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => {
      mathBlocks.push({ display: true, tex: a || b });
      return `%%MATHBLOCK_${mathBlocks.length - 1}%%`;
    });
    // Inline math: $...$ or \(...\)
    src = src.replace(/\$([^\$\n]+?)\$|\\\((.+?)\\\)/g, (_, a, b) => {
      mathBlocks.push({ display: false, tex: a || b });
      return `%%MATHBLOCK_${mathBlocks.length - 1}%%`;
    });

    let html = window.marked.parse(src);

    // Restore math blocks, rendered via KaTeX
    html = html.replace(/%%MATHBLOCK_(\d+)%%/g, (_, i) => {
      const { display, tex } = mathBlocks[+i];
      try {
        return window.katex.renderToString(tex.trim(), { displayMode: display, throwOnError: false });
      } catch { return tex; }
    });

    return html;
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §4  EDITOR — Textarea editing, toolbar, live preview
   ═══════════════════════════════════════════════════════════════════ */

const Editor = {
  currentNoteId: null,
  viewMode: 'edit',        // 'edit' | 'split' | 'preview'
  _saveTimer: null,
  _previewTimer: null,

  /** DOM refs (resolved once on init) */
  el: {},

  cacheElements() {
    this.el = {
      editor:       document.getElementById('editor'),
      editorPane:   document.getElementById('editor-pane'),
      previewPane:  document.getElementById('preview-pane'),
      preview:      document.getElementById('preview'),
      title:        document.getElementById('note-title'),
      charCount:    document.getElementById('char-count'),
      main:         document.getElementById('main'),
      emptyState:   document.getElementById('empty-state'),
      resizeHandle: document.getElementById('resize-handle'),
      statusSaved:  document.getElementById('status-saved'),
    };
  },

  /** Open a note for editing */
  open(noteId) {
    const note = Store.getNotes().find(n => n.id === noteId);
    if (!note) return;

    this.currentNoteId = noteId;
    this.el.title.value = note.title;
    this.el.editor.value = note.content;
    this.updateCharCount();
    this.updatePreview();
    this.showEditor(true);

    // Mark active in sidebar
    document.querySelectorAll('.note-item').forEach(el => el.classList.toggle('active', el.dataset.id === noteId));
  },

  showEditor(show) {
    this.el.main?.classList.toggle('has-note', show);
    this.el.emptyState?.classList.toggle('hidden', show);
    document.querySelector('.editor-header')?.classList.toggle('hidden', !show);
    document.querySelector('.editor-body')?.classList.toggle('hidden', !show);
    document.querySelector('.status-bar')?.classList.toggle('hidden', !show);
  },

  setViewMode(mode) {
    this.viewMode = mode;
    document.querySelectorAll('.view-toggle-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.view === mode));
    this.el.editorPane?.classList.toggle('hidden', mode === 'preview');
    this.el.previewPane?.classList.toggle('hidden', mode === 'edit');
    this.el.resizeHandle?.classList.toggle('hidden', mode !== 'split');
    if (mode !== 'edit') this.updatePreview();
  },

  updatePreview() {
    if (!this.el.editor) return;
    const html = Renderer.render(this.el.editor.value);
    this.el.preview.innerHTML = html;
    // Bind checkbox toggles in preview
    this.el.preview.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
      cb.addEventListener('change', () => this._toggleCheckbox(i, cb.checked));
    });
  },

  _toggleCheckbox(index, checked) {
    const lines = this.el.editor.value.split('\n');
    let cbIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^(\s*[-*])\s*\[([ xX])\]/.test(lines[i])) {
        if (cbIdx === index) {
          lines[i] = lines[i].replace(/\[([ xX])\]/, checked ? '[x]' : '[ ]');
          break;
        }
        cbIdx++;
      }
    }
    this.el.editor.value = lines.join('\n');
    this.scheduleSave();
    this.schedulePreview();
  },

  updateCharCount() {
    const len = (this.el.editor.value || '').length;
    this.el.charCount.textContent = `${len} ${I18n.t('chars')}`;
  },

  scheduleSave() {
    clearTimeout(this._saveTimer);
    this.setSaveStatus('saving');
    this._saveTimer = setTimeout(() => this.save(), 500);
  },

  schedulePreview() {
    clearTimeout(this._previewTimer);
    this._previewTimer = setTimeout(() => this.updatePreview(), 300);
  },

  save() {
    if (!this.currentNoteId) return;
    const title = this.el.title.value.trim();
    const content = this.el.editor.value;
    Store.updateNote(this.currentNoteId, { title, content });
    this.setSaveStatus('saved');
    App.renderNotesList();
  },

  setSaveStatus(status) {
    const dot = document.querySelector('#status-sync .status-dot');
    const label = this.el.statusSaved;
    if (dot) {
      if (status === 'saving') dot.className = 'status-dot syncing';
      else if (status === 'saved') dot.className = 'status-dot local';
    }
    if (label) {
      if (status === 'saving') label.textContent = I18n.t('saving');
      else if (status === 'saved') label.textContent = I18n.t('saved');
    }
  },

  // ── Toolbar actions ──────────────────────────────────────────────
  execAction(action) {
    const ta = this.el.editor;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.substring(start, end);
    let before = '', after = '', insert = '';

    switch (action) {
      case 'bold':      before = '**'; after = '**'; insert = sel || 'bold'; break;
      case 'italic':    before = '*';  after = '*';  insert = sel || 'italic'; break;
      case 'heading':
        // Prefix line with #
        { const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
          const line = ta.value.substring(lineStart, end);
          const match = line.match(/^(#{0,5})\s*/);
          const hashes = (match?.[1] || '').length < 5 ? '#'.repeat((match?.[1] || '').length + 1) : '#';
          const newLine = `${hashes} ${line.replace(/^#{0,5}\s*/, '')}`;
          ta.setRangeText(newLine, lineStart, end);
          ta.selectionStart = ta.selectionEnd = lineStart + newLine.length;
        }
        this.onInput(); return;
      case 'code':
        if (sel.includes('\n')) { before = '```\n'; after = '\n```'; insert = sel; }
        else { before = '`'; after = '`'; insert = sel || 'code'; }
        break;
      case 'math':
        if (sel.includes('\n')) { before = '$$\n'; after = '\n$$'; insert = sel; }
        else { before = '$'; after = '$'; insert = sel || 'x^2'; }
        break;
      case 'link':
        before = '['; after = '](url)'; insert = sel || 'text'; break;
      case 'list': {
        const lines = (sel || 'item').split('\n').map(l => `- ${l}`).join('\n');
        ta.setRangeText(lines, start, end);
        this.onInput(); return;
      }
      case 'checklist': {
        const lines = (sel || 'task').split('\n').map(l => `- [ ] ${l}`).join('\n');
        ta.setRangeText(lines, start, end);
        this.onInput(); return;
      }
      default: return;
    }

    const replacement = before + insert + after;
    ta.setRangeText(replacement, start, end);
    // Place cursor after inserted text (inside wrappers)
    ta.selectionStart = start + before.length;
    ta.selectionEnd = start + before.length + insert.length;
    ta.focus();
    this.onInput();
  },

  /** Common handler after any edit */
  onInput() {
    this.updateCharCount();
    this.scheduleSave();
    if (this.viewMode !== 'edit') this.schedulePreview();
  },

  // ── Resize handle for split view ─────────────────────────────────
  initResize() {
    const handle = this.el.resizeHandle;
    let dragging = false;
    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const area = document.querySelector('.editor-body');
      if (!area) return;
      const rect = area.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(25, Math.min(75, pct));
      this.el.editorPane.style.flex = `0 0 ${clamped}%`;
      this.el.previewPane.style.flex = `0 0 ${100 - clamped}%`;
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §5  GITHUB SYNC — Gist-based backup & restore
   ═══════════════════════════════════════════════════════════════════ */

const GitHubSync = {
  FILENAME: 'aria_notes_backup.json',
  _autoSyncInterval: null,

  _headers() {
    const token = Store.getSettings().githubToken;
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    };
  },

  async push() {
    const settings = Store.getSettings();
    if (!settings.githubToken) { Toast.show(I18n.t('syncError'), 'error'); return; }

    this.setStatus('syncing');
    const payload = {
      notes: Store.getNotes(),
      folders: Store.getFolders(),
      countdowns: Store.getCountdowns(),
      exportedAt: new Date().toISOString(),
    };

    try {
      let gistId = settings.gistId;
      const body = { description: 'aria. notes backup', public: false,
        files: { [this.FILENAME]: { content: JSON.stringify(payload, null, 2) } } };

      if (gistId) {
        // Update existing gist
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          method: 'PATCH', headers: this._headers(), body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        // Create new gist
        const res = await fetch('https://api.github.com/gists', {
          method: 'POST', headers: this._headers(), body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        gistId = data.id;
        Store.saveSettings({ gistId });
        const gistInput = document.getElementById('gist-id');
        if (gistInput) gistInput.value = gistId;
      }
      this.setStatus('synced');
      Toast.show(I18n.t('synced'), 'success');
    } catch (err) {
      console.error('Sync push error:', err);
      this.setStatus('error');
      Toast.show(`${I18n.t('syncError')}: ${err.message}`, 'error');
    }
  },

  async pull() {
    const settings = Store.getSettings();
    if (!settings.githubToken || !settings.gistId) {
      Toast.show(I18n.t('syncError'), 'error'); return;
    }
    this.setStatus('syncing');

    try {
      const res = await fetch(`https://api.github.com/gists/${settings.gistId}`, {
        headers: this._headers(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const fileContent = data.files?.[this.FILENAME]?.content;
      if (!fileContent) throw new Error('Backup file not found in Gist');

      const remote = JSON.parse(fileContent);
      this._mergeData(remote);
      this.setStatus('synced');
      Toast.show(I18n.t('synced'), 'success');
      App.renderAll();
    } catch (err) {
      console.error('Sync pull error:', err);
      this.setStatus('error');
      Toast.show(`${I18n.t('syncError')}: ${err.message}`, 'error');
    }
  },

  /** Merge: newer updatedAt wins per note; union for folders & countdowns */
  _mergeData(remote) {
    // Notes — merge by id, newer wins
    const localNotes = Store.getNotes();
    const mergedMap = new Map();
    localNotes.forEach(n => mergedMap.set(n.id, n));
    (remote.notes || []).forEach(rn => {
      const ln = mergedMap.get(rn.id);
      if (!ln || new Date(rn.updatedAt) > new Date(ln.updatedAt)) {
        mergedMap.set(rn.id, rn);
      }
    });
    Store.setNotes([...mergedMap.values()]);

    // Folders — union by id
    const folderMap = new Map();
    Store.getFolders().forEach(f => folderMap.set(f.id, f));
    (remote.folders || []).forEach(f => { if (!folderMap.has(f.id)) folderMap.set(f.id, f); });
    Store.setFolders([...folderMap.values()]);

    // Countdowns — union by id
    const cdMap = new Map();
    Store.getCountdowns().forEach(c => cdMap.set(c.id, c));
    (remote.countdowns || []).forEach(c => { if (!cdMap.has(c.id)) cdMap.set(c.id, c); });
    Store.setCountdowns([...cdMap.values()]);
  },

  setStatus(status) {
    const dot = document.querySelector('#status-sync .status-dot');
    const label = document.getElementById('status-saved');
    const map = { synced: 'synced', syncing: 'syncing', error: 'error', local: 'local' };
    if (dot) dot.className = `status-dot ${map[status] || 'local'}`;
    if (label) label.textContent = I18n.t(status) || I18n.t('local');
  },

  startAutoSync() {
    this.stopAutoSync();
    const settings = Store.getSettings();
    if (settings.autoSync && settings.githubToken) {
      this._autoSyncInterval = setInterval(() => this.push(), 5 * 60 * 1000);
    }
  },

  stopAutoSync() {
    if (this._autoSyncInterval) { clearInterval(this._autoSyncInterval); this._autoSyncInterval = null; }
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §6  COUNTDOWN MANAGER
   ═══════════════════════════════════════════════════════════════════ */

const CountdownManager = {
  _interval: null,

  render() {
    const list = document.getElementById('countdowns-list');
    const countdowns = Store.getCountdowns();
    list.innerHTML = '';

    countdowns.forEach(cd => {
      const el = document.createElement('div');
      el.className = 'countdown-item';
      el.dataset.id = cd.id;
      el.innerHTML = this._buildHTML(cd);
      // Delete on right-click
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm(I18n.t('deleteConfirm'))) {
          Store.deleteCountdown(cd.id);
          this.render();
        }
      });
      list.appendChild(el);
    });
  },

  _buildHTML(cd) {
    const remaining = this._remaining(cd.targetDate);
    const colorStyle = cd.color ? `border-left: 3px solid ${cd.color}` : '';
    return `
      <div class="countdown-info" style="${colorStyle}; padding-left: 8px;">
        <span class="countdown-name">${this._esc(cd.name)}</span>
        <span class="countdown-time">${remaining.text}</span>
        <div class="countdown-bar"><div class="countdown-bar-fill" style="width:${remaining.pct}%; background:${cd.color || 'var(--accent)'}"></div></div>
      </div>`;
  },

  _remaining(target) {
    const diff = new Date(target) - Date.now();
    if (diff <= 0) return { text: I18n.t('expired'), pct: 100 };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const parts = [];
    if (d) parts.push(`${d}${I18n.t('days')}`);
    parts.push(`${h}${I18n.t('hours')}`);
    parts.push(`${m}${I18n.t('minutes')}`);
    // Progress: assume 30-day span for bar visualisation
    const pct = Math.min(100, Math.max(0, 100 - (diff / (30 * 86400000)) * 100));
    return { text: parts.join(' '), pct };
  },

  _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },

  startTick() {
    this._interval = setInterval(() => this.render(), 1000);
  },

  stopTick() { clearInterval(this._interval); },
};


/* ═══════════════════════════════════════════════════════════════════
   §7  TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════════ */

const Toast = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    // Trigger entrance animation
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      el.addEventListener('transitionend', () => el.remove());
      // Fallback removal
      setTimeout(() => el.remove(), 500);
    }, duration);
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §8  CONTEXT MENU
   ═══════════════════════════════════════════════════════════════════ */

const ContextMenu = {
  _targetNoteId: null,

  show(e, noteId) {
    e.preventDefault();
    this._targetNoteId = noteId;
    const menu = document.getElementById('context-menu');
    if (!menu) return;

    // Position (keep within viewport)
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('active');

    // Build "Move to Folder" submenu
    this._buildFolderSubmenu();
  },

  hide() {
    const menu = document.getElementById('context-menu');
    menu?.classList.remove('active');
    this._targetNoteId = null;
  },

  _buildFolderSubmenu() {
    let sub = document.getElementById('context-folder-list');
    if (sub) sub.remove();

    const moveItem = document.querySelector('.context-menu-item[data-action="move"]');
    if (!moveItem) return;

    const folders = Store.getFolders();
    if (folders.length === 0) return;

    sub = document.createElement('div');
    sub.id = 'context-folder-list';
    sub.className = 'context-submenu';

    // "All" (no folder)
    const allOpt = document.createElement('div');
    allOpt.className = 'context-menu-item';
    allOpt.textContent = I18n.t('allNotesFolder');
    allOpt.addEventListener('click', () => { this._moveToFolder(null); });
    sub.appendChild(allOpt);

    folders.forEach(f => {
      const opt = document.createElement('div');
      opt.className = 'context-menu-item';
      opt.textContent = f.name;
      opt.addEventListener('click', () => { this._moveToFolder(f.id); });
      sub.appendChild(opt);
    });

    moveItem.style.position = 'relative';
    moveItem.appendChild(sub);
  },

  _moveToFolder(folderId) {
    if (this._targetNoteId) {
      Store.updateNote(this._targetNoteId, { folderId });
      App.renderNotesList();
    }
    this.hide();
  },

  handleAction(action) {
    const id = this._targetNoteId;
    if (!id) return;

    switch (action) {
      case 'rename': {
        const note = Store.getNotes().find(n => n.id === id);
        const name = prompt(I18n.t('rename'), note?.title || '');
        if (name !== null) {
          Store.updateNote(id, { title: name });
          App.renderNotesList();
          if (Editor.currentNoteId === id) Editor.el.title.value = name;
        }
        break;
      }
      case 'move':
        // Handled by submenu; do nothing on direct click
        return;
      case 'duplicate': {
        const dup = Store.duplicateNote(id);
        if (dup) { App.renderNotesList(); Editor.open(dup.id); }
        break;
      }
      case 'delete':
        if (confirm(I18n.t('deleteConfirm'))) {
          Store.deleteNote(id);
          App.renderNotesList();
          if (Editor.currentNoteId === id) {
            Editor.currentNoteId = null;
            Editor.showEditor(false);
          }
        }
        break;
    }
    this.hide();
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §9  THEME & FONT MANAGEMENT
   ═══════════════════════════════════════════════════════════════════ */

const Appearance = {
  applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    // Toggle highlight.js stylesheets
    const lightSheet = document.getElementById('hljs-light');
    const darkSheet = document.getElementById('hljs-dark');
    if (lightSheet) lightSheet.disabled = theme === 'dark';
    if (darkSheet) darkSheet.disabled = theme !== 'dark';
    Store.saveSettings({ theme });
  },

  toggleTheme() {
    const current = Store.getSettings().theme;
    this.applyTheme(current === 'dark' ? 'light' : 'dark');
  },

  applyFont(font) {
    document.documentElement.dataset.font = font;
    Store.saveSettings({ font });
    const label = document.getElementById('current-font-label');
    if (label) {
      const names = { sans: 'Sans', serif: 'Serif', mono: 'Mono', literary: 'Literary' };
      label.textContent = names[font] || font;
    }
    // Update selector active state
    document.querySelectorAll('.font-option').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.font === font));
  },

  applyFontSize(size) {
    document.documentElement.style.setProperty('--editor-font-size', `${size}px`);
    Store.saveSettings({ fontSize: size });
    const val = document.getElementById('font-size-value');
    if (val) val.textContent = `${size}px`;
  },

  applyEditorWidth(width) {
    document.documentElement.style.setProperty('--editor-max-width', `${width}px`);
    Store.saveSettings({ editorWidth: width });
    const val = document.getElementById('editor-width-value');
    if (val) val.textContent = `${width}px`;
  },

  cycleFont() {
    const fonts = ['sans', 'serif', 'mono', 'literary'];
    const cur = Store.getSettings().font;
    const next = fonts[(fonts.indexOf(cur) + 1) % fonts.length];
    this.applyFont(next);
  },

  cycleLang() {
    const langs = ['en', 'zh', 'ja'];
    const cur = I18n.lang;
    const next = langs[(langs.indexOf(cur) + 1) % langs.length];
    I18n.setLanguage(next);
    const label = document.getElementById('current-lang-label');
    if (label) label.textContent = next.toUpperCase();
    // Update selector active state
    document.querySelectorAll('.lang-option').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.lang === next));
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §10  IMPORT / EXPORT
   ═══════════════════════════════════════════════════════════════════ */

const IO = {
  _download(filename, content, mime = 'text/plain') {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  exportMd() {
    const note = Store.getNotes().find(n => n.id === Editor.currentNoteId);
    if (!note) return;
    const title = note.title || I18n.t('untitled');
    this._download(`${title}.md`, note.content, 'text/markdown');
  },

  exportHtml() {
    const note = Store.getNotes().find(n => n.id === Editor.currentNoteId);
    if (!note) return;
    const title = note.title || I18n.t('untitled');
    const body = Renderer.render(note.content);
    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.7;color:#1a1a1a}
pre{background:#f5f5f5;padding:1rem;border-radius:6px;overflow-x:auto}code{font-size:0.9em}
img{max-width:100%}blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:1rem;color:#666}</style>
</head><body><h1>${title}</h1>${body}</body></html>`;
    this._download(`${title}.html`, html, 'text/html');
  },

  exportAll() {
    const data = {
      notes: Store.getNotes(),
      folders: Store.getFolders(),
      countdowns: Store.getCountdowns(),
      exportedAt: new Date().toISOString(),
    };
    this._download('aria_notes_export.json', JSON.stringify(data, null, 2), 'application/json');
  },

  importFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data.notes)) {
            const existing = Store.getNotes();
            Store.setNotes([...data.notes, ...existing]);
          }
          if (Array.isArray(data.folders)) {
            const existing = Store.getFolders();
            const ids = new Set(existing.map(f => f.id));
            Store.setFolders([...existing, ...data.folders.filter(f => !ids.has(f.id))]);
          }
          if (Array.isArray(data.countdowns)) {
            const existing = Store.getCountdowns();
            const ids = new Set(existing.map(c => c.id));
            Store.setCountdowns([...existing, ...data.countdowns.filter(c => !ids.has(c.id))]);
          }
          Toast.show('Imported successfully', 'success');
          App.renderAll();
        } catch { Toast.show('Invalid JSON file', 'error'); }
      } else {
        // Import as a new note (.md / .txt)
        const title = file.name.replace(/\.(md|txt)$/, '');
        const notes = Store.getNotes();
        const note = {
          id: Store.uuid(), title, content: text, folderId: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pinned: false,
        };
        notes.unshift(note);
        Store.setNotes(notes);
        Toast.show('Imported successfully', 'success');
        App.renderNotesList();
        Editor.open(note.id);
      }
    };
    reader.readAsText(file);
  },

  clearAll() {
    if (!confirm(I18n.t('clearConfirm'))) return;
    localStorage.removeItem(Store.KEYS.notes);
    localStorage.removeItem(Store.KEYS.folders);
    localStorage.removeItem(Store.KEYS.countdowns);
    Editor.currentNoteId = null;
    Editor.showEditor(false);
    App.renderAll();
    Toast.show('Data cleared', 'success');
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §11  APP — Initialisation & event binding
   ═══════════════════════════════════════════════════════════════════ */

const App = {
  currentFolderId: null,  // null = all notes
  searchQuery: '',

  init() {
    Editor.cacheElements();

    // 1. Load settings & apply
    const settings = Store.getSettings();
    I18n.lang = settings.language;
    I18n.apply();
    Appearance.applyTheme(settings.theme);
    Appearance.applyFont(settings.font);
    Appearance.applyFontSize(settings.fontSize);
    Appearance.applyEditorWidth(settings.editorWidth);

    // Set lang label
    const langLabel = document.getElementById('current-lang-label');
    if (langLabel) langLabel.textContent = settings.language.toUpperCase();

    // 2. Seed initial sample data & render
    Store.seedIfEmpty();
    this.renderAll();

    // 3. Bind events
    this.bindEvents();

    // 4. Editor resize & initial state
    Editor.initResize();
    Editor.setViewMode('edit');
    const notes = Store.getNotes();
    if (notes.length > 0) {
      Editor.open(notes[0].id);
    } else {
      Editor.showEditor(false);
    }

    // 5. Countdowns tick
    CountdownManager.startTick();

    // 6. Auto-sync
    GitHubSync.startAutoSync();

    // 7. Service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // 8. Splash screen
    setTimeout(() => {
      const splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('fade-out');
        splash.addEventListener('transitionend', () => splash.remove());
        setTimeout(() => splash.remove(), 1000); // Fallback
      }
    }, 800);

    // 9. Populate settings modal fields
    this.populateSettings(settings);
  },

  renderAll() {
    this.renderFolders();
    this.renderNotesList();
    CountdownManager.render();
  },

  // ── Notes list ───────────────────────────────────────────────────
  renderNotesList() {
    const list = document.getElementById('notes-list');
    let notes = this.searchQuery ? Store.searchNotes(this.searchQuery) : Store.getNotes();

    // Filter by folder
    if (this.currentFolderId) {
      notes = notes.filter(n => n.folderId === this.currentFolderId);
    }

    // Sort: pinned first, then by updatedAt
    notes.sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    list.innerHTML = '';

    if (notes.length === 0) {
      list.innerHTML = `<div class="empty-notes">${I18n.t('noResults')}</div>`;
    }

    notes.forEach(note => {
      const el = document.createElement('div');
      el.className = `note-item${note.id === Editor.currentNoteId ? ' active' : ''}${note.pinned ? ' pinned' : ''}`;
      el.dataset.id = note.id;

      const title = note.title || I18n.t('untitled');
      const preview = (note.content || '').replace(/[#*`>\-\[\]]/g, '').substring(0, 80).trim();
      const date = new Date(note.updatedAt);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

      el.innerHTML = `
        <div class="note-item-title">${this._esc(title)}</div>
        <div class="note-item-preview">${this._esc(preview)}</div>
        <div class="note-item-meta">${dateStr}</div>`;

      el.addEventListener('click', () => Editor.open(note.id));
      el.addEventListener('contextmenu', (e) => ContextMenu.show(e, note.id));
      list.appendChild(el);
    });

    // Note count
    const countEl = document.getElementById('note-count');
    if (countEl) countEl.textContent = notes.length;
  },

  _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },

  // ── Folders ──────────────────────────────────────────────────────
  renderFolders() {
    const list = document.getElementById('folders-list');
    const folders = Store.getFolders();
    list.innerHTML = '';

    // "All Notes" item
    const allEl = document.createElement('div');
    allEl.className = `folder-item${!this.currentFolderId ? ' active' : ''}`;
    allEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v13h18V7"/><path d="M3 7l3-4h5l2 2h8l0 2"/></svg>
      <span>${I18n.t('allNotesFolder')}</span>`;
    allEl.addEventListener('click', () => { this.currentFolderId = null; this.renderNotesList(); this.renderFolders(); });
    list.appendChild(allEl);

    folders.forEach(folder => {
      const el = document.createElement('div');
      el.className = `folder-item${this.currentFolderId === folder.id ? ' active' : ''}`;
      el.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v13h18V7"/><path d="M3 7l3-4h5l2 2h8l0 2"/></svg>
        <span>${this._esc(folder.name)}</span>`;
      el.addEventListener('click', () => { this.currentFolderId = folder.id; this.renderNotesList(); this.renderFolders(); });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (confirm(I18n.t('deleteConfirm'))) {
          Store.deleteFolder(folder.id);
          if (this.currentFolderId === folder.id) this.currentFolderId = null;
          this.renderAll();
        }
      });
      list.appendChild(el);
    });
  },

  // ── Settings modal population ────────────────────────────────────
  populateSettings(settings) {
    const tokenEl = document.getElementById('github-token');
    const gistEl = document.getElementById('gist-id');
    const autoSyncEl = document.getElementById('auto-sync-toggle');
    const fontSizeRange = document.getElementById('font-size-range');
    const fontSizeVal = document.getElementById('font-size-value');
    const editorWidthRange = document.getElementById('editor-width-range');
    const editorWidthVal = document.getElementById('editor-width-value');

    if (tokenEl) tokenEl.value = settings.githubToken || '';
    if (gistEl) gistEl.value = settings.gistId || '';
    if (autoSyncEl) autoSyncEl.checked = settings.autoSync;
    if (fontSizeRange) { fontSizeRange.value = settings.fontSize; if (fontSizeVal) fontSizeVal.textContent = `${settings.fontSize}px`; }
    if (editorWidthRange) { editorWidthRange.value = settings.editorWidth; if (editorWidthVal) editorWidthVal.textContent = `${settings.editorWidth}px`; }

    // Active font option
    document.querySelectorAll('.font-option').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.font === settings.font));
    // Active lang option
    document.querySelectorAll('.lang-option').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.lang === settings.language));
  },

  // ── Event binding ────────────────────────────────────────────────
  bindEvents() {
    // --- Sidebar ---
    const sidebar = document.getElementById('sidebar');
    document.getElementById('btn-sidebar-collapse')?.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
    });
    document.getElementById('btn-sidebar-open')?.addEventListener('click', () => {
      sidebar.classList.remove('collapsed');
    });

    // --- Search ---
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderNotesList();
    });

    // --- New note ---
    document.getElementById('btn-new-note')?.addEventListener('click', () => this.createNewNote());

    // --- New folder ---
    document.getElementById('btn-new-folder')?.addEventListener('click', () => {
      const modal = document.getElementById('folder-modal');
      if (modal) { modal.classList.add('active'); document.getElementById('folder-name').value = ''; document.getElementById('folder-name').focus(); }
    });

    document.getElementById('btn-save-folder')?.addEventListener('click', () => {
      const name = document.getElementById('folder-name')?.value.trim();
      if (name) {
        Store.createFolder(name);
        this.renderFolders();
        document.getElementById('folder-modal')?.classList.remove('active');
      }
    });

    // --- New countdown ---
    document.getElementById('btn-new-countdown')?.addEventListener('click', () => {
      const modal = document.getElementById('countdown-modal');
      if (modal) {
        modal.classList.add('active');
        document.getElementById('countdown-name').value = '';
        document.getElementById('countdown-date').value = '';
        // Reset color selection
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        document.querySelector('.color-dot')?.classList.add('active');
      }
    });

    document.getElementById('btn-save-countdown')?.addEventListener('click', () => {
      const name = document.getElementById('countdown-name')?.value.trim();
      const date = document.getElementById('countdown-date')?.value;
      const colorDot = document.querySelector('.color-dot.active');
      const color = colorDot?.dataset.color || '#7C9885';
      if (name && date) {
        Store.createCountdown(name, date, color);
        CountdownManager.render();
        document.getElementById('countdown-modal')?.classList.remove('active');
      }
    });

    // Color dot selection
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });
    });

    // --- Sync ---
    document.getElementById('btn-sync')?.addEventListener('click', () => {
      // Push then pull
      GitHubSync.push();
    });

    // --- Settings modal ---
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      document.getElementById('settings-modal')?.classList.add('active');
    });

    // Close modals on overlay click or close button
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.modal')?.classList.remove('active');
      });
    });
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', () => {
        backdrop.closest('.modal')?.classList.remove('active');
      });
    });
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    });

    // --- Theme toggle ---
    document.getElementById('btn-theme')?.addEventListener('click', () => Appearance.toggleTheme());

    // --- Font cycle (status bar) ---
    document.getElementById('btn-font-switch')?.addEventListener('click', () => Appearance.cycleFont());

    // --- Language cycle (status bar) ---
    document.getElementById('btn-lang-switch')?.addEventListener('click', () => Appearance.cycleLang());

    // --- View toggles ---
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => Editor.setViewMode(btn.dataset.view));
    });

    // --- Toolbar ---
    document.querySelectorAll('.toolbar-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => Editor.execAction(btn.dataset.action));
    });

    // --- Editor input ---
    Editor.el.editor?.addEventListener('input', () => Editor.onInput());

    // --- Title input ---
    Editor.el.title?.addEventListener('input', () => Editor.scheduleSave());

    // --- Keyboard shortcuts ---
    document.addEventListener('keydown', (e) => this.handleShortcut(e));

    // --- Tab handling in editor ---
    Editor.el.editor?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = Editor.el.editor;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        if (e.shiftKey) {
          // Remove indent
          const before = ta.value.substring(0, start);
          const lineStart = before.lastIndexOf('\n') + 1;
          const line = ta.value.substring(lineStart, end);
          if (line.startsWith('  ')) {
            ta.setRangeText(line.substring(2), lineStart, end);
            ta.selectionStart = Math.max(lineStart, start - 2);
            ta.selectionEnd = Math.max(lineStart, end - 2);
          }
        } else {
          ta.setRangeText('  ', start, end, 'end');
        }
        Editor.onInput();
      }
    });

    // --- Context menu ---
    document.addEventListener('click', () => ContextMenu.hide());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ContextMenu.hide(); });
    document.querySelectorAll('.context-menu-item[data-action]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        ContextMenu.handleAction(item.dataset.action);
      });
    });

    // --- Settings fields ---
    document.getElementById('github-token')?.addEventListener('change', (e) => {
      Store.saveSettings({ githubToken: e.target.value.trim() });
      GitHubSync.startAutoSync();
    });
    document.getElementById('gist-id')?.addEventListener('change', (e) => {
      Store.saveSettings({ gistId: e.target.value.trim() });
    });
    document.getElementById('auto-sync-toggle')?.addEventListener('change', (e) => {
      Store.saveSettings({ autoSync: e.target.checked });
      if (e.target.checked) GitHubSync.startAutoSync();
      else GitHubSync.stopAutoSync();
    });

    // Font options in settings
    document.querySelectorAll('.font-option').forEach(opt => {
      opt.addEventListener('click', () => Appearance.applyFont(opt.dataset.font));
    });

    // Language options in settings
    document.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', () => {
        I18n.setLanguage(opt.dataset.lang);
        const label = document.getElementById('current-lang-label');
        if (label) label.textContent = opt.dataset.lang.toUpperCase();
        document.querySelectorAll('.lang-option').forEach(o => o.classList.toggle('active', o === opt));
        this.renderAll();
      });
    });

    // Font size range
    document.getElementById('font-size-range')?.addEventListener('input', (e) => {
      Appearance.applyFontSize(parseInt(e.target.value, 10));
    });

    // Editor width range
    document.getElementById('editor-width-range')?.addEventListener('input', (e) => {
      Appearance.applyEditorWidth(parseInt(e.target.value, 10));
    });

    // --- Export / Import ---
    document.getElementById('btn-export-md')?.addEventListener('click', () => IO.exportMd());
    document.getElementById('btn-export-html')?.addEventListener('click', () => IO.exportHtml());
    document.getElementById('btn-export-all')?.addEventListener('click', () => IO.exportAll());
    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('file-import')?.click();
    });
    document.getElementById('file-import')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) IO.importFile(file);
      e.target.value = ''; // Reset for re-import
    });
    document.getElementById('btn-clear-data')?.addEventListener('click', () => IO.clearAll());

    // --- Close modals on Escape ---
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
      }
    });
  },

  createNewNote() {
    const note = Store.createNote(this.currentFolderId);
    this.renderNotesList();
    Editor.open(note.id);
    Editor.el.title?.focus();
  },

  handleShortcut(e) {
    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'n') {
      e.preventDefault();
      this.createNewNote();
    } else if (ctrl && e.key === 'b') {
      e.preventDefault();
      Editor.execAction('bold');
    } else if (ctrl && e.key === 'i') {
      e.preventDefault();
      Editor.execAction('italic');
    } else if (ctrl && e.key === 's') {
      e.preventDefault();
      Editor.save();
      const settings = Store.getSettings();
      if (settings.githubToken && settings.autoSync) GitHubSync.push();
    } else if (ctrl && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      const modes = ['edit', 'split', 'preview'];
      const next = modes[(modes.indexOf(Editor.viewMode) + 1) % modes.length];
      Editor.setViewMode(next);
    }
  },
};


/* ═══════════════════════════════════════════════════════════════════
   BOOTSTRAP
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => App.init());
