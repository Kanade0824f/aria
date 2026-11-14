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

> ✦ **排版指南**：點擊右下角狀態欄的字體切換鈕（如 **Sans**），可在 **Sans（無襯線）**、**Serif（精緻襯線）**、**Mono（等寬字體）** 與 **Literary（古典文藝）** 之間即時切換。

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
      name: '重要里程碑發布',
      targetDate: target.toISOString().slice(0, 16),
      color: '#7C9885',
      createdAt: new Date().toISOString(),
    };
    this.setCountdowns([sampleCountdown]);
  },

  // ── Settings ──────────────────────────────────────────────────────
  defaultSettings: {
    theme: 'light', font: 'sans', customFont: '', fontSize: 15,
    editorWidth: 720, language: 'en',
    githubToken: '', gistId: '', autoSync: false,
    accentR: 124, accentG: 152, accentB: 133, darkMode: false,
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
    customFont: 'Custom Font', customFontPlaceholder: "e.g. 'Inter', 'Cascadia Code', 'Georgia'",
    apply: 'Apply',
    fontSize: 'Font Size', editorWidth: 'Editor Width', language: 'Language',
    export: 'Export', exportMd: 'Export as Markdown', exportHtml: 'Export as HTML',
    exportAll: 'Export All Notes', exportEncrypted: 'Encrypted Backup (.aria)',
    data: 'Data', importNotes: 'Import Notes', importEncrypted: 'Import Encrypted (.aria)',
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
    theme: 'Theme', themePaper: 'Paper', themeNordic: 'Nordic', themeMatcha: 'Matcha', themeSepia: 'Sepia', themeDusk: 'Dusk', themeMidnight: 'Midnight',
    daysStreak: 'day streak', streakLogged: 'Written', streakPending: 'Pending', streakToast: 'Writing streak: {curr} days (Best: {best} days)',
    encryptPrompt: 'Set an encryption password for this backup:',
    decryptPrompt: 'Enter decryption password:',
    encryptSuccess: 'Encrypted backup saved',
    decryptSuccess: 'Decrypted and restored successfully',
    decryptError: 'Incorrect password or corrupted file',
    decryptInvalid: 'Invalid .aria file',
    liveMode: 'Live (Typora)', sourceMode: 'Source',
  },
  zh: {
    search: '搜尋筆記...', newNote: '新增筆記', allNotes: '全部筆記',
    folders: '資料夾', countdowns: '倒數計時', settings: '設定',
    githubSync: 'GitHub 同步', personalAccessToken: '個人存取令牌',
    tokenHint: "在 github.com/settings/tokens 建立具有 'gist' 權限的令牌",
    gistId: 'Gist ID（可選）',
    gistIdHint: '留空以在首次同步時建立新的 Gist',
    autoSync: '自動同步', appearance: '外觀', font: '字體',
    customFont: '自選字體', customFontPlaceholder: '自選字體（例如：霞鶩文楷、Inter、Noto Sans）',
    apply: '套用',
    fontSize: '字體大小', editorWidth: '編輯器寬度', language: '語言',
    export: '匯出', exportMd: '匯出為 Markdown', exportHtml: '匯出為 HTML',
    exportAll: '匯出全部筆記', exportEncrypted: '匯出加密備份 (.aria)',
    data: '資料', importNotes: '匯入筆記', importEncrypted: '匯入加密備份 (.aria)',
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
    theme: '主題風格', themePaper: '宣紙', themeNordic: '北歐', themeMatcha: '抹茶', themeSepia: '古卷', themeDusk: '暮夜', themeMidnight: '極夜',
    daysStreak: '天連續記錄', streakLogged: '今日已記', streakPending: '待記錄', streakToast: '已連續寫作 {curr} 天（最佳紀錄 {best} 天）',
    encryptPrompt: '請設定備份檔的加密密碼：',
    decryptPrompt: '請輸入解密密碼：',
    encryptSuccess: '已儲存加密備份',
    decryptSuccess: '解密並還原成功',
    decryptError: '密碼錯誤或檔案已損毀',
    decryptInvalid: '無效的 .aria 檔案',
    liveMode: '即時渲染 (Typora)', sourceMode: '原始碼',
  },
  ja: {
    search: 'ノートを検索...', newNote: '新規ノート', allNotes: 'すべてのノート',
    folders: 'フォルダ', countdowns: 'カウントダウン', settings: '設定',
    githubSync: 'GitHub 同期', personalAccessToken: 'パーソナルアクセストークン',
    tokenHint: "github.com/settings/tokens で 'gist' スコープのトークンを作成",
    gistId: 'Gist ID（任意）',
    gistIdHint: '初回同期時に新しい Gist を作成するには空欄にしてください',
    autoSync: '自動同期', appearance: '外観', font: 'フォント',
    customFont: 'カスタムフォント', customFontPlaceholder: 'フォント名（例: Inter, 游明朝）',
    apply: '適用',
    fontSize: 'フォントサイズ', editorWidth: 'エディタ幅', language: '言語',
    export: 'エクスポート', exportMd: 'Markdownとしてエクスポート',
    exportHtml: 'HTMLとしてエクスポート', exportAll: 'すべてのノートをエクスポート',
    exportEncrypted: '暗号化バックアップ (.aria)',
    data: 'データ', importNotes: 'ノートをインポート', importEncrypted: '暗号化データをインポート (.aria)',
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
    theme: 'テーマ', themePaper: '和紙', themeNordic: '北欧', themeMatcha: '抹茶', themeSepia: 'セピア', themeDusk: '夕暮れ', themeMidnight: '真夜中',
    daysStreak: '日連続記録', streakLogged: '記録済み', streakPending: '未記録', streakToast: '連続執筆 {curr} 日目（最高記録 {best} 日）',
    encryptPrompt: 'バックアップの暗号化パスワードを設定してください：',
    decryptPrompt: '復号化パスワードを入力してください：',
    encryptSuccess: '暗号化バックアップを保存しました',
    decryptSuccess: '復号化と復元に成功しました',
    decryptError: 'パスワードが間違っているか、ファイルが破損しています',
    decryptInvalid: '無効な .aria ファイルです',
    liveMode: 'リアルタイム (Typora)', sourceMode: 'ソース',
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
  viewMode: 'live',        // 'live' | 'edit' | 'split' | 'preview'
  _saveTimer: null,
  _previewTimer: null,

  /** DOM refs (resolved once on init) */
  el: {},

  cacheElements() {
    this.el = {
      editor:       document.getElementById('editor'),
      liveEditor:   document.getElementById('live-editor'),
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
    if (window.LiveEditor) LiveEditor.load(note.content);
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

    if (mode === 'live') {
      this.el.editorPane?.classList.remove('hidden');
      this.el.liveEditor?.classList.remove('hidden');
      this.el.editor?.classList.add('hidden');
      this.el.previewPane?.classList.add('hidden');
      this.el.resizeHandle?.classList.add('hidden');
    } else if (mode === 'edit') {
      this.el.editorPane?.classList.remove('hidden');
      this.el.liveEditor?.classList.add('hidden');
      this.el.editor?.classList.remove('hidden');
      this.el.previewPane?.classList.add('hidden');
      this.el.resizeHandle?.classList.add('hidden');
    } else if (mode === 'split') {
      this.el.editorPane?.classList.remove('hidden');
      this.el.previewPane?.classList.remove('hidden');
      this.el.resizeHandle?.classList.remove('hidden');
      this.updatePreview();
    } else if (mode === 'preview') {
      this.el.editorPane?.classList.add('hidden');
      this.el.previewPane?.classList.remove('hidden');
      this.el.resizeHandle?.classList.add('hidden');
      this.updatePreview();
    }
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
    Streak.recordActivity();
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
   §4b LIVE EDITOR — Typora-style inline real-time LaTeX & Markdown
   ═══════════════════════════════════════════════════════════════════ */

const LiveEditor = {
  el: null,
  isComposing: false,
  _checkTimer: null,

  init() {
    this.el = document.getElementById('live-editor');
    if (!this.el) return;

    this.el.addEventListener('compositionstart', () => { this.isComposing = true; });
    this.el.addEventListener('compositionend', () => {
      this.isComposing = false;
      this.checkAndRenderMath();
      this.syncToTextarea();
    });

    this.el.addEventListener('input', (e) => {
      if (this.isComposing) return;
      this.onInput(e);
    });

    this.el.addEventListener('keydown', (e) => this.onKeyDown(e));
  },

  load(rawContent) {
    if (!this.el) this.el = document.getElementById('live-editor');
    if (!this.el) return;
    this.el.innerHTML = '';
    if (!rawContent) return;

    const frag = this._parseToDOM(rawContent);
    this.el.appendChild(frag);
  },

  _parseToDOM(text) {
    const frag = document.createDocumentFragment();
    const lines = text.split('\n');

    lines.forEach((line) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'live-line';

      if (!line) {
        lineDiv.innerHTML = '<br>';
        frag.appendChild(lineDiv);
        return;
      }

      // Check block math: $$...$$
      const blockMathMatch = line.trim().match(/^\$\$([\s\S]+?)\$\$$/);
      if (blockMathMatch) {
        const box = this._createMathBox(line.trim(), blockMathMatch[1], true);
        lineDiv.appendChild(box);
        frag.appendChild(lineDiv);
        return;
      }

      // Parse inline math $...$
      let cur = 0;
      const regex = /\$([^\$\n]+?)\$/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        if (match.index > cur) {
          lineDiv.appendChild(document.createTextNode(line.substring(cur, match.index)));
        }
        const raw = match[0];
        const tex = match[1];
        const box = this._createMathBox(raw, tex, false);
        lineDiv.appendChild(box);
        cur = regex.lastIndex;
      }
      if (cur < line.length) {
        lineDiv.appendChild(document.createTextNode(line.substring(cur)));
      }

      frag.appendChild(lineDiv);
    });

    return frag;
  },

  _createMathBox(raw, tex, isBlock) {
    const box = document.createElement(isBlock ? 'div' : 'span');
    box.className = `aria-math-box ${isBlock ? 'math-block-box' : 'math-inline-box'}`;
    box.contentEditable = 'false';
    box.dataset.raw = raw;
    box.tabIndex = 0;

    try {
      if (window.katex) {
        box.innerHTML = window.katex.renderToString(tex.trim(), {
          displayMode: isBlock,
          throwOnError: false,
        });
      } else {
        box.textContent = raw;
      }
    } catch {
      box.textContent = raw;
    }

    // Click on box immediately unfolds to raw code for editing
    box.addEventListener('click', (e) => {
      e.stopPropagation();
      this.unfoldBox(box, true);
    });

    return box;
  },

  unfoldBox(box, placeCaretInside) {
    const raw = box.dataset.raw;
    const textNode = document.createTextNode(raw);
    const parent = box.parentNode;
    if (!parent) return;

    parent.replaceChild(textNode, box);

    // Place caret inside or at end of text node
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      const offset = placeCaretInside && raw.endsWith('$') ? Math.max(1, raw.length - 1) : raw.length;
      range.setStart(textNode, offset);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    this.syncToTextarea();
  },

  onKeyDown(e) {
    // Intercept Backspace on or immediately following a math box
    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      const range = sel.getRangeAt(0);

      let targetBox = null;

      if (range.collapsed) {
        const container = range.startContainer;
        const offset = range.startOffset;

        if (container.nodeType === Node.ELEMENT_NODE) {
          const prevChild = container.childNodes[offset - 1];
          if (prevChild && prevChild.classList && prevChild.classList.contains('aria-math-box')) {
            targetBox = prevChild;
          }
        } else if (container.nodeType === Node.TEXT_NODE && offset === 0) {
          let prev = container.previousSibling;
          while (prev && prev.nodeType === Node.TEXT_NODE && prev.textContent === '') {
            prev = prev.previousSibling;
          }
          if (prev && prev.classList && prev.classList.contains('aria-math-box')) {
            targetBox = prev;
          }
        }
      }

      if (!targetBox && document.activeElement && document.activeElement.classList.contains('aria-math-box')) {
        targetBox = document.activeElement;
      }

      if (targetBox) {
        e.preventDefault();
        this.unfoldBox(targetBox, false);
        return;
      }
    }
  },

  onInput(e) {
    clearTimeout(this._checkTimer);
    this._checkTimer = setTimeout(() => {
      this.checkAndRenderMath();
    }, 250);

    this.syncToTextarea();
  },

  checkAndRenderMath() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const container = range.startContainer;

    if (container.nodeType === Node.TEXT_NODE) {
      const text = container.textContent;
      const regex = /\$([^\$\n]+?)\$/g;
      let match;
      if ((match = regex.exec(text)) !== null) {
        const matchEnd = match.index + match[0].length;
        if (range.startOffset >= matchEnd) {
          const raw = match[0];
          const tex = match[1];
          const box = this._createMathBox(raw, tex, false);

          const beforeText = text.substring(0, match.index);
          const afterText = text.substring(matchEnd);

          const parent = container.parentNode;
          if (parent) {
            const frag = document.createDocumentFragment();
            if (beforeText) frag.appendChild(document.createTextNode(beforeText));
            frag.appendChild(box);
            const afterNode = document.createTextNode(afterText || ' ');
            frag.appendChild(afterNode);

            parent.replaceChild(frag, container);

            const newRange = document.createRange();
            newRange.setStart(afterNode, afterText ? 0 : 1);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);

            this.syncToTextarea();
          }
        }
      }
    }
  },

  extractText() {
    if (!this.el) return '';
    const lines = [];

    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList.contains('aria-math-box')) return node.dataset.raw || '';
        if (node.tagName === 'BR') return '\n';
        let out = '';
        for (const child of node.childNodes) out += processNode(child);
        return out;
      }
      return '';
    };

    const lineElements = this.el.querySelectorAll('.live-line');
    if (lineElements.length > 0) {
      lineElements.forEach(lineEl => {
        lines.push(processNode(lineEl));
      });
      return lines.join('\n');
    }

    for (const child of this.el.childNodes) {
      lines.push(processNode(child));
    }
    return lines.join('\n');
  },

  syncToTextarea() {
    const raw = this.extractText();
    const ta = document.getElementById('editor');
    if (ta && ta.value !== raw) {
      ta.value = raw;
      Editor.onInput();
    }
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
    // Legacy compatibility — now handled entirely by ColorEngine + data-dark
    // Keep for settings persistence
    Store.saveSettings({ theme: theme || 'light' });
  },

  toggleTheme() {
    const isDark = document.documentElement.hasAttribute('data-dark');
    if (isDark) document.documentElement.removeAttribute('data-dark');
    else document.documentElement.setAttribute('data-dark', '');
    Store.saveSettings({ darkMode: !isDark });
    const s = Store.getSettings();
    ColorEngine.applyAccent(s.accentR ?? 124, s.accentG ?? 152, s.accentB ?? 133);
    ColorEngine.renderPresets();
    const lightSheet = document.getElementById('hljs-light');
    const darkSheet  = document.getElementById('hljs-dark');
    const nowDark = document.documentElement.hasAttribute('data-dark');
    if (lightSheet) lightSheet.disabled = nowDark;
    if (darkSheet)  darkSheet.disabled  = !nowDark;
  },

  applyFont(font, customFamily) {
    if (font === 'custom' || customFamily) {
      const family = customFamily || Store.getSettings().customFont;
      if (family) {
        document.documentElement.style.setProperty('--font-custom', family);
        document.documentElement.dataset.font = 'custom';
        Store.saveSettings({ font: 'custom', customFont: family });
        const label = document.getElementById('current-font-label');
        if (label) label.textContent = family.split(',')[0].replace(/['"]/g, '').trim();
        document.querySelectorAll('.font-option').forEach(opt => opt.classList.remove('active'));
        const input = document.getElementById('custom-font-input');
        if (input) input.value = family;
        return;
      }
    }
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
   §9c COLOR ENGINE — HSL-based dynamic accent palette
   ═══════════════════════════════════════════════════════════════════ */

const ColorEngine = {
  PRESETS: [
    { h: 142, s: 22, label: 'Sage'     },
    { h: 210, s: 25, label: 'Slate'    },
    { h: 25,  s: 35, label: 'Amber'    },
    { h: 270, s: 20, label: 'Lavender' },
    { h: 350, s: 25, label: 'Rose'     },
    { h: 180, s: 20, label: 'Teal'     },
  ],

  // ── HSL ↔ RGB helpers ────────────────────────────────────────────
  _hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  },

  _rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  },

  _rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  },

  _hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0,2), 16), parseInt(h.slice(2,4), 16), parseInt(h.slice(4,6), 16)];
  },

  // ── Palette generation ───────────────────────────────────────────
  generatePalette(h, s, isDark) {
    // Accent: vivid saturated color
    const accentL  = isDark ? 65 : 42;
    const accentS  = Math.min(s * 2.8, 72);
    // Hover: slightly darker/lighter
    const hoverL   = isDark ? accentL - 8 : accentL - 7;
    // Muted: very desaturated, used for highlights
    const mutedL   = isDark ? 22 : 93;
    const mutedS   = Math.max(s * 0.6, 8);
    // Surface and bg: neutral with tiny hue tint
    const bgL      = isDark ? 10  : 98;
    const bgS      = Math.min(s * 0.25, 6);
    const surfL    = isDark ? 15  : 100;
    const surfS    = Math.min(s * 0.2, 5);
    const surf2L   = isDark ? 20  : 96;
    const surf2S   = Math.min(s * 0.3, 7);
    const borderL  = isDark ? 28  : 88;
    const borderS  = Math.min(s * 0.3, 6);
    const textL    = isDark ? 90  : 12;
    const textS    = Math.min(s * 0.1, 4);
    const mutedTL  = isDark ? 55  : 48;
    const mutedTS  = Math.min(s * 0.5, 20);

    const css = (hl, sl, ll) => `hsl(${hl}, ${sl}%, ${ll}%)`;
    return {
      '--accent':         css(h, accentS, accentL),
      '--accent-hover':   css(h, accentS, hoverL),
      '--accent-muted':   css(h, mutedS, mutedL),
      '--accent-text':    css(h, Math.min(accentS, 60), isDark ? 72 : 36),
      '--bg':             css(h, bgS,    bgL),
      '--surface':        css(h, surfS,  surfL),
      '--surface-2':      css(h, surf2S, surf2L),
      '--border':         css(h, borderS, borderL),
      '--text':           css(h, textS,  textL),
      '--text-muted':     css(h, mutedTS, mutedTL),
      '--selection-bg':   css(h, Math.min(accentS * 0.6, 35), isDark ? 30 : 88),
    };
  },

  // ── Main apply method ────────────────────────────────────────────
  applyAccent(r, g, b) {
    const root = document.documentElement;
    const isDark = root.hasAttribute('data-dark');
    const [h, s] = this._rgbToHsl(r, g, b);
    const palette = this.generatePalette(h, s, isDark);

    Object.entries(palette).forEach(([k, v]) => root.style.setProperty(k, v));
    Store.saveSettings({ accentR: r, accentG: g, accentB: b });
    this.syncSliders(h, s, r, g, b);
  },

  applyFromHSL(h, s) {
    const isDark = document.documentElement.hasAttribute('data-dark');
    const l = isDark ? 55 : 42;
    const [r, g, b] = this._hslToRgb(h, s * 2.5, l);
    this.applyAccent(r, g, b);
  },

  // ── Sync UI sliders ──────────────────────────────────────────────
  syncSliders(h, s, r, g, b) {
    const hSlider = document.getElementById('hue-slider');
    const sSlider = document.getElementById('sat-slider');
    const rSlider = document.getElementById('rgb-r');
    const gSlider = document.getElementById('rgb-g');
    const bSlider = document.getElementById('rgb-b');
    const hexInput = document.getElementById('color-hex');
    const previewDot = document.getElementById('color-preview-dot');

    if (hSlider) hSlider.value = h;
    if (sSlider) sSlider.value = Math.min(90, Math.max(10, s));
    if (rSlider) rSlider.value = r;
    if (gSlider) gSlider.value = g;
    if (bSlider) bSlider.value = b;
    if (hexInput) hexInput.value = this._rgbToHex(r, g, b);
    if (previewDot) previewDot.style.background = this._rgbToHex(r, g, b);
  },

  // ── Render preset swatches ───────────────────────────────────────
  renderPresets() {
    const container = document.getElementById('preset-swatches');
    if (!container) return;
    container.innerHTML = '';
    this.PRESETS.forEach(preset => {
      const isDark = document.documentElement.hasAttribute('data-dark');
      const [r, g, b] = this._hslToRgb(preset.h, preset.s * 2.5, isDark ? 55 : 42);
      const btn = document.createElement('button');
      btn.className = 'preset-swatch';
      btn.title = preset.label;
      btn.style.background = this._rgbToHex(r, g, b);
      btn.addEventListener('click', () => this.applyFromHSL(preset.h, preset.s));
      container.appendChild(btn);
    });
  },

  // ── Init & events ────────────────────────────────────────────────
  init() {
    const s = Store.getSettings();
    const isDark = s.darkMode || false;
    if (isDark) document.documentElement.setAttribute('data-dark', '');
    else document.documentElement.removeAttribute('data-dark');

    // Dark mode toggle sync
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = isDark;

    this.applyAccent(s.accentR ?? 124, s.accentG ?? 152, s.accentB ?? 133);
    this.renderPresets();
    this._bindEvents();
  },

  _bindEvents() {
    document.getElementById('hue-slider')?.addEventListener('input', e => {
      const h = +e.target.value;
      const sSlider = document.getElementById('sat-slider');
      const s = sSlider ? +sSlider.value : 22;
      this.applyFromHSL(h, s);
    });

    document.getElementById('sat-slider')?.addEventListener('input', e => {
      const s = +e.target.value;
      const hSlider = document.getElementById('hue-slider');
      const h = hSlider ? +hSlider.value : 142;
      this.applyFromHSL(h, s);
    });

    document.getElementById('dark-mode-toggle')?.addEventListener('change', e => {
      const isDark = e.target.checked;
      if (isDark) document.documentElement.setAttribute('data-dark', '');
      else document.documentElement.removeAttribute('data-dark');
      Store.saveSettings({ darkMode: isDark });
      // Re-apply accent with new dark state
      const sv = Store.getSettings();
      this.applyAccent(sv.accentR ?? 124, sv.accentG ?? 152, sv.accentB ?? 133);
      this.renderPresets();
      // Sync hljs stylesheets
      const lightSheet = document.getElementById('hljs-light');
      const darkSheet = document.getElementById('hljs-dark');
      if (lightSheet) lightSheet.disabled = isDark;
      if (darkSheet) darkSheet.disabled = !isDark;
    });

    document.getElementById('btn-unlock-rgb')?.addEventListener('click', () => {
      document.getElementById('color-advanced')?.classList.toggle('open');
    });

    document.getElementById('btn-reset-color')?.addEventListener('click', () => {
      this.applyAccent(124, 152, 133);
      const hSlider = document.getElementById('hue-slider');
      const sSlider = document.getElementById('sat-slider');
      if (hSlider) hSlider.value = 142;
      if (sSlider) sSlider.value = 22;
    });

    ['rgb-r', 'rgb-g', 'rgb-b'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        const r = +(document.getElementById('rgb-r')?.value || 124);
        const g = +(document.getElementById('rgb-g')?.value || 152);
        const b = +(document.getElementById('rgb-b')?.value || 133);
        this.applyAccent(r, g, b);
        const hexInput = document.getElementById('color-hex');
        if (hexInput) hexInput.value = this._rgbToHex(r, g, b);
      });
    });

    document.getElementById('color-hex')?.addEventListener('change', e => {
      const hex = e.target.value.replace('#', '');
      if (!/^[0-9a-fA-F]{6}$/.test(hex)) return;
      const [r, g, b] = this._hexToRgb(hex);
      this.applyAccent(r, g, b);
    });
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §9b STREAK — Writing Habit Tracker
   ═══════════════════════════════════════════════════════════════════ */

const Streak = {
  KEY: 'aria_streak',

  getData() {
    try {
      const today = this._todayStr();
      const def = { currentStreak: 1, longestStreak: 1, lastActiveDate: today, history: [today] };
      const raw = localStorage.getItem(this.KEY);
      return raw ? { ...def, ...JSON.parse(raw) } : def;
    } catch {
      const today = this._todayStr();
      return { currentStreak: 1, longestStreak: 1, lastActiveDate: today, history: [today] };
    }
  },

  saveData(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
  },

  _todayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  recordActivity() {
    const data = this.getData();
    const today = this._todayStr();

    if (!data.history) data.history = [];
    if (!data.history.includes(today)) {
      data.history.push(today);
      if (data.history.length > 60) data.history.shift();
    }

    if (data.lastActiveDate === today) {
      this.render();
      return;
    }

    const lastDate = new Date(data.lastActiveDate);
    const currDate = new Date(today);
    const diffTime = currDate - lastDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      data.currentStreak = (data.currentStreak || 0) + 1;
    } else if (diffDays > 1) {
      data.currentStreak = 1;
    }

    data.longestStreak = Math.max(data.longestStreak || 1, data.currentStreak);
    data.lastActiveDate = today;

    this.saveData(data);
    this.render();
  },

  render() {
    const data = this.getData();
    const today = this._todayStr();
    const isTodayLogged = data.lastActiveDate === today;

    const countEl = document.getElementById('streak-count');
    const badgeEl = document.getElementById('streak-badge');
    const weekEl = document.getElementById('streak-week');

    if (countEl) countEl.textContent = data.currentStreak || 1;
    if (badgeEl) {
      badgeEl.textContent = isTodayLogged ? I18n.t('streakLogged') : I18n.t('streakPending');
      badgeEl.classList.toggle('pending', !isTodayLogged);
    }

    if (weekEl) {
      weekEl.innerHTML = '';
      const now = new Date();
      const dayLabels = {
        en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        zh: ['日', '一', '二', '三', '四', '五', '六'],
        ja: ['日', '月', '火', '水', '木', '金', '土'],
      };
      const labels = dayLabels[I18n.lang] || dayLabels.en;

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayNum = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${dayNum}`;

        const isWritten = data.history && data.history.includes(dateStr);
        const isToday = i === 0;

        const dotWrap = document.createElement('div');
        dotWrap.className = 'streak-day-dot';
        dotWrap.innerHTML = `
          <div class="streak-circle${isWritten ? ' active' : ''}${isToday ? ' today' : ''}" title="${dateStr}"></div>
          <span class="streak-day-label">${labels[d.getDay()]}</span>
        `;
        weekEl.appendChild(dotWrap);
      }
    }
  },

  showDetails() {
    const data = this.getData();
    const msg = I18n.t('streakToast')
      .replace('{curr}', data.currentStreak || 1)
      .replace('{best}', data.longestStreak || 1);
    Toast.show(msg, 'info', 2500);
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

  // ── Encrypted export / import (AES-GCM + PBKDF2) ────────────────
  async exportEncrypted() {
    const password = prompt(I18n.t('encryptPrompt') || 'Encryption password:');
    if (!password) return;
    const data = JSON.stringify({
      notes: Store.getNotes(), folders: Store.getFolders(),
      countdowns: Store.getCountdowns(), exportedAt: new Date().toISOString(),
    });
    try {
      const enc = new TextEncoder();
      const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
      const salt   = crypto.getRandomValues(new Uint8Array(16));
      const iv     = crypto.getRandomValues(new Uint8Array(12));
      const key    = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
        keyMat, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
      );
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(data));
      // Layout: 4-byte magic | 1-byte version | 16-byte salt | 12-byte iv | ciphertext
      const magic   = new Uint8Array([0x61, 0x72, 0x69, 0x61]); // "aria"
      const version = new Uint8Array([1]);
      const payload = new Uint8Array(magic.length + version.length + salt.length + iv.length + encrypted.byteLength);
      let offset = 0;
      payload.set(magic, offset);   offset += magic.length;
      payload.set(version, offset); offset += version.length;
      payload.set(salt, offset);    offset += salt.length;
      payload.set(iv, offset);      offset += iv.length;
      payload.set(new Uint8Array(encrypted), offset);
      const blob = new Blob([payload], { type: 'application/octet-stream' });
      const title = `aria-backup-${new Date().toISOString().slice(0,10)}`;
      this._download(`${title}.aria`, blob, 'application/octet-stream');
      Toast.show(I18n.t('encryptSuccess') || 'Encrypted backup saved', 'success');
    } catch (err) {
      console.error(err);
      Toast.show(I18n.t('encryptError') || 'Encryption failed', 'error');
    }
  },

  async importEncrypted(file) {
    const password = prompt(I18n.t('decryptPrompt') || 'Decryption password:');
    if (!password) return;
    try {
      const buf   = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Validate magic header "aria"
      const magic = bytes.slice(0, 4);
      if (magic[0] !== 0x61 || magic[1] !== 0x72 || magic[2] !== 0x69 || magic[3] !== 0x61) {
        Toast.show(I18n.t('decryptInvalid') || 'Invalid .aria file', 'error'); return;
      }
      // version byte
      const offset0 = 5; // 4 magic + 1 version
      const salt       = bytes.slice(offset0, offset0 + 16);
      const iv         = bytes.slice(offset0 + 16, offset0 + 28);
      const ciphertext = bytes.slice(offset0 + 28);

      const enc    = new TextEncoder();
      const keyMat = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
      const key    = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
        keyMat, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
      );
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
      const json = JSON.parse(new TextDecoder().decode(decrypted));
      this._mergeImport(json);
      Toast.show(I18n.t('decryptSuccess') || 'Decrypted and imported', 'success');
    } catch (err) {
      console.error(err);
      Toast.show(I18n.t('decryptError') || 'Wrong password or corrupted file', 'error');
    }
  },

  _mergeImport(data) {
    if (Array.isArray(data.notes)) {
      const existing = Store.getNotes();
      const ids = new Set(existing.map(n => n.id));
      Store.setNotes([...existing, ...data.notes.filter(n => !ids.has(n.id))]);
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
    App.renderAll();
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
    Appearance.applyFont(settings.font);
    Appearance.applyFontSize(settings.fontSize);
    Appearance.applyEditorWidth(settings.editorWidth);

    // 1b. Apply colour engine (sets dark mode + accent palette)
    ColorEngine.init();

    // Set lang label
    const langLabel = document.getElementById('current-lang-label');
    if (langLabel) langLabel.textContent = settings.language.toUpperCase();

    // 2. Seed initial sample data & render
    Store.seedIfEmpty();
    this.renderAll();

    // 3. Bind events
    this.bindEvents();

    // 4. Editor resize, live engine & initial state
    Editor.initResize();
    LiveEditor.init();
    Editor.setViewMode('live');
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
    Streak.render();
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
    const customFontInput = document.getElementById('custom-font-input');
    if (customFontInput && settings.customFont) customFontInput.value = settings.customFont;
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

    // --- Streak widget ---
    document.getElementById('streak-widget')?.addEventListener('click', () => {
      Streak.showDetails();
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

    // Theme options in settings
    document.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => Appearance.applyTheme(card.dataset.theme));
    });

    // Font options in settings
    document.querySelectorAll('.font-option').forEach(opt => {
      opt.addEventListener('click', () => Appearance.applyFont(opt.dataset.font));
    });

    // Custom font apply
    const applyCustomFont = () => {
      const val = document.getElementById('custom-font-input')?.value.trim();
      if (val) Appearance.applyFont('custom', val);
    };
    document.getElementById('btn-apply-custom-font')?.addEventListener('click', applyCustomFont);
    document.getElementById('custom-font-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyCustomFont();
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
    document.getElementById('btn-export-encrypted')?.addEventListener('click', () => IO.exportEncrypted());
    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('file-import')?.click();
    });
    document.getElementById('btn-import-encrypted')?.addEventListener('click', () => {
      document.getElementById('file-import-encrypted')?.click();
    });
    document.getElementById('file-import')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) IO.importFile(file);
      e.target.value = ''; // Reset for re-import
    });
    document.getElementById('file-import-encrypted')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) IO.importEncrypted(file);
      e.target.value = '';
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
    Streak.recordActivity();
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
