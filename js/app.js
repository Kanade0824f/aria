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
    theme: 'Theme', themePaper: 'Paper', themeNordic: 'Nordic', themeMatcha: 'Matcha', themeSepia: 'Sepia', themeDusk: 'Dusk', themeMidnight: 'Midnight',
    daysStreak: 'day streak', streakLogged: 'Written', streakPending: 'Pending', streakToast: 'Writing streak: {curr} days (Best: {best} days)',
    customFont: 'Custom', customFontName: 'Custom Font Family',
    customFontPlaceholder: 'e.g., PingFang SC, Microsoft YaHei, Inter, Fira Code...',
    customFontHint: 'Enter any font installed on your system or loaded via web',
    encryptedBackup: 'Encrypted Backup',
    encryptedBackupHint: 'Zero-knowledge AES-256-GCM encryption. Your password never leaves your browser.',
    exportEncrypted: 'Export Encrypted (.aria)', importEncrypted: 'Import Encrypted',
    cryptoTitle: 'Encrypted Backup', password: 'Password', confirmPassword: 'Confirm Password',
    confirm: 'Confirm', passwordMismatch: 'Passwords do not match', passwordEmpty: 'Password cannot be empty',
    wrongPassword: 'Incorrect password or corrupted backup file',
    backupExportSuccess: 'Encrypted backup saved successfully',
    backupImportSuccess: 'Backup restored and decrypted successfully',
    mathClickHint: 'Click or Backspace to edit formula',
    lockHarmony: 'Harmonize (Locked)', unlockHarmony: 'Manual RGB (Unlocked)',
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
    theme: '主題風格', themePaper: '宣紙', themeNordic: '北歐', themeMatcha: '抹茶', themeSepia: '古卷', themeDusk: '暮夜', themeMidnight: '極夜',
    daysStreak: '天連續記錄', streakLogged: '今日已記', streakPending: '待記錄', streakToast: '已連續寫作 {curr} 天（最佳紀錄 {best} 天）',
    customFont: '自選字體', customFontName: '自選字體名稱',
    customFontPlaceholder: '例如：PingFang SC, 微軟正黑體, 霞鶩文楷, Inter...',
    customFontHint: '可輸入任意本機已安裝字體或線上字體名稱',
    encryptedBackup: '加密備份存檔',
    encryptedBackupHint: '採用端對端 AES-256-GCM 高強度加密，密碼絕不離開瀏覽器，保障純私密安全',
    exportEncrypted: '加密匯出存檔 (.aria)', importEncrypted: '解密還原存檔',
    cryptoTitle: '加密備份驗證', password: '加密密碼', confirmPassword: '確認密碼',
    confirm: '確認執行', passwordMismatch: '兩次輸入的密碼不一致', passwordEmpty: '密碼不可為空',
    wrongPassword: '密碼錯誤或存檔檔案損壞',
    backupExportSuccess: '加密存檔已成功匯出並下載',
    backupImportSuccess: '存檔已成功解密並還原所有資料',
    mathClickHint: '點擊或按 Backspace 編輯公式代碼',
    lockHarmony: '自動協調色彩 (已鎖定)', unlockHarmony: '自選調色 (已解鎖)',
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
    theme: 'テーマ', themePaper: '和紙', themeNordic: '北欧', themeMatcha: '抹茶', themeSepia: 'セピア', themeDusk: '夕暮れ', themeMidnight: '真夜中',
    daysStreak: '日連続記録', streakLogged: '記録済み', streakPending: '未記録', streakToast: '連続執筆 {curr} 日目（最高記録 {best} 日）',
    customFont: 'カスタム', customFontName: 'カスタムフォント名',
    customFontPlaceholder: '例：Noto Sans JP, メイリオ, Inter...',
    customFontHint: 'インストールされているフォント名を入力してください',
    encryptedBackup: '暗号化バックアップ',
    encryptedBackupHint: 'ブラウザ内 AES-256-GCM 暗号化。パスワードは端末外に送信されません',
    exportEncrypted: '暗号化エクスポート (.aria)', importEncrypted: '暗号化インポート',
    cryptoTitle: '暗号化認証', password: 'パスワード', confirmPassword: 'パスワード再入力',
    confirm: '実行', passwordMismatch: 'パスワードが一致しません', passwordEmpty: 'パスワードを入力してください',
    wrongPassword: 'パスワードが正しくないかファイルが破損しています',
    backupExportSuccess: '暗号化バックアップを保存しました',
    backupImportSuccess: 'バックアップを正常に復元しました',
    mathClickHint: 'クリックまたは Backspace で数式を編集',
    lockHarmony: '自動調和 (ロック)', unlockHarmony: '手動調整 (アンロック)',
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

  /** Render markdown with interactive editable KaTeX math boxes */
  renderLive(md) {
    this.init();
    if (!md) return '';

    const mathChips = [];
    let src = md;

    // Display math: $$...$$ or \[...\]
    src = src.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => {
      mathChips.push({ display: true, tex: (a || b).trim() });
      return `%%MATHCHIP_${mathChips.length - 1}%%`;
    });
    // Inline math: $...$ or \(...\)
    src = src.replace(/\$([^\$\n]+?)\$|\\\((.+?)\\\)/g, (_, a, b) => {
      mathChips.push({ display: false, tex: (a || b).trim() });
      return `%%MATHCHIP_${mathChips.length - 1}%%`;
    });

    let html = window.marked.parse(src);

    html = html.replace(/%%MATHCHIP_(\d+)%%/g, (_, i) => {
      const { display, tex } = mathChips[+i];
      let rendered = '';
      try {
        rendered = window.katex ? window.katex.renderToString(tex, { displayMode: display, throwOnError: false }) : tex;
      } catch {
        rendered = tex;
      }
      const delim = display ? '$$' : '$';
      const blockClass = display ? ' block' : '';
      const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<span class="math-live-box${blockClass}" data-tex="${esc(tex)}" data-display="${display}" tabindex="0" title="${I18n.t('mathClickHint')}"><span class="math-rendered">${rendered}</span><span class="math-editor hidden"><span class="math-delim">${delim}</span><input type="text" class="math-raw-input" value="${esc(tex)}" spellcheck="false"><span class="math-delim">${delim}</span></span></span>`;
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
    this.updateCharCount();
    this.updatePreview();
    this.updateLiveEditor();
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

    const isLive = mode === 'live';
    const isEdit = mode === 'edit';
    const isSplit = mode === 'split';
    const isPreview = mode === 'preview';

    this.el.editorPane?.classList.toggle('hidden', isPreview);
    this.el.previewPane?.classList.toggle('hidden', isLive || isEdit);
    this.el.resizeHandle?.classList.toggle('hidden', !isSplit);

    this.el.liveEditor?.classList.toggle('hidden', !isLive);
    this.el.editor?.classList.toggle('hidden', isLive);

    if (isLive) {
      this.updateLiveEditor();
    } else if (isSplit || isPreview) {
      this.updatePreview();
    }
  },

  updateLiveEditor() {
    if (!this.el.liveEditor || !this.el.editor) return;
    this.el.liveEditor.innerHTML = Renderer.renderLive(this.el.editor.value);
    this.bindLiveMathBoxes();
  },

  bindLiveMathBoxes() {
    if (!this.el.liveEditor) return;
    const boxes = this.el.liveEditor.querySelectorAll('.math-live-box');

    boxes.forEach(box => {
      const rendered = box.querySelector('.math-rendered');
      const editor = box.querySelector('.math-editor');
      const input = box.querySelector('.math-raw-input');
      const isDisplay = box.dataset.display === 'true';

      const openEditor = () => {
        rendered?.classList.add('hidden');
        editor?.classList.remove('hidden');
        box.classList.add('editing');
        if (input) {
          input.focus();
          input.select();
        }
      };

      const closeEditor = () => {
        if (!input) return;
        const newTex = input.value.trim();
        box.classList.remove('editing');
        editor?.classList.add('hidden');

        if (!newTex) {
          box.remove();
        } else {
          box.dataset.tex = newTex;
          try {
            if (rendered) {
              rendered.innerHTML = window.katex ? window.katex.renderToString(newTex, { displayMode: isDisplay, throwOnError: false }) : newTex;
            }
          } catch {
            if (rendered) rendered.textContent = newTex;
          }
          rendered?.classList.remove('hidden');
        }

        Editor.syncFromLive();
      };

      // Click to edit
      rendered?.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditor();
      });

      // Backspace or Enter when focused on box
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          openEditor();
        }
      });

      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeEditor();
          } else if (e.key === 'Backspace' && input.value === '') {
            e.preventDefault();
            e.stopPropagation();
            box.remove();
            Editor.syncFromLive();
          }
        });

        input.addEventListener('blur', () => {
          closeEditor();
        });
      }
    });
  },

  syncFromLive() {
    if (!this.el.liveEditor || !this.el.editor) return;
    const clone = this.el.liveEditor.cloneNode(true);
    clone.querySelectorAll('.math-live-box').forEach(box => {
      const tex = box.dataset.tex;
      const isDisplay = box.dataset.display === 'true';
      const delim = isDisplay ? '$$' : '$';
      box.replaceWith(document.createTextNode(` ${delim}${tex}${delim} `));
    });

    const newContent = clone.innerText || clone.textContent || '';
    this.el.editor.value = newContent;
    this.updateCharCount();
    this.scheduleSave();
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
    let resolved = theme || 'paper';
    if (resolved === 'light') resolved = 'paper';
    if (resolved === 'dark') resolved = 'dusk';

    document.documentElement.dataset.theme = resolved;

    const isDark = resolved === 'dusk' || resolved === 'midnight' || document.documentElement.dataset.theme === 'dark';
    const lightSheet = document.getElementById('hljs-light');
    const darkSheet = document.getElementById('hljs-dark');
    if (lightSheet) lightSheet.disabled = isDark;
    if (darkSheet) darkSheet.disabled = !isDark;

    Store.saveSettings({ theme: resolved });
  },

  toggleTheme() {
    const isDark = document.documentElement.dataset.theme === 'dark' || document.documentElement.dataset.theme === 'dusk' || document.documentElement.dataset.theme === 'midnight';
    ColorEngine.setDarkMode(!isDark);
  },

  applyFont(font, customFamily = '') {
    document.documentElement.dataset.font = font;
    if (font === 'custom') {
      const family = customFamily || Store.getSettings().customFontFamily || 'system-ui';
      document.documentElement.style.setProperty('--font-custom', `"${family}", var(--font-sans)`);
      Store.saveSettings({ font, customFontFamily: family });
    } else {
      Store.saveSettings({ font });
    }
    const label = document.getElementById('current-font-label');
    if (label) {
      const names = { sans: 'Sans', serif: 'Serif', mono: 'Mono', literary: 'Literary', custom: 'Custom' };
      label.textContent = names[font] || font;
    }
    document.querySelectorAll('.font-option').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.font === font));

    const customWrapper = document.getElementById('custom-font-wrapper');
    if (customWrapper) customWrapper.style.display = font === 'custom' ? 'block' : 'none';
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
    document.querySelectorAll('.lang-option').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.lang === next));
  },
};


/* ═══════════════════════════════════════════════════════════════════
   §9a COLOR ENGINE — Auto-Harmonized & Unlocked RGB System
   ═══════════════════════════════════════════════════════════════════ */

const ColorEngine = {
  KEY: 'aria_color_custom',

  PRESETS: [
    { name: 'Sage', hex: '#5B8266' },
    { name: 'Slate', hex: '#4E738C' },
    { name: 'Indigo', hex: '#56648A' },
    { name: 'Amber', hex: '#8E6B47' },
    { name: 'Rose', hex: '#8F5E68' },
    { name: 'Monochrome', hex: '#555555' }
  ],

  getCustom() {
    try {
      const def = { isLocked: true, primaryHex: '#7C9885', isDark: false };
      return { ...def, ...JSON.parse(localStorage.getItem(this.KEY) || '{}') };
    } catch {
      return { isLocked: true, primaryHex: '#7C9885', isDark: false };
    }
  },

  saveCustom(data) {
    const cur = this.getCustom();
    const updated = { ...cur, ...data };
    localStorage.setItem(this.KEY, JSON.stringify(updated));
    return updated;
  },

  hex2rgb(hex) {
    hex = (hex || '').replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16) || 0;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  },

  rgb2hex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const h = Math.max(0, Math.min(255, Math.round(x))).toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('').toUpperCase();
  },

  rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  },

  hsl2rgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  },

  hsl2hex(h, s, l) {
    const { r, g, b } = this.hsl2rgb(h, s, l);
    return this.rgb2hex(r, g, b);
  },

  harmonize(primaryHex, isDark = false) {
    const { r, g, b } = this.hex2rgb(primaryHex);
    const { h, s, l } = this.rgb2hsl(r, g, b);

    if (!isDark) {
      return {
        accent: this.hsl2hex(h, Math.max(30, Math.min(s, 65)), Math.max(35, Math.min(l, 46))),
        accentHover: this.hsl2hex(h, Math.max(30, Math.min(s, 65)), Math.max(28, Math.min(l - 8, 38))),
        accentLight: this.hsl2hex(h, Math.min(s * 0.4, 25), 94),
        bg: this.hsl2hex(h, Math.min(s * 0.15, 8), 98),
        bgSecondary: this.hsl2hex(h, Math.min(s * 0.2, 12), 95),
        surface: '#FFFFFF',
        border: this.hsl2hex(h, Math.min(s * 0.25, 14), 90),
        borderLight: this.hsl2hex(h, Math.min(s * 0.2, 10), 94),
        text: this.hsl2hex(h, Math.min(s * 0.3, 15), 11),
        textSecondary: this.hsl2hex(h, Math.min(s * 0.2, 10), 42),
        textTertiary: this.hsl2hex(h, Math.min(s * 0.15, 8), 62),
        selectionBg: this.hsl2hex(h, Math.min(s * 0.6, 45), 88),
        codeBg: this.hsl2hex(h, Math.min(s * 0.2, 10), 96),
        shadowColor: 'rgba(0,0,0,0.05)'
      };
    } else {
      return {
        accent: this.hsl2hex(h, Math.max(40, Math.min(s, 70)), Math.max(62, Math.min(l, 74))),
        accentHover: this.hsl2hex(h, Math.max(40, Math.min(s, 70)), Math.min(82, l + 8)),
        accentLight: this.hsl2hex(h, Math.min(s * 0.4, 30), 18),
        bg: this.hsl2hex(h, Math.min(s * 0.2, 12), 10),
        bgSecondary: this.hsl2hex(h, Math.min(s * 0.25, 15), 14),
        surface: this.hsl2hex(h, Math.min(s * 0.2, 12), 17),
        border: this.hsl2hex(h, Math.min(s * 0.25, 18), 24),
        borderLight: this.hsl2hex(h, Math.min(s * 0.2, 14), 19),
        text: this.hsl2hex(h, Math.min(s * 0.15, 8), 92),
        textSecondary: this.hsl2hex(h, Math.min(s * 0.15, 8), 64),
        textTertiary: this.hsl2hex(h, Math.min(s * 0.1, 5), 45),
        selectionBg: this.hsl2hex(h, Math.min(s * 0.5, 35), 22),
        codeBg: this.hsl2hex(h, Math.min(s * 0.2, 10), 14),
        shadowColor: 'rgba(0,0,0,0.35)'
      };
    }
  },

  apply() {
    const cfg = this.getCustom();
    document.documentElement.dataset.theme = cfg.isDark ? 'dark' : 'light';

    const lightSheet = document.getElementById('hljs-light');
    const darkSheet = document.getElementById('hljs-dark');
    if (lightSheet) lightSheet.disabled = cfg.isDark;
    if (darkSheet) darkSheet.disabled = !cfg.isDark;

    if (cfg.isLocked) {
      const palette = this.harmonize(cfg.primaryHex, cfg.isDark);
      const root = document.documentElement;
      Object.entries(palette).forEach(([k, val]) => {
        const cssVar = '--' + k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        root.style.setProperty(cssVar, val);
      });
    } else if (cfg.unlockedColors) {
      const root = document.documentElement;
      root.style.setProperty('--accent', cfg.unlockedColors.accent || '#7C9885');
      root.style.setProperty('--bg', cfg.unlockedColors.bg || '#FAFAF9');
      root.style.setProperty('--surface', cfg.unlockedColors.surface || '#FFFFFF');
      root.style.setProperty('--text', cfg.unlockedColors.text || '#1A1A1A');
    }
  },

  setPrimary(hex) {
    this.saveCustom({ primaryHex: hex });
    this.apply();
    this.renderSettingsUI();
  },

  setDarkMode(isDark) {
    this.saveCustom({ isDark });
    this.apply();
    this.renderSettingsUI();
  },

  toggleLock() {
    const cfg = this.getCustom();
    const isLocked = !cfg.isLocked;
    this.saveCustom({ isLocked });
    this.apply();
    this.renderSettingsUI();
    Toast.show(isLocked ? I18n.t('lockHarmony') : I18n.t('unlockHarmony'), 'info', 1800);
  },

  renderSettingsUI() {
    const cfg = this.getCustom();
    const darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) darkToggle.checked = cfg.isDark;

    const rgb = this.hex2rgb(cfg.primaryHex);
    const hsl = this.rgb2hsl(rgb.r, rgb.g, rgb.b);

    const hueSlider = document.getElementById('hue-slider');
    const satSlider = document.getElementById('sat-slider');
    const previewDot = document.getElementById('color-preview-dot');

    if (hueSlider) hueSlider.value = hsl.h;
    if (satSlider) satSlider.value = hsl.s;
    if (previewDot) previewDot.style.backgroundColor = cfg.primaryHex;

    const btnLock = document.getElementById('btn-unlock-rgb');
    const advPanel = document.getElementById('color-advanced');

    if (btnLock) {
      btnLock.textContent = cfg.isLocked ? I18n.t('unlockHarmony') : I18n.t('lockHarmony');
    }
    if (advPanel) {
      advPanel.classList.toggle('active', !cfg.isLocked);
    }

    // Presets
    const presetBox = document.getElementById('preset-swatches');
    if (presetBox && presetBox.children.length === 0) {
      presetBox.innerHTML = '';
      this.PRESETS.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'preset-swatch';
        btn.title = p.name;
        btn.style.backgroundColor = p.hex;
        btn.addEventListener('click', () => {
          ColorEngine.setPrimary(p.hex);
        });
        presetBox.appendChild(btn);
      });
    }

    // Sliders
    const rSlider = document.getElementById('rgb-r');
    const gSlider = document.getElementById('rgb-g');
    const bSlider = document.getElementById('rgb-b');
    const hexInput = document.getElementById('color-hex');

    if (rSlider) rSlider.value = rgb.r;
    if (gSlider) gSlider.value = rgb.g;
    if (bSlider) bSlider.value = rgb.b;
    if (hexInput) hexInput.value = cfg.primaryHex.replace(/^#/, '');
  }
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
};


/* ═══════════════════════════════════════════════════════════════════
   §10b CRYPTO BACKUP — AES-256-GCM Zero-Knowledge Encryption
   ═══════════════════════════════════════════════════════════════════ */

const CryptoBackup = {
  _str2ab(str) { return new TextEncoder().encode(str); },
  _ab2b64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  },
  _b642ab(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  },

  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  async exportEncrypted(password) {
    const payload = {
      version: 1,
      appName: 'aria.',
      notes: Store.getNotes(),
      folders: Store.getFolders(),
      countdowns: Store.getCountdowns(),
      streak: Streak.getData(),
      settings: Store.getSettings(),
      colorCustom: ColorEngine.getCustom(),
      exportedAt: new Date().toISOString()
    };

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);
    const jsonStr = JSON.stringify(payload);
    const encryptedBuf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      this._str2ab(jsonStr)
    );

    const backupObj = {
      version: 1,
      type: 'aria-encrypted-backup',
      salt: this._ab2b64(salt),
      iv: this._ab2b64(iv),
      ciphertext: this._ab2b64(encryptedBuf),
      exportedAt: new Date().toISOString()
    };

    const ymd = new Date().toISOString().slice(0, 10);
    IO._download(`aria_encrypted_backup_${ymd}.aria`, JSON.stringify(backupObj, null, 2), 'application/json');
    Toast.show(I18n.t('backupExportSuccess'), 'success');
  },

  async importEncrypted(fileContent, password) {
    let backupObj;
    try {
      backupObj = JSON.parse(fileContent);
    } catch {
      throw new Error('Invalid JSON');
    }

    if (backupObj.type !== 'aria-encrypted-backup') {
      throw new Error('Invalid backup type');
    }

    const salt = new Uint8Array(this._b642ab(backupObj.salt));
    const iv = new Uint8Array(this._b642ab(backupObj.iv));
    const ciphertext = this._b642ab(backupObj.ciphertext);
    const key = await this.deriveKey(password, salt);

    let decryptedBuf;
    try {
      decryptedBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
    } catch {
      throw new Error(I18n.t('wrongPassword'));
    }

    const decStr = new TextDecoder().decode(decryptedBuf);
    const data = JSON.parse(decStr);

    if (data.notes) Store.setNotes(data.notes);
    if (data.folders) Store.setFolders(data.folders);
    if (data.countdowns) Store.setCountdowns(data.countdowns);
    if (data.streak) Streak.saveData(data.streak);
    if (data.settings) Store.saveSettings(data.settings);
    if (data.colorCustom) ColorEngine.saveCustom(data.colorCustom);

    App.init();
    Toast.show(I18n.t('backupImportSuccess'), 'success');
  }
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
    ColorEngine.apply();
    Appearance.applyFont(settings.font, settings.customFontFamily);
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
    // Active lang option
    document.querySelectorAll('.lang-option').forEach(opt =>
      opt.classList.toggle('active', opt.dataset.lang === settings.language));

    // Custom font input
    if (settings.font === 'custom') {
      const customInput = document.getElementById('custom-font-input');
      if (customInput) customInput.value = settings.customFontFamily || '';
      const customWrapper = document.getElementById('custom-font-wrapper');
      if (customWrapper) customWrapper.style.display = 'block';
    }
    ColorEngine.renderSettingsUI();
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

    // --- Live Editor Input ---
    Editor.el.liveEditor?.addEventListener('input', () => {
      Editor.syncFromLive();
    });

    // Custom Font Input
    document.getElementById('custom-font-input')?.addEventListener('input', (e) => {
      Appearance.applyFont('custom', e.target.value.trim());
    });

    // Font options in settings
    document.querySelectorAll('.font-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const font = opt.dataset.font;
        const customFamily = document.getElementById('custom-font-input')?.value.trim() || '';
        Appearance.applyFont(font, customFamily);
      });
    });

    // --- Color Engine Controls ---
    document.getElementById('hue-slider')?.addEventListener('input', (e) => {
      const h = parseInt(e.target.value, 10);
      const sat = parseInt(document.getElementById('sat-slider')?.value || '22', 10);
      const hex = ColorEngine.hsl2hex(h, sat, 45);
      ColorEngine.setPrimary(hex);
    });

    document.getElementById('sat-slider')?.addEventListener('input', (e) => {
      const sat = parseInt(e.target.value, 10);
      const h = parseInt(document.getElementById('hue-slider')?.value || '142', 10);
      const hex = ColorEngine.hsl2hex(h, sat, 45);
      ColorEngine.setPrimary(hex);
    });

    document.getElementById('dark-mode-toggle')?.addEventListener('change', (e) => {
      ColorEngine.setDarkMode(e.target.checked);
    });

    document.getElementById('btn-unlock-rgb')?.addEventListener('click', () => {
      ColorEngine.toggleLock();
    });

    document.getElementById('btn-reset-color')?.addEventListener('click', () => {
      ColorEngine.setPrimary('#7C9885');
    });

    ['rgb-r', 'rgb-g', 'rgb-b'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        const r = parseInt(document.getElementById('rgb-r').value, 10);
        const g = parseInt(document.getElementById('rgb-g').value, 10);
        const b = parseInt(document.getElementById('rgb-b').value, 10);
        const hex = ColorEngine.rgb2hex(r, g, b);
        ColorEngine.setPrimary(hex);
      });
    });

    document.getElementById('color-hex')?.addEventListener('change', (e) => {
      let val = e.target.value.trim().replace(/^#/, '');
      if (/^[0-9a-fA-F]{6}$/.test(val)) {
        ColorEngine.setPrimary('#' + val);
      }
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

    // --- Encrypted Backup Export & Import ---
    let cryptoAction = null; // 'export' | 'import'
    let cryptoImportPayload = null;

    document.getElementById('btn-export-encrypted')?.addEventListener('click', () => {
      cryptoAction = 'export';
      const modal = document.getElementById('crypto-modal');
      const title = document.getElementById('crypto-modal-title');
      const confirmGroup = document.getElementById('crypto-confirm-group');
      const pwd = document.getElementById('crypto-password');
      const confirmPwd = document.getElementById('crypto-confirm');
      if (title) title.textContent = I18n.t('exportEncrypted');
      if (confirmGroup) confirmGroup.style.display = 'block';
      if (pwd) pwd.value = '';
      if (confirmPwd) confirmPwd.value = '';
      modal?.classList.add('active');
      pwd?.focus();
    });

    document.getElementById('btn-import-encrypted')?.addEventListener('click', () => {
      document.getElementById('file-import-crypto')?.click();
    });

    document.getElementById('file-import-crypto')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        cryptoImportPayload = ev.target.result;
        cryptoAction = 'import';
        const modal = document.getElementById('crypto-modal');
        const title = document.getElementById('crypto-modal-title');
        const confirmGroup = document.getElementById('crypto-confirm-group');
        const pwd = document.getElementById('crypto-password');
        if (title) title.textContent = I18n.t('importEncrypted');
        if (confirmGroup) confirmGroup.style.display = 'none';
        if (pwd) pwd.value = '';
        modal?.classList.add('active');
        pwd?.focus();
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    document.getElementById('btn-crypto-submit')?.addEventListener('click', async () => {
      const pwd = document.getElementById('crypto-password')?.value || '';
      const confirmPwd = document.getElementById('crypto-confirm')?.value || '';
      const modal = document.getElementById('crypto-modal');

      if (!pwd) {
        Toast.show(I18n.t('passwordEmpty'), 'error');
        return;
      }

      if (cryptoAction === 'export') {
        if (pwd !== confirmPwd) {
          Toast.show(I18n.t('passwordMismatch'), 'error');
          return;
        }
        try {
          await CryptoBackup.exportEncrypted(pwd);
          modal?.classList.remove('active');
        } catch (err) {
          Toast.show(err.message, 'error');
        }
      } else if (cryptoAction === 'import') {
        try {
          await CryptoBackup.importEncrypted(cryptoImportPayload, pwd);
          modal?.classList.remove('active');
        } catch (err) {
          Toast.show(err.message, 'error');
        }
      }
    });

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
