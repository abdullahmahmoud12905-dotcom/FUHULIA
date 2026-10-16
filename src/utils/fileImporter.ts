import { AppId, FileItemType, FileSystemItem, PEBinaryInfo } from '../types/os';

export interface MatchedNativeAppInfo {
  appId: AppId;
  displayName: string;
  publisher: string;
  version: string;
  installPath: string;
  description: string;
  category: string;
}

export interface ImportedFilePayload {
  name: string;
  type: FileItemType;
  size: number;
  content?: string;
  mediaUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioArtist?: string;
  mimeType?: string;
  exePreset?: FileSystemItem['exePreset'];
  peInfo?: PEBinaryInfo;
  appId?: AppId;
  nativeAppMatch?: MatchedNativeAppInfo;
  relativePath?: string;
}

export interface FileImportOptions {
  useAiSynthesis?: boolean;
  targetFolderId?: string;
}

const KNOWN_NATIVE_APP_SIGNATURES: Array<{
  keywords: RegExp;
  info: MatchedNativeAppInfo;
}> = [
  {
    keywords: /\b(vscode|visual\s*studio\s*code|vs\s*code|vscodesetup|vscodeusersetup|code\.exe|code-stable|cursor|sublime|webstorm|pycharm|intellij|atom)\b/i,
    info: {
      appId: 'vscode',
      displayName: 'Visual Studio Code',
      publisher: 'Microsoft Corporation (Verified)',
      version: '1.96.2 (x64 Native IDE)',
      installPath: 'C:\\Program Files\\Microsoft VS Code',
      description: 'Full Visual Studio Code IDE with Live Preview, IntelliSense, Multi-File Explorer & GitHub Copilot AI',
      category: 'Developer Tools',
    },
  },
  {
    keywords: /\b(spotify|spotifysetup|itunes|apple\s*music|deezer|soundcloud|winamp|aimp|foobar2000|musicbee)\b/i,
    info: {
      appId: 'spotify',
      displayName: 'Spotify Music',
      publisher: 'Spotify AB (Verified)',
      version: '1.2.52.442 (x64)',
      installPath: 'C:\\Users\\Administrator\\AppData\\Roaming\\Spotify',
      description: 'Spotify Desktop Music Streamer & Local MP3 Audio Library Player',
      category: 'Entertainment & Audio',
    },
  },
  {
    keywords: /\b(msedge|microsoft\s*edge|edgesetup|chrome|chromesetup|google\s*chrome|firefox|brave|opera|vivaldi|browser)\b/i,
    info: {
      appId: 'edge',
      displayName: 'Microsoft Edge',
      publisher: 'Microsoft Corporation (Verified)',
      version: '131.0.2903.86 (Official Build 64-bit)',
      installPath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application',
      description: 'Multi-Tab Web Browser with Smart Search, Bookmarks Bar, Reader Mode & Local HTML Runner',
      category: 'Web Browser',
    },
  },
  {
    keywords: /\b(vlc|mediaplayer|wmplayer|windows\s*media|mpv|potplayer|kmplayer|gomplayer|mpc-hc|kodi|cinema)\b/i,
    info: {
      appId: 'mediaplayer',
      displayName: 'Windows Media Player Pro',
      publisher: 'Microsoft Corporation / VideoLAN',
      version: '11.2410.8.0 (x64)',
      installPath: 'C:\\Program Files\\Windows Media Player',
      description: '4K Video & Lossless Audio Player with 10-Band Web Audio Equalizer, Visualizer & Frame Snapshot',
      category: 'Multimedia',
    },
  },
  {
    keywords: /\b(acrobat|acrord32|adobe\s*reader|foxit|sumatrapdf|pdf\s*reader|pdfstudio|nitro\s*pdf|pdfxchange)\b/i,
    info: {
      appId: 'pdfreader',
      displayName: 'PDF Reader Studio',
      publisher: 'Microsoft / Adobe PDF Engine',
      version: '24.005.20320 (x64)',
      installPath: 'C:\\Program Files\\PDF Reader Studio',
      description: 'Document Viewer, Highlighter, Sticky Notes, Read Aloud TTS & AI Document Summarizer',
      category: 'Productivity',
    },
  },
  {
    keywords: /\b(wt\.exe|windows\s*terminal|terminal|powershell|pwsh|cmd\.exe|git-bash|gitsetup|putty|iterm|hyper|mobaxterm|cmder)\b/i,
    info: {
      appId: 'terminal',
      displayName: 'Windows Terminal',
      publisher: 'Microsoft Corporation (Verified)',
      version: '1.21.3231.0 (x64)',
      installPath: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminal',
      description: 'Windows PowerShell 7 & Command Prompt CLI Environment',
      category: 'Developer Tools',
    },
  },
  {
    keywords: /\b(mspaint|paint\.exe|paint\s*studio|photoshop|gimp|krita|inkscape|figma|canva|aseprite)\b/i,
    info: {
      appId: 'paint',
      displayName: 'Paint Studio',
      publisher: 'Microsoft Corporation (Verified)',
      version: '11.2408.30.0 (x64)',
      installPath: 'C:\\Program Files\\WindowsApps\\Microsoft.Paint',
      description: 'Digital Canvas, Brushes, Shapes, Gradients & PNG Image Exporter',
      category: 'Creativity & Design',
    },
  },
  {
    keywords: /\b(notepad|notepad\+\+|npp|wordpad|obsidian|notion|typora|evernote)\b/i,
    info: {
      appId: 'notepad',
      displayName: 'Notepad',
      publisher: 'Microsoft Corporation (Verified)',
      version: '11.2409.9.0 (x64)',
      installPath: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsNotepad',
      description: 'Fast Text, Markdown & HTML Code Editor',
      category: 'Productivity',
    },
  },
  {
    keywords: /\b(calc\.exe|calculator|desmos|speedcrunch)\b/i,
    info: {
      appId: 'calculator',
      displayName: 'Calculator',
      publisher: 'Microsoft Corporation (Verified)',
      version: '11.2405.2.0 (x64)',
      installPath: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsCalculator',
      description: 'Standard & Scientific Expression Calculator with History',
      category: 'Utilities',
    },
  },
  {
    keywords: /\b(taskmgr|task\s*manager|procexp|process\s*explorer|hwmonitor|cpuz|cpu-z|gpuz|speccy|afterburner)\b/i,
    info: {
      appId: 'taskmanager',
      displayName: 'Task Manager',
      publisher: 'Microsoft Corporation (Verified)',
      version: '10.0.26100.1 (x64)',
      installPath: 'C:\\Windows\\System32\\Taskmgr.exe',
      description: 'Live CPU/RAM/Disk/GPU Telemetry, Process Control & Active User Sessions',
      category: 'System Utilities',
    },
  },
  {
    keywords: /\b(photos\.exe|windows\s*photos|irfanview|faststone|xnview|picasa|lightroom)\b/i,
    info: {
      appId: 'photos',
      displayName: 'Photos',
      publisher: 'Microsoft Corporation (Verified)',
      version: '2024.11100.16009.0 (x64)',
      installPath: 'C:\\Program Files\\WindowsApps\\Microsoft.Windows.Photos',
      description: 'High-Resolution Image Gallery, Zoom & Visual Filter Studio',
      category: 'Multimedia',
    },
  },
  {
    keywords: /\b(winstore|microsoft\s*store|winget)\b/i,
    info: {
      appId: 'store',
      displayName: 'Microsoft Store',
      publisher: 'Microsoft Corporation (Verified)',
      version: '22410.1401.2.0 (x64)',
      installPath: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsStore',
      description: 'Official Windows 11 App & Game Marketplace',
      category: 'System',
    },
  },
  {
    keywords: /\b(copilot|chatgpt|claude|openai|ollama|lmstudio)\b/i,
    info: {
      appId: 'copilot',
      displayName: 'Windows Copilot AI',
      publisher: 'Microsoft AI (Verified)',
      version: '24H2.5.0 (x64)',
      installPath: 'C:\\Program Files\\Windows Copilot',
      description: 'Full OS Control Assistant, Multi-Session Chat, Voice Commands & App Builder',
      category: 'AI Assistant',
    },
  },
  {
    keywords: /\b(explorer\.exe|file\s*explorer|thispc|totalcmd|winrar|7zip|7zfm|peazip)\b/i,
    info: {
      appId: 'thispc',
      displayName: 'File Explorer',
      publisher: 'Microsoft Corporation (Verified)',
      version: '10.0.26100.2454 (x64)',
      installPath: 'C:\\Windows\\explorer.exe',
      description: 'Windows 11 File System & Drive Manager',
      category: 'System',
    },
  },
];

export function matchKnownNativeApp(fileNameOrTitle: string): MatchedNativeAppInfo | null {
  if (!fileNameOrTitle) return null;
  const normalized = fileNameOrTitle
    .replace(/[-_+.]/g, ' ')
    .replace(/\b(setup|installer|x64|x86|win32|win64|arm64|user|system|portable|full|latest|v\d+)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const entry of KNOWN_NATIVE_APP_SIGNATURES) {
    if (entry.keywords.test(fileNameOrTitle) || entry.keywords.test(normalized)) {
      return entry.info;
    }
  }
  return null;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readSliceAsArrayBuffer(file: File, maxBytes = 65536): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file.slice(0, maxBytes));
  });
}

/**
 * Extracts readable text snippets and metadata from a binary/PDF/EXE buffer
 */
async function inspectBinaryAndExtractStrings(file: File): Promise<{
  peInfo: PEBinaryInfo;
  extractedText: string;
}> {
  try {
    const buffer = await readSliceAsArrayBuffer(file, 96 * 1024);
    const bytes = new Uint8Array(buffer);
    const isValidMZ = bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a; // 'MZ'
    const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b; // 'PK'

    let architecture = isValidMZ ? 'x64 / Win32 PE Binary' : isZip ? 'ZIP / Archive Package' : 'Native Binary Stream';
    let subsystem = isValidMZ ? 'Windows GUI Subsystem (PE32+)' : isZip ? 'Compressed Package' : 'Universal App Container';

    if (isValidMZ && bytes.length > 0x40) {
      const peOffset =
        bytes[0x3c] |
        (bytes[0x3d] << 8) |
        (bytes[0x3e] << 16) |
        (bytes[0x3f] << 24);
      if (peOffset > 0 && peOffset + 6 < bytes.length) {
        const machine = bytes[peOffset + 4] | (bytes[peOffset + 5] << 8);
        if (machine === 0x8664) architecture = 'x86_64 (64-bit PE32+)';
        else if (machine === 0x014c) architecture = 'x86 (32-bit PE32)';
        else if (machine === 0xaa64) architecture = 'ARM64 Native PE';
      }
    }

    // Build hex preview of first 128 bytes
    const hexLines: string[] = [];
    const previewLen = Math.min(bytes.length, 128);
    for (let offset = 0; offset < previewLen; offset += 16) {
      const slice = bytes.slice(offset, offset + 16);
      const hex = Array.from(slice)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      const ascii = Array.from(slice)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
        .join('');
      hexLines.push(
        `${offset.toString(16).padStart(4, '0').toUpperCase()}  ${hex.padEnd(47, ' ')}  ${ascii}`
      );
    }

    // Extract printable strings of length >= 5
    const extractedStrings: string[] = [];
    let current = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) {
        current += String.fromCharCode(b);
      } else {
        if (current.length >= 5 && /[a-zA-Z0-9]{3,}/.test(current)) {
          extractedStrings.push(current.trim());
          if (extractedStrings.length >= 60) break;
        }
        current = '';
      }
    }

    return {
      peInfo: {
        isValidMZ,
        architecture,
        subsystem,
        hexPreview: hexLines.join('\n'),
        extractedStrings: extractedStrings.slice(0, 40),
      },
      extractedText: extractedStrings.join('\n'),
    };
  } catch {
    return {
      peInfo: {
        isValidMZ: false,
        architecture: 'Win32 / Universal Container',
        subsystem: 'Windows 11 Virtualized App',
        hexPreview: '4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF 00 00  MZ..............',
        extractedStrings: [file.name],
      },
      extractedText: '',
    };
  }
}

/**
 * Extracts readable text content from a raw PDF file buffer so PDF Reader Studio
 * can search, highlight, read aloud, and summarize imported PDFs.
 */
async function extractReadableTextFromPdf(file: File): Promise<string> {
  try {
    const buffer = await readSliceAsArrayBuffer(file, 256 * 1024);
    const bytes = new Uint8Array(buffer);
    const raw = new TextDecoder('latin1').decode(bytes);

    // Match text inside PDF parentheses (...) or BT ... ET blocks
    const matches: string[] = [];
    const parenRegex = /\(([^()\\]{3,200})\)/g;
    let m: RegExpExecArray | null;
    while ((m = parenRegex.exec(raw)) !== null) {
      const cleaned = m[1].replace(/[^\x20-\x7E\u0600-\u06FF]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.length >= 4 && /[a-zA-Z\u0600-\u06FF]{2,}/.test(cleaned)) {
        matches.push(cleaned);
        if (matches.length >= 120) break;
      }
    }

    if (matches.length > 0) {
      return `# ${file.name.replace(/\.pdf$/i, '')}\n\n` + matches.join(' ');
    }
    return `# ${file.name}\n\nتم استيراد ملف PDF الأصلي (${Math.max(1, Math.round(file.size / 1024))} KB) من جهاز الكمبيوتر الخاص بك. يمكنك تصفح المستند الأصلي بالكامل أو إضافة ملاحظات وتظليلات أو استخدام الذكاء الاصطناعي لتلخيصه.`;
  } catch {
    return `# ${file.name}\n\nملف PDF مستورد من جهازك جاهز للعرض والتحليل.`;
  }
}

/**
 * Builds an interactive, functional Windows 11 application wrapper for any imported PC program
 * (.exe, .msi, .apk, .zip, .bat, etc.), with built-in AI live customization so the user can
 * use the app and modify/extend it freely inside Windows.
 */
export function buildInteractiveWin11AppFallback(
  fileName: string,
  fileSize: number,
  ext: string,
  textPreview?: string
): string {
  const cleanTitle = fileName.replace(/\.[^/.]+$/, '') || fileName;
  const lower = `${cleanTitle} ${ext}`.toLowerCase();
  const isGame =
    ext === 'arcade' ||
    /game|play|craft|car|race|shoot|chess|flappy|snake|xo|tic|doom|gta|fifa|pes|valorant|pubg|roblox|minecraft|arcade|stronghold|crusader|لعبة|العاب/.test(
      lower
    );
  const isMedia =
    /vlc|player|video|audio|music|mp3|mp4|spotify|sound|radio|media|مشغل/.test(lower);
  const isDesign =
    ext === 'studio' ||
    /photo|paint|draw|figma|canva|adobe|blender|edit|image|design|studio|vector|pixel|تصميم|رسم/.test(
      lower
    );

  const safeTitle = cleanTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeFile = fileName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const kbSize = Math.max(1, Math.round(fileSize / 1024)).toLocaleString();
  const escapedPreview = (textPreview || '')
    .slice(0, 2000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
    body { background: #181818; color: #f3f4f6; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { height: 48px; background: #202020; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; flex-shrink: 0; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .badge { padding: 3px 8px; border-radius: 4px; background: rgba(0,120,212,0.2); border: 1px solid rgba(96,205,255,0.35); color: #60cdff; font-size: 11px; font-weight: 600; }
    .tabs { display: flex; gap: 6px; }
    .tab-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: #d1d5db; padding: 5px 12px; border-radius: 5px; font-size: 12px; cursor: pointer; transition: 0.15s; }
    .tab-btn.active, .tab-btn:hover { background: #0078d4; color: #fff; border-color: #60cdff; }
    main { flex: 1; display: flex; overflow: hidden; }
    .workspace { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .card { background: #222222; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; }
    .title { font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 4px; }
    .sub { font-size: 12px; color: #9ca3af; }
    .btn { background: #0078d4; color: #fff; border: none; padding: 8px 16px; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn:hover { background: #106ebe; }
    .btn-sec { background: rgba(255,255,255,0.07); color: #e5e7eb; border: 1px solid rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 5px; font-size: 12px; cursor: pointer; }
    .btn-sec:hover { background: rgba(255,255,255,0.12); }
    input, textarea { background: #141414; border: 1px solid rgba(255,255,255,0.14); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; width: 100%; outline: none; }
    input:focus, textarea:focus { border-color: #60cdff; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    canvas { background: #111; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; width: 100%; max-width: 640px; height: 340px; display: block; margin: 0 auto; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <strong style="font-size:14px">${safeTitle}</strong>
      <span class="badge">${ext.toUpperCase()} • ${kbSize} KB</span>
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchView('app', this)">واجهة التطبيق</button>
      <button class="tab-btn" onclick="switchView('customize', this)">تطوير وتعديل بالذكاء الاصطناعي</button>
      ${escapedPreview ? `<button class="tab-btn" onclick="switchView('raw', this)">بيانات الملف</button>` : ''}
    </div>
  </header>

  <main>
    <div id="view-app" class="workspace">
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <div class="title">${safeTitle}</div>
          <div class="sub">تم استيراد (${safeFile}) من جهازك وتشغيله داخل حاوية Windows 11 التفاعلية</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn" onclick="switchView('customize', document.querySelectorAll('.tab-btn')[1])">تعديل أو إضافة مميزات بالذكاء الاصطناعي</button>
        </div>
      </div>

      ${
        isGame
          ? `<div class="card" style="text-align:center;">
              <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                <span>النتيجة: <strong id="score" style="color:#60cdff">0</strong></span>
                <span style="font-size:12px;color:#9ca3af">استخدم الأسهم أو الماوس للتحكم</span>
                <button class="btn-sec" onclick="resetGame()">إعادة اللعب</button>
              </div>
              <canvas id="gameCanvas" width="600" height="320"></canvas>
            </div>`
          : isMedia
          ? `<div class="card">
              <h3 style="font-size:14px;margin-bottom:10px;">مشغل الوسائط المدمج (${safeTitle})</h3>
              <input type="file" accept="audio/*,video/*" onchange="loadLocalMedia(event)" style="margin-bottom:12px;" />
              <video id="mediaPlayer" controls style="width:100%;max-height:320px;background:#000;border-radius:6px;"></video>
            </div>`
          : isDesign
          ? `<div class="card">
              <div style="display:flex;gap:8px;margin-bottom:10px;align-items:center;">
                <input type="color" id="penColor" value="#60cdff" style="width:44px;height:32px;padding:2px;" />
                <input type="range" id="penSize" min="2" max="24" value="4" style="width:120px;" />
                <button class="btn-sec" onclick="clearPad()">مسح اللوحة</button>
              </div>
              <canvas id="drawCanvas" width="600" height="320"></canvas>
            </div>`
          : `<div class="grid-2">
              <div class="card">
                <h3 style="font-size:14px;margin-bottom:10px;color:#60cdff;">مساحة العمل السريعة (${safeTitle})</h3>
                <textarea id="appNotes" rows="8" placeholder="اكتب بياناتك أو ملاحظاتك أو أوامرك داخل ${safeTitle}..."></textarea>
                <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;">
                  <span id="saveMsg" style="font-size:11px;color:#10b981;"></span>
                  <button class="btn" onclick="saveData()">حفظ البيانات</button>
                </div>
              </div>
              <div class="card">
                <h3 style="font-size:14px;margin-bottom:10px;color:#60cdff;">أدوات التحكم والمهام</h3>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <div style="display:flex;gap:6px;">
                    <input id="taskInput" placeholder="أضف عنصر أو عملية جديدة..." />
                    <button class="btn" onclick="addTask()">إضافة</button>
                  </div>
                  <div id="taskList" style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;"></div>
                </div>
              </div>
            </div>`
      }
    </div>

    <div id="view-customize" class="workspace" style="display:none;">
      <div class="card">
        <div class="title">تخصيص وتطوير التطبيق (${safeTitle}) بالذكاء الاصطناعي</div>
        <div class="sub" style="margin-bottom:12px;">اكتب أي تعديل أو ميزة أو شكل تريده لهذا التطبيق وسيقوم الذكاء الاصطناعي بإعادة بنائه فوراً داخل نفس النافذة.</div>
        <textarea id="aiPrompt" rows="4" placeholder="مثال: حول هذا التطبيق إلى برنامج محاسبة متكامل، أو لعبة سباق سيارات، أو أضف له آلة حاسبة وجدول مهام..."></textarea>
        <div style="margin-top:10px;display:flex;gap:10px;align-items:center;">
          <button id="aiBtn" class="btn" onclick="rebuildWithAI()">تحديث التطبيق الآن</button>
          <span id="aiStatus" style="font-size:12px;color:#60cdff;"></span>
        </div>
      </div>
    </div>

    ${
      escapedPreview
        ? `<div id="view-raw" class="workspace" style="display:none;">
            <div class="card">
              <div class="title">بيانات وسلاسل الملف الأصلي (${safeFile})</div>
              <pre style="margin-top:10px;padding:12px;background:#111;border-radius:6px;overflow:auto;font-family:Consolas,monospace;font-size:12px;color:#cbd5e1;direction:ltr;text-align:left;">${escapedPreview}</pre>
            </div>
          </div>`
        : ''
    }
  </main>

  <script>
    const STORAGE_KEY = 'win11_imported_app_' + ${JSON.stringify(cleanTitle)};

    function switchView(id, btn) {
      ['app', 'customize', 'raw'].forEach(v => {
        const el = document.getElementById('view-' + v);
        if (el) el.style.display = (v === id) ? 'flex' : 'none';
      });
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
    }

    const notesEl = document.getElementById('appNotes');
    if (notesEl) {
      notesEl.value = localStorage.getItem(STORAGE_KEY + '_notes') || '';
    }
    function saveData() {
      if (!notesEl) return;
      localStorage.setItem(STORAGE_KEY + '_notes', notesEl.value);
      const msg = document.getElementById('saveMsg');
      if (msg) { msg.textContent = 'تم الحفظ بنجاح'; setTimeout(() => msg.textContent = '', 2000); }
    }

    let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY + '_tasks') || '[]');
    function renderTasks() {
      const list = document.getElementById('taskList');
      if (!list) return;
      list.innerHTML = tasks.map((t, i) =>
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#181818;border-radius:4px;font-size:12px;">' +
        '<span>' + t + '</span>' +
        '<button onclick="removeTask(' + i + ')" style="background:none;border:none;color:#f87171;cursor:pointer;">حذف</button>' +
        '</div>'
      ).join('');
    }
    function addTask() {
      const inp = document.getElementById('taskInput');
      if (!inp || !inp.value.trim()) return;
      tasks.unshift(inp.value.trim());
      inp.value = '';
      localStorage.setItem(STORAGE_KEY + '_tasks', JSON.stringify(tasks));
      renderTasks();
    }
    function removeTask(i) {
      tasks.splice(i, 1);
      localStorage.setItem(STORAGE_KEY + '_tasks', JSON.stringify(tasks));
      renderTasks();
    }
    renderTasks();

    function loadLocalMedia(e) {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const player = document.getElementById('mediaPlayer');
      if (player) {
        player.src = URL.createObjectURL(f);
        player.play();
      }
    }

    const gCanvas = document.getElementById('gameCanvas');
    let px = 260, bx = 300, by = 80, vx = 3.5, vy = 3.5, score = 0;
    function resetGame() { px = 260; bx = 300; by = 60; vx = 3.5; vy = 3.5; score = 0; }
    if (gCanvas) {
      const ctx = gCanvas.getContext('2d');
      window.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') px = Math.max(0, px - 28);
        if (e.key === 'ArrowRight') px = Math.min(500, px + 28);
      });
      gCanvas.addEventListener('mousemove', e => {
        const r = gCanvas.getBoundingClientRect();
        px = Math.max(0, Math.min(500, (e.clientX - r.left) * (600 / r.width) - 50));
      });
      function loop() {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 600, 320);
        bx += vx; by += vy;
        if (bx < 10 || bx > 590) vx = -vx;
        if (by < 10) vy = -vy;
        if (by > 270 && bx >= px && bx <= px + 100) {
          vy = -Math.abs(vy) * 1.03;
          score += 10;
          document.getElementById('score').textContent = score;
        }
        if (by > 320) resetGame();
        ctx.fillStyle = '#0078d4';
        ctx.fillRect(px, 285, 100, 12);
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#60cdff';
        ctx.fill();
        requestAnimationFrame(loop);
      }
      loop();
    }

    const dCanvas = document.getElementById('drawCanvas');
    function clearPad() {
      if (!dCanvas) return;
      const ctx = dCanvas.getContext('2d');
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, dCanvas.width, dCanvas.height);
    }
    if (dCanvas) {
      const ctx = dCanvas.getContext('2d');
      clearPad();
      let drawing = false;
      dCanvas.addEventListener('mousedown', () => drawing = true);
      window.addEventListener('mouseup', () => drawing = false);
      dCanvas.addEventListener('mousemove', e => {
        if (!drawing) return;
        const r = dCanvas.getBoundingClientRect();
        const x = (e.clientX - r.left) * (dCanvas.width / r.width);
        const y = (e.clientY - r.top) * (dCanvas.height / r.height);
        ctx.fillStyle = document.getElementById('penColor').value;
        const sz = Number(document.getElementById('penSize').value);
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    async function rebuildWithAI() {
      const promptEl = document.getElementById('aiPrompt');
      const statusEl = document.getElementById('aiStatus');
      const btn = document.getElementById('aiBtn');
      const text = promptEl.value.trim();
      if (!text) return;
      btn.disabled = true;
      statusEl.textContent = 'جاري تطوير وتحديث التطبيق بالذكاء الاصطناعي...';
      try {
        const res = await fetch('/api/ai/build-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: ${JSON.stringify(cleanTitle)},
            fileName: ${JSON.stringify(fileName)},
            description: text
          })
        });
        const data = await res.json();
        if (data && data.html && data.html.includes('<html')) {
          document.open();
          document.write(data.html);
          document.close();
        } else {
          statusEl.textContent = 'تعذر التحديث حالياً، حاول مرة أخرى.';
          btn.disabled = false;
        }
      } catch (err) {
        statusEl.textContent = 'حدث خطأ في الاتصال بالخادم.';
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`;
}

export async function readImportedBrowserFile(
  file: File,
  customPrompt?: string,
  options?: FileImportOptions
): Promise<ImportedFilePayload> {
  const name = file.name;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const mime = (file.type || '').toLowerCase();

  // 1. PDF Documents -> Native PDF Reader Studio
  if (ext === 'pdf' || mime === 'application/pdf') {
    const url =
      file.size <= 15 * 1024 * 1024
        ? await readAsDataURL(file)
        : URL.createObjectURL(file);
    const extractedText = await extractReadableTextFromPdf(file);
    return {
      name,
      type: 'pdf',
      size: file.size,
      mediaUrl: url,
      content: extractedText,
      mimeType: 'application/pdf',
    };
  }

  // 2. Video Files -> Windows Media Player Pro
  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v', 'ogv', '3gp'].includes(ext)
  ) {
    const url =
      file.size <= 15 * 1024 * 1024
        ? await readAsDataURL(file)
        : URL.createObjectURL(file);
    return {
      name,
      type: 'video',
      size: file.size,
      mediaUrl: url,
      mimeType: file.type || `video/${ext === 'mkv' ? 'x-matroska' : ext}`,
    };
  }

  // 3. Audio Files -> Windows Media Player Pro & Spotify
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus'].includes(ext)
  ) {
    const url =
      file.size <= 15 * 1024 * 1024
        ? await readAsDataURL(file)
        : URL.createObjectURL(file);
    return {
      name,
      type: 'audio',
      size: file.size,
      mediaUrl: url,
      audioUrl: url,
      audioArtist: 'Local PC Audio',
      mimeType: file.type || `audio/${ext}`,
    };
  }

  // 4. Image Files -> Windows Photos / Paint
  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif'].includes(ext)
  ) {
    const url =
      file.size <= 12 * 1024 * 1024
        ? await readAsDataURL(file)
        : URL.createObjectURL(file);
    return {
      name,
      type: 'image',
      size: file.size,
      mediaUrl: url,
      imageUrl: url,
      mimeType: file.type || `image/${ext}`,
    };
  }

  // 5. HTML / Web Applications -> Runnable App in Edge / VS Code
  if (ext === 'html' || ext === 'htm' || ext === 'svg') {
    const content = await readAsText(file);
    return {
      name,
      type: 'html',
      size: file.size,
      content,
      mimeType: 'text/html',
    };
  }

  // 6. Source Code Files -> VS Code Studio
  const codeExtensions = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'css',
    'scss',
    'less',
    'json',
    'py',
    'java',
    'c',
    'cpp',
    'h',
    'cs',
    'go',
    'rs',
    'php',
    'rb',
    'xml',
    'yml',
    'yaml',
    'sql',
    'sh',
    'ps1',
    'vue',
    'svelte',
  ];
  if (codeExtensions.includes(ext)) {
    const content = await readAsText(file);
    return {
      name,
      type: 'code',
      size: file.size,
      content,
      mimeType: file.type || 'text/plain',
    };
  }

  // 7. Plain Text / Markdown / Logs / CSV -> Notepad / VS Code
  const textExtensions = ['txt', 'md', 'ini', 'cfg', 'log', 'csv', 'env', 'rtf'];
  if (textExtensions.includes(ext) || mime.startsWith('text/')) {
    const content = await readAsText(file);
    return {
      name,
      type: 'text',
      size: file.size,
      content,
      mimeType: file.type || 'text/plain',
    };
  }

  // 8. Check if this file matches a Known Native OS Application (e.g., Visual Studio Code, Spotify, Edge, Chrome, VLC, PDF Reader, etc.)
  const nativeMatch = matchKnownNativeApp(name);
  if (nativeMatch && !(customPrompt && customPrompt.trim().length > 0)) {
    const { peInfo } = await inspectBinaryAndExtractStrings(file);
    return {
      name: nativeMatch.displayName,
      type: 'app',
      size: file.size,
      appId: nativeMatch.appId,
      nativeAppMatch: nativeMatch,
      peInfo,
    };
  }

  // 9. Native PC Executables, Installers & Packages (.exe, .msi, .apk, .zip, .bat, .cmd, .dmg, .app, .rar, .7z, .jar)
  if (
    [
      'exe',
      'msi',
      'bat',
      'cmd',
      'apk',
      'dmg',
      'app',
      'zip',
      'rar',
      '7z',
      'jar',
    ].includes(ext)
  ) {
    const { peInfo, extractedText } = await inspectBinaryAndExtractStrings(file);
    const appTitle = name.replace(/\.[^/.]+$/, '') || name;
    const shouldUseAi = Boolean(options?.useAiSynthesis || (customPrompt && customPrompt.trim().length > 0));

    if (shouldUseAi) {
      try {
        const response = await fetch('/api/ai/build-app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: appTitle,
            fileName: name,
            description:
              customPrompt ||
              `قم ببناء تطبيق ويب تفاعلي كامل وشغال يحاكي برنامج أو لعبة "${appTitle}" (${name}) بحيث يقدر المستخدم يستخدمه ويتفاعل معه بالكامل داخل Windows 11.`,
            fileSnippet: extractedText.slice(0, 1500),
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.html && String(data.html).includes('<html')) {
            return {
              name,
              type: 'exe',
              size: file.size,
              content: String(data.html),
              peInfo,
              exePreset: 'custom_app',
            };
          }
        }
      } catch {
        // Fall back to instant interactive Win11 container
      }
    }

    return {
      name,
      type: 'exe',
      size: file.size,
      content: buildInteractiveWin11AppFallback(
        name,
        file.size,
        ext,
        extractedText
      ),
      peInfo,
      exePreset: /game|play|craft|race|shoot|chess|arcade/i.test(appTitle)
        ? 'arcade'
        : 'tool',
    };
  }

  // 10. Unknown file -> Inspect binary or text and open in interactive container
  const { peInfo, extractedText } = await inspectBinaryAndExtractStrings(file);
  return {
    name,
    type: 'exe',
    size: file.size,
    content: buildInteractiveWin11AppFallback(
      name,
      file.size,
      ext || 'app',
      extractedText
    ),
    peInfo,
  };
}

/**
 * Reads an entire project folder uploaded via <input webkitdirectory> and returns
 * the folder name along with all parsed project files ready for Visual Studio Code.
 */
export async function readImportedProjectFolder(
  fileList: FileList
): Promise<{
  folderName: string;
  files: ImportedFilePayload[];
}> {
  const rawFiles = Array.from(fileList || []);
  if (rawFiles.length === 0) {
    return { folderName: 'ImportedProject', files: [] };
  }

  const firstRel = (rawFiles[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
  const folderName = firstRel.includes('/')
    ? firstRel.split('/')[0]
    : 'ImportedProject';

  const filteredFiles = rawFiles
    .filter((f) => {
      const rel = ((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name).replace(/\\/g, '/');
      return (
        !rel.includes('/node_modules/') &&
        !rel.includes('/.git/') &&
        !rel.includes('/dist/') &&
        !rel.includes('/.next/') &&
        !f.name.startsWith('.DS_Store')
      );
    })
    .slice(0, 45);

  const importedFiles: ImportedFilePayload[] = [];
  for (const file of filteredFiles) {
    const payload = await readImportedBrowserFile(file, undefined, { useAiSynthesis: false });
    const rel = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/\\/g, '/');
    importedFiles.push({
      ...payload,
      relativePath: rel,
    });
  }

  return {
    folderName,
    files: importedFiles,
  };
}

/**
 * Compatibility helper used by App.tsx and ThisPCApp.tsx when importing external PC files
 */
export async function parseRealExternalFile(file: File): Promise<{
  name: string;
  type: FileItemType;
  extra: Partial<FileSystemItem>;
}> {
  const imported = await readImportedBrowserFile(file);
  return {
    name: imported.name,
    type: imported.type,
    extra: {
      size: imported.size,
      content: imported.content,
      mediaUrl: imported.mediaUrl,
      imageUrl: imported.imageUrl,
      audioUrl: imported.audioUrl,
      audioArtist: imported.audioArtist,
      mimeType: imported.mimeType,
      exePreset: imported.exePreset,
      peInfo: imported.peInfo,
      appId: imported.appId,
    },
  };
}
