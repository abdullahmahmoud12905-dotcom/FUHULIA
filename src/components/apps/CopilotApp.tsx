import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  ExternalLink,
  FileCode,
  Play,
  Globe,
  RotateCcw,
  Check,
  Code2,
  Mic,
  MicOff,
  Paperclip,
  Volume2,
  VolumeX,
  Brain,
  Wrench,
  Eye,
  EyeOff,
  Monitor,
  X,
  Trash2,
  AlertTriangle,
  Plus,
  History,
  MessageSquare,
  Zap,
  Cpu,
  Image as ImageIcon,
  FileText,
  Layers,
  FolderGit2,
  Sparkles,
  Copy,
  Download,
  Square,
  Settings,
  Sliders,
  CheckCircle2,
  Music,
  ListMusic,
  Edit3,
  ListCheck,
  Hammer,
  Folder,
  ArrowRight,
} from 'lucide-react';
import {
  AIContextualMemory,
  AIMemoryItem,
  AppId,
  ChatAttachment,
  CopilotChatCustomization,
  CopilotTaskPlan,
  FileSystemItem,
  SnapPosition,
  SpotifyTrack,
  SystemAppMod,
  SystemSettings,
  WindowInstance,
} from '../../types/os';
import {
  AppIconRenderer,
  CUSTOM_ICON_PRESETS,
  CopilotSvgIcon,
  FileItemIconRenderer,
} from '../icons/WinIcons';
import { APP_DEFINITIONS, WALLPAPERS } from '../../data/initialFileSystem';
import {
  getAllStoreCatalogApps,
  loadCustomStoreApps,
  saveCustomStoreApps,
  StoreCatalogItem,
  StoreCategory,
} from './MicrosoftStoreApp';
import {
  MAX_AI_MEMORY_CHARS,
  dedupeFilesList,
  loadAIMemoryAsync,
  loadAIMemorySync,
  loadCopilotChatAsync,
  loadCopilotChatSync,
  sanitizeChatMessages,
  saveAIMemoryPersistence,
  saveCopilotChatPersistence,
} from '../../utils/osPersistence';
import { injectWin11KernelBridge } from '../../utils/kernelEngine';
import {
  searchRealSongs,
  loadSavedPlaylists,
  savePlaylists,
  CustomPlaylist,
} from '../../utils/spotifyAudioEngine';

function findStoreCatalogApp(query: string): StoreCatalogItem | undefined {
  const q = (query || '').toLowerCase().trim();
  if (!q) return undefined;
  const all = getAllStoreCatalogApps();
  return (
    all.find(
      (a) =>
        a.id.toLowerCase() === q ||
        a.name.toLowerCase().includes(q) ||
        q.includes(a.name.toLowerCase()) ||
        a.keywords.some((kw) => q.includes(kw.toLowerCase()))
    ) || undefined
  );
}

interface CopilotAppProps {
  files: FileSystemItem[];
  windows: WindowInstance[];
  settings: SystemSettings;
  spotifyTracks: SpotifyTrack[];
  onCreateItem: (
    name: string,
    type: FileSystemItem['type'],
    parentId?: string,
    extra?: Partial<FileSystemItem>
  ) => FileSystemItem;
  onEditItemContent: (
    id: string,
    newContent: string,
    newName?: string,
    extraMeta?: {
      addedFeature?: string;
      restorePrevious?: boolean;
      restoreVersion?: number;
    }
  ) => void;
  onOpenItem: (item: FileSystemItem) => void;
  onLaunchApp: (
    appId: AppId,
    options?: { fileId?: string; folderId?: string; customTitle?: string }
  ) => void;
  onCloseWindowByAppOrAll: (appIdOrAll: string) => void;
  onRenameItem: (id: string, newName: string) => void;
  onDeleteItems: (ids: string[]) => void;
  onRestoreItems: (ids: string[]) => void;
  onCopyItem: (
    item: FileSystemItem,
    targetFolder?: string,
    newName?: string
  ) => FileSystemItem;
  onMoveItems: (ids: string[], targetFolder: string) => void;
  onUpdateSettings: (partial: Partial<SystemSettings>) => void;
  onToggleFullScreen: (enable?: boolean) => void;
  onArrangeDesktop: () => void;
  onPlayAndAddSpotifySearch: (query: string) => Promise<string>;
  onSnapWindow?: (appId: AppId, position: SnapPosition) => void;
  onWindowAction?: (windowId: string, action: 'minimize' | 'maximize' | 'restore') => void;
  onTogglePreviewMode?: () => void;
  onPowerAction?: (action: 'lock' | 'restart' | 'shutdown' | 'sleep') => void;
  onNotify?: (title: string, message: string) => void;
  onBusyChange?: (isBusy: boolean) => void;
}

interface MusicRecommendation {
  title: string;
  artist: string;
  album: string;
}

interface WebSourceLink {
  title: string;
  url: string;
  provider: string;
}

interface GeneratedMediaItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  svgCode?: string;
  previousPrompt?: string;
}

interface ActionUndoSnapshot {
  id: string;
  label: string;
  prevSettings: SystemSettings;
  prevFilesMap: Record<
    string,
    { name: string; content?: string; parentId?: string }
  >;
  beforeFileIds: string[];
  newlyCreatedIds: string[];
  editedFileIds: string[];
  deletedFileIds: string[];
}

export interface WindowsAppPlanDraft {
  id: string;
  targetAppId: AppId;
  targetAppName: string;
  title: string;
  description: string;
  steps: string[];
  proposedMod: SystemAppMod;
  status: 'pending' | 'approved' | 'rejected';
}

export interface CopilotWebPreferences {
  noEmojis: boolean;
  minimalist: boolean;
  darkMode: boolean;
  customInstructions: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  executedBadges?: string[];
  affectedItems?: FileSystemItem[];
  generatedMedia?: GeneratedMediaItem[];
  musicList?: MusicRecommendation[];
  sources?: WebSourceLink[];
  attachments?: ChatAttachment[];
  execTimeMs?: number;
  undoSnapshotId?: string;
  undone?: boolean;
  planDraft?: WindowsAppPlanDraft;
  taskPlan?: CopilotTaskPlan;
  spotifyPlayTrack?: SpotifyTrack;
}

interface EditorChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export const DEFAULT_COPILOT_CONFIG: CopilotChatCustomization = {
  assistantName: 'Windows Copilot',
  subtitle: 'Windows 11 AI Assistant',
  welcomeMessage:
    'مرحباً بك في Windows Copilot. يمكنك التحدث بالصوت أو الكتابة، إرفاق الصور والملفات، تنفيذ أوامر مركبة، تعديل أي نافذة مفتوحة على الشاشة مباشرة، أو بناء ألعاب وتطبيقات كاملة مع معاينة حية وتصحيح تلقائي للأخطاء.',
  accentColor: '#2563eb',
  chatBgColor: '#FFFFFF',
  userBubbleColor: '#2563eb',
  aiBubbleColor: '#f8fafc',
  fontScale: 'normal',
  customBannerHtml: '',
  customCss: '',
  quickPrompts: [],
  aiMode: 'default',
  noEmojisInWebsites: true,
  outputDirectory: 'desktop',
};

function stripEmojis(text: string): string {
  return (text || '')
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ''
    )
    .trim();
}

function isPolicyRefusalText(text: string): boolean {
  if (!text) return false;
  return /لا يمكنني تلبية|لا يمكنني تنفيذ|لا يمكنني تقديم|لا يمكنني تصديم|لا يمكنني المساعدة|لا أستطيع تلبية|لا استطيع تلبية|لا أستطيع تقديم|لا استطيع تقديم|مصمم للالتزام|ملتزم بسياسات|سياسات المحتوى|سياسة المحتوى|سياسات الاستخدام|سياسات استخدام|سياسات استخدتم|آمنة ومحترمة|امنة و محترمة|محتوى إباحي|محتوي اباحي|غير لائق|المحتوى الآمن والمهني|المحتوي الامن و المهني|أعتذر، لا يمكنني|اعتذر لا يمكنني|عذراً، لا يمكنني|عذرا لا يمكنني|يتعارض مع سياسات|I cannot fulfill|cannot fulfill this request|safety policies|content policies|inappropriate content/i.test(
    text
  );
}

export function injectRuntimeErrorBridge(rawHtml: string, itemId: string): string {
  if (!rawHtml) return '';
  return injectWin11KernelBridge(rawHtml, itemId);
}

async function fetchLiveMusicList(query: string): Promise<MusicRecommendation[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&media=music&entity=song&limit=8`
    );
    const data = await res.json();
    if (Array.isArray(data?.results) && data.results.length > 0) {
      return data.results.slice(0, 8).map((r: any) => ({
        title: r.trackName || 'Track',
        artist: r.artistName || 'Artist',
        album: r.collectionName || 'Single',
      }));
    }
  } catch {
    // ignore network error
  }
  return [];
}

async function fetchMultiSourceWebKnowledge(rawQuery: string): Promise<{
  summary: string;
  sources: WebSourceLink[];
} | null> {
  const clean = rawQuery
    .replace(
      /^(قولي|ابحث عن|معلومات عن|ما هو|ما هي|من هو|من هي|مين هو|مين هي|عرفني|اشرح|اشرحلي|تكلم عن|كلمني عن|عاوز اعرف عن|عايز اعرف عن|ايه هو|ايه هي|فين|متى|امتى|لماذا|ليه|كيف|ازاي|what is|what are|who is|who are|tell me about|explain|search for|find info on|how does|where is|when did)\s+/i,
      ''
    )
    .replace(/[؟?!.]/g, '')
    .trim();

  if (!clean || clean.length < 2) return null;

  const sources: WebSourceLink[] = [];
  const snippets: string[] = [];

  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(
        clean
      )}&format=json&no_html=1&skip_disambig=1`
    );
    const ddg = await ddgRes.json();
    if (ddg?.AbstractText) {
      snippets.push(ddg.AbstractText);
      if (ddg.AbstractURL) {
        sources.push({
          title: ddg.Heading || clean,
          url: ddg.AbstractURL,
          provider: ddg.AbstractSource || 'Web',
        });
      }
    }
  } catch {
    // continue
  }

  if (snippets.length === 0) {
    const isArabic = /[\u0600-\u06FF]/.test(clean);
    const langs = isArabic ? ['ar', 'en'] : ['en', 'ar'];
    for (const lang of langs) {
      try {
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          clean
        )}&utf8=&format=json&origin=*`;
        const sRes = await fetch(searchUrl);
        const sData = await sRes.json();
        const hit = sData?.query?.search?.[0];
        if (hit?.title) {
          const sumUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
            hit.title
          )}`;
          const sumRes = await fetch(sumUrl);
          const sumData = await sumRes.json();
          if (sumData?.extract && sumData.type !== 'disambiguation') {
            snippets.push(sumData.extract);
            sources.push({
              title: sumData.title || hit.title,
              url:
                sumData?.content_urls?.desktop?.page ||
                `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
              provider: 'Wikipedia',
            });
            break;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (snippets.length === 0) return null;
  return {
    summary: stripEmojis(snippets.join('\n\n')),
    sources: sources.slice(0, 3),
  };
}

export function resolveAppIdFromName(raw: string): AppId | null {
  const q = raw.toLowerCase().trim();
  const map: Array<{ keys: string[]; id: AppId }> = [
    {
      keys: [
        'vscode',
        'vs code',
        'visual studio',
        'فيجوال ستوديو',
        'في اس كود',
        'محرر الكود',
        'محرر الاكواد',
        'كود',
      ],
      id: 'vscode',
    },
    {
      keys: ['settings', 'الاعدادات', 'الإعدادات', 'اعدادات', 'الضبط', 'ضبط النظام'],
      id: 'settings',
    },
    {
      keys: ['store', 'microsoft store', 'المتجر', 'ستور', 'متجر البرامج', 'متجر'],
      id: 'store',
    },
    {
      keys: ['spotify', 'سبوتيفاي', 'موسيقى', 'اغاني', 'الاغاني'],
      id: 'spotify',
    },
    {
      keys: ['edge', 'browser', 'google', 'chrome', 'المتصفح', 'متصفح', 'جوجل', 'ايدج', 'كروم'],
      id: 'edge',
    },
    {
      keys: ['notepad', 'المفكرة', 'نوت باد', 'مفكرة', 'مفكره'],
      id: 'notepad',
    },
    {
      keys: ['terminal', 'cmd', 'powershell', 'تيرمينال', 'ترمينال', 'موجه الاوامر', 'باورشيل'],
      id: 'terminal',
    },
    {
      keys: ['paint', 'الرسام', 'رسام', 'برنامج الرسم'],
      id: 'paint',
    },
    {
      keys: ['calculator', 'calc', 'الحاسبة', 'الآلة الحاسبة', 'اله حاسبه', 'حاسبة', 'حاسبه'],
      id: 'calculator',
    },
    {
      keys: ['photos', 'الصور', 'صور', 'معرض الصور', 'استوديو الصور'],
      id: 'photos',
    },
    {
      keys: ['taskmanager', 'task manager', 'مدير المهام', 'تاسك مانجر', 'المهام'],
      id: 'taskmanager',
    },
    {
      keys: ['recyclebin', 'recycle bin', 'سلة المحذوفات', 'السلة', 'سله المهملات', 'المحذوفات'],
      id: 'recyclebin',
    },
    {
      keys: ['thispc', 'this pc', 'file explorer', 'ماي كمبيوتر', 'الملفات', 'ملفاتي', 'كمبيوتر'],
      id: 'thispc',
    },
    {
      keys: ['installer', 'import', 'استيراد', 'تثبيت برنامج', 'مستورد الملفات'],
      id: 'installer',
    },
    {
      keys: ['pdfreader', 'pdf reader', 'pdf', 'قارئ pdf', 'ملف pdf', 'مستندات pdf', 'بي دي اف'],
      id: 'pdfreader',
    },
    {
      keys: [
        'mediaplayer',
        'media player',
        'video player',
        'vlc',
        'مشغل الفيديو',
        'مشغل الصوت',
        'مشغل الميديا',
        'ميديا بلاير',
      ],
      id: 'mediaplayer',
    },
    { keys: ['copilot', 'كوبايلوت', 'المساعد الذكي'], id: 'copilot' },
  ];
  for (const item of map) {
    if (item.keys.some((k) => q === k || q.includes(k))) {
      return item.id;
    }
  }
  return null;
}

async function requestBespokeAiApp(title: string, promptText: string): Promise<string> {
  const safeTitle = title.replace(/[<>&"']/g, '') || 'Custom AI Project';
  try {
    const res = await fetch('/api/ai/build-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: safeTitle,
        fileName: `${safeTitle}.html`,
        description: promptText,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const generated = data?.html || data?.htmlCode || '';
      if (typeof generated === 'string' && generated.trim().length > 80) {
        return generated;
      }
    }
  } catch {
    // ignore network error
  }
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Cairo', system-ui, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 640px; width: 100%; background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 32px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.4); }
    h1 { font-size: 26px; margin-bottom: 12px; color: #38bdf8; }
    p { color: #cbd5e1; line-height: 1.7; font-size: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p>${promptText.replace(/[<>&"']/g, '')}</p>
  </div>
</body>
</html>`;
}

export const CopilotApp: React.FC<CopilotAppProps> = ({
  files,
  windows,
  settings,
  onCreateItem,
  onEditItemContent,
  onOpenItem,
  onLaunchApp,
  onCloseWindowByAppOrAll,
  onRenameItem,
  onDeleteItems,
  onRestoreItems,
  onCopyItem,
  onMoveItems,
  onUpdateSettings,
  onToggleFullScreen,
  onArrangeDesktop,
  onPlayAndAddSpotifySearch,
  onSnapWindow,
  onWindowAction,
  onTogglePreviewMode,
  onPowerAction,
  onNotify,
  onBusyChange,
}) => {
  const copilotConfig: CopilotChatCustomization = useMemo(
    () => ({
      ...DEFAULT_COPILOT_CONFIG,
      ...(settings.copilotConfig || {}),
    }),
    [settings.copilotConfig]
  );

  const [drawerTab, setDrawerTab] = useState<'sessions' | 'memory' | 'undo'>('sessions');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = useCallback((textToCopy: string, idKey: string) => {
    if (!textToCopy) return;
    try {
      void navigator.clipboard.writeText(textToCopy);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = textToCopy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(idKey);
    setTimeout(() => {
      setCopiedId((prev) => (prev === idKey ? null : prev));
    }, 1800);
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const loaded = loadCopilotChatSync<ChatMessage>([
      {
        id: 'welcome',
        role: 'assistant',
        text: copilotConfig.welcomeMessage,
      },
    ]);
    const cleaned = loaded.filter(
      (m) => !(m.role === 'assistant' && isPolicyRefusalText(m.text))
    );
    return cleaned.length > 0
      ? cleaned
      : [
          {
            id: 'welcome',
            role: 'assistant',
            text: copilotConfig.welcomeMessage,
          },
        ];
  });
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastExecTimeMs, setLastExecTimeMs] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Copilot Settings Slide Drawer & Plan Mode State
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<
    'mode' | 'storage' | 'preferences' | 'sessions' | 'memory' | 'undo'
  >('mode');
  const [aiMode, setAiMode] = useState<'default' | 'plan'>(
    () => copilotConfig.aiMode || 'default'
  );
  const [outputDirectory, setOutputDirectory] = useState<string>(
    () => copilotConfig.outputDirectory || 'desktop'
  );
  const [noEmojisInWebsites, setNoEmojisInWebsites] = useState<boolean>(
    () => copilotConfig.noEmojisInWebsites !== false
  );
  const [customInstructions, setCustomInstructions] = useState<string>(
    () => copilotConfig.customInstructions || ''
  );
  const [activePlanEdits, setActivePlanEdits] = useState<
    Record<
      string,
      {
        editing?: boolean;
        steps?: Array<{ id: string; label: string; details?: string }>;
      }
    >
  >({});
  const [planFeedbackInputs, setPlanFeedbackInputs] = useState<
    Record<string, string>
  >({});

  // Dynamic context-aware smart suggestion pills (generates fresh AI ideas)
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([
    'بناء لعبة سباق 3D متكاملة بمحرك Three.js',
    'تصميم متجر إلكتروني تفاعلي مع لوحة بيانات وسلة',
    'توليد صورة فضاء وسدم كونية بدقة 4K فائقة',
    'تطوير موقع بورتفوليو احترافي بتأثيرات بصرية حية',
  ]);

  const handleRefreshSmartSuggestions = useCallback(() => {
    const pools = [
      'اعمل لعبة فضاء 3D بمحرك WebGL وكويكبات',
      'صمم تطبيق محادثات تفاعلي حديث مثل ديسكورد',
      'ولّد صورة مدينة نيون سيبرانية 4K وعينها خلفية',
      'أنشئ لوحة تحكم مالية ذكية ومخططات بيانية حية',
      'اعمل لعبة متاهة 3D مع فيزياء وتجميع نقاط',
      'صمم صفحة هبوط مبتكرة لشركة تقنية مع الوضع الليلي',
      'فعل الضوء الليلي ورتب أيقونات سطح المكتب',
      'شغل موسيقى هادئة وافتح الملاحظات على سطح المكتب',
      'بناء تطبيق حاسبة علمية متقدمة مع رسوم بيانية',
      'أنشئ مفكرة ذكية تدعم التنسيق والوسوم',
    ];
    const shuffled = [...pools].sort(() => 0.5 - Math.random()).slice(0, 4);
    setSmartSuggestions(shuffled);
  }, []);

  const handleSaveCopilotPreferences = useCallback(
    (newPrefs: Partial<CopilotChatCustomization>) => {
      const updated: CopilotChatCustomization = {
        ...copilotConfig,
        ...newPrefs,
        aiMode: newPrefs.aiMode ?? aiMode,
        outputDirectory:
          typeof newPrefs.outputDirectory === 'string'
            ? newPrefs.outputDirectory
            : outputDirectory,
        noEmojisInWebsites:
          typeof newPrefs.noEmojisInWebsites === 'boolean'
            ? newPrefs.noEmojisInWebsites
            : noEmojisInWebsites,
        customInstructions:
          typeof newPrefs.customInstructions === 'string'
            ? newPrefs.customInstructions
            : customInstructions,
      };
      if (typeof newPrefs.outputDirectory === 'string') {
        setOutputDirectory(newPrefs.outputDirectory);
      }
      onUpdateSettings({ copilotConfig: updated });
      setSaveMessage('تم حفظ إعدادات Copilot');
      setTimeout(() => setSaveMessage(''), 2500);
    },
    [
      copilotConfig,
      aiMode,
      outputDirectory,
      noEmojisInWebsites,
      customInstructions,
      onUpdateSettings,
    ]
  );

  useEffect(() => {
    onBusyChange?.(isLoading);
  }, [isLoading, onBusyChange]);

  // Multi-Session Chat History & Management (Up to 1,000,000 characters)
  const SESSIONS_STORAGE_KEY = 'win11_copilot_sessions_v2';
  const [chatSessions, setChatSessions] = useState<
    Array<{
      id: string;
      title: string;
      updatedAt: string;
      messages: ChatMessage[];
    }>
  >(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            messages: Array.isArray(s.messages)
              ? sanitizeChatMessages(
                  s.messages.filter(
                    (m: ChatMessage) =>
                      !(m.role === 'assistant' && isPolicyRefusalText(m.text))
                  )
                )
              : [],
          }));
        }
      }
    } catch {
      // ignore
    }
    const initialMessages = loadCopilotChatSync<ChatMessage>([
      {
        id: 'welcome',
        role: 'assistant',
        text: copilotConfig.welcomeMessage,
      },
    ]).filter((m) => !(m.role === 'assistant' && isPolicyRefusalText(m.text)));
    const firstUserMsg = initialMessages.find((m) => m.role === 'user');
    return [
      {
        id: 'session-initial',
        title: firstUserMsg ? firstUserMsg.text.slice(0, 42) : 'محادثة رئيسية',
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: initialMessages,
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.id) {
          return String(parsed[0].id);
        }
      }
    } catch {
      // ignore
    }
    return 'session-initial';
  });
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);

  // Contextual AI Memory state (1,000,000 Character Capacity)
  const [aiMemory, setAiMemory] = useState<AIContextualMemory>(() =>
    loadAIMemorySync()
  );

  // Hydrate full 1,000,000-character memory & chat history from IndexedDB on mount
  useEffect(() => {
    let mounted = true;
    void loadAIMemoryAsync().then((loadedMem) => {
      if (mounted && loadedMem && Array.isArray(loadedMem.items) && loadedMem.items.length > 0) {
        setAiMemory((prev) => ({
          ...prev,
          ...loadedMem,
          maxContextChars: MAX_AI_MEMORY_CHARS,
        }));
      }
    });
    void loadCopilotChatAsync<ChatMessage>([]).then((loadedChat) => {
      if (mounted && Array.isArray(loadedChat) && loadedChat.length > messages.length) {
        const cleaned = sanitizeChatMessages<ChatMessage>(
          loadedChat.filter(
            (m) => !(m.role === 'assistant' && isPolicyRefusalText(m.text))
          )
        );
        if (cleaned.length > 0) {
          setMessages(cleaned);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Compute live 1,000,000-character contextual memory footprint
  const usedContextChars = useMemo(() => {
    let total = 0;
    for (const m of messages) {
      total += (m.text || '').length;
      if (m.affectedItems) {
        for (const it of m.affectedItems) {
          total += (it.content || '').length;
        }
      }
    }
    for (const f of files) {
      if (f.parentId !== 'recyclebin' && f.content) {
        total += f.content.length;
      }
    }
    for (const item of aiMemory.items) {
      total += (item.summary || '').length;
    }
    return Math.min(MAX_AI_MEMORY_CHARS, total);
  }, [messages, files, aiMemory.items]);

  // Multimodal Attachments state
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  // Voice Command & Speech Synthesis state
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const [voiceLang, setVoiceLang] = useState<'ar-EG' | 'en-US'>('ar-EG');
  const speechRecRef = useRef<any>(null);

  // Live Open Screen Window Target
  const [targetedWindowId, setTargetedWindowId] = useState<string | null>(null);

  // Inline Live Preview & Auto-Fix state
  const [expandedPreviewIds, setExpandedPreviewIds] = useState<Record<string, boolean>>({});
  const [inlinePreviewDeviceById, setInlinePreviewDeviceById] = useState<Record<string, 'desktop' | 'tablet' | 'mobile'>>({});
  const [runtimeErrorsByItemId, setRuntimeErrorsByItemId] = useState<Record<string, string>>({});
  const [autoFixingItemId, setAutoFixingItemId] = useState<string | null>(null);
  const [actionUndoStack, setActionUndoStack] = useState<ActionUndoSnapshot[]>([]);
  const [editingMediaContext, setEditingMediaContext] = useState<{
    title: string;
    previousPrompt: string;
    imageUrl: string;
  } | null>(null);

  // Keep active session synced with messages & save to localStorage/IndexedDB
  useEffect(() => {
    saveCopilotChatPersistence(messages);
    setChatSessions((prev) => {
      const firstUser = messages.find((m) => m.role === 'user');
      const derivedTitle = firstUser
        ? firstUser.text.replace(/\s+/g, ' ').trim().slice(0, 44)
        : 'محادثة جديدة';
      const nowStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const exists = prev.some((s) => s.id === activeSessionId);
      const updated = exists
        ? prev.map((s) =>
            s.id === activeSessionId
              ? {
                  ...s,
                  title: firstUser ? derivedTitle : s.title,
                  updatedAt: nowStr,
                  messages,
                }
              : s
          )
        : [
            {
              id: activeSessionId,
              title: derivedTitle,
              updatedAt: nowStr,
              messages,
            },
            ...prev,
          ];
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updated.slice(0, 40)));
      } catch {
        // ignore quota errors
      }
      return updated;
    });
  }, [messages, activeSessionId]);

  const handleStartNewChat = () => {
    const newId = `session-${Date.now()}`;
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      text: copilotConfig.welcomeMessage,
    };
    const newSession = {
      id: newId,
      title: 'محادثة جديدة',
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [welcomeMsg],
    };
    setChatSessions((prev) => {
      const next = [newSession, ...prev];
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(next.slice(0, 40)));
      } catch {
        // ignore
      }
      return next;
    });
    setActiveSessionId(newId);
    setMessages([welcomeMsg]);
    setShowHistoryDrawer(false);
  };

  const handleSwitchSession = (sessionId: string) => {
    const target = chatSessions.find((s) => s.id === sessionId);
    if (!target) return;
    setActiveSessionId(target.id);
    setMessages(sanitizeChatMessages(target.messages));
    setShowHistoryDrawer(false);
  };

  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const remaining = chatSessions.filter((s) => s.id !== sessionId);
    if (remaining.length === 0) {
      const freshId = `session-${Date.now()}`;
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: copilotConfig.welcomeMessage,
      };
      const freshSession = {
        id: freshId,
        title: 'محادثة جديدة',
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        messages: [welcomeMsg],
      };
      setChatSessions([freshSession]);
      setActiveSessionId(freshId);
      setMessages([welcomeMsg]);
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([freshSession]));
      } catch {
        // ignore
      }
      return;
    }

    setChatSessions(remaining);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(remaining));
    } catch {
      // ignore
    }
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
      setMessages(remaining[0].messages);
    }
  };

  const handleClearAllSessions = () => {
    const freshId = `session-${Date.now()}`;
    const welcomeMsg: ChatMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      text: copilotConfig.welcomeMessage,
    };
    const freshSession = {
      id: freshId,
      title: 'محادثة جديدة',
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [welcomeMsg],
    };
    setChatSessions([freshSession]);
    setActiveSessionId(freshId);
    setMessages([welcomeMsg]);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([freshSession]));
    } catch {
      // ignore
    }
  };

  // Settings event listener so Mini Copilot gear button can open this dialog directly
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettingsModal(true);
    };
    window.addEventListener('win11-open-copilot-settings', handleOpenSettings);
    return () => window.removeEventListener('win11-open-copilot-settings', handleOpenSettings);
  }, []);

  // Context-aware Dynamic AI Quick Prompt Suggestions
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([
    'اعمل لعبة سباق ثلاثية الأبعاد 3D بـ Three.js وافتحها',
    'صمم موقع متجر أعمال بتصميم نظيف بدون إيموجي (Gemini Style)',
    'شغل أحدث أغاني عمرو دياب الحقيقية في Spotify',
    'في وضع Plan Mode: أعد تصميم تطبيق الحاسبة بميزات برمجية متقدمة',
  ]);

  const refreshDynamicSuggestions = useCallback(() => {
    const recentText = messages
      .slice(-6)
      .map((m) => m.text)
      .join(' ')
      .toLowerCase();

    if (
      recentText.includes('اغان') ||
      recentText.includes('سبوتيفاي') ||
      recentText.includes('موسيقى') ||
      recentText.includes('spotify')
    ) {
      setDynamicSuggestions([
        'شغل أغنية نور العين لعمرو دياب كاملة',
        'اعمل قائمة تشغيل لأغاني حماقي وكايروكي الحقيقية',
        'ضيف أغنية Save Your Tears إلى قائمة الأغاني المفضلة',
        'في وضع Plan Mode: اربط تشغيل الموسيقى مع إضاءة الشاشة',
      ]);
    } else if (
      recentText.includes('لعب') ||
      recentText.includes('3d') ||
      recentText.includes('three') ||
      recentText.includes('game')
    ) {
      setDynamicSuggestions([
        'اعمل لعبة طائرات فضاء ثلاثية الأبعاد 3D مع عداد نقاط',
        'صمم لعبة متاهة 3D بفيزياء تصادم حقيقية بـ Three.js',
        'في وضع Plan Mode: أضف أصوات واقعية وتحكم باللمس للعبة',
        'ابني لعبة سباق سيارات نيون ليلية 3D وافتحها مباشرة',
      ]);
    } else if (
      recentText.includes('حاسبة') ||
      recentText.includes('calculator') ||
      recentText.includes('مفكرة') ||
      recentText.includes('notepad')
    ) {
      setDynamicSuggestions([
        'في وضع Plan Mode: أعد تصميم تطبيق الحاسبة بدوال برمجية وعلمية',
        'في وضع Plan Mode: طور المفكرة بمحرر Markdown وعداد كلمات',
        'اعمل نسخة تجريبية لتطبيق الحاسبة مع رسم بياني للدوال',
        'أتمت نسخ العمليات الحسابية تلقائياً إلى المفكرة',
      ]);
    } else {
      const pools = [
        [
          'صمم موقع متجر أعمال احترافي نظيف بدون إيموجي (Gemini Style)',
          'اعمل لعبة 3D تفاعلية وافتحها على سطح المكتب',
          'شغل أغاني حقيقية في Spotify وأنشئ قائمة جديدة',
          'في وضع Plan Mode: أعد تصميم تطبيق الحاسبة بميزات متقدمة',
        ],
        [
          'اعمل لوحة تحكم ERP لإدارة المشاريع بتصميم مودرن',
          'في وضع Plan Mode: جهز نسخة تجريبية للمفكرة بمحرر كود متقدم',
          'شغل أغنية كايروكي كاملة في مشغل الموسيقى',
          'صمم أداة تحويل عملات وذهب فورية وافتحها نافذة مستقلة',
        ],
      ];
      const pick = pools[Math.floor(Math.random() * pools.length)];
      setDynamicSuggestions(pick);
    }
  }, [messages]);

  // Plan Mode Draft Handlers
  const handleApprovePlanDraft = useCallback(
    (draft: WindowsAppPlanDraft) => {
      onUpdateSettings({
        systemAppMods: {
          ...(settings.systemAppMods || {}),
          [draft.targetAppId]: draft.proposedMod,
        },
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.planDraft?.id === draft.id
            ? {
                ...m,
                planDraft: { ...m.planDraft, status: 'approved' },
                executedBadges: [
                  ...(m.executedBadges || []),
                  `تم اعتماد وتطبيق التعديل على ${draft.targetAppName}`,
                ],
              }
            : m
        )
      );
      onLaunchApp(draft.targetAppId);
    },
    [settings.systemAppMods, onUpdateSettings, onLaunchApp]
  );

  const handleRejectPlanDraft = useCallback((draftId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.planDraft?.id === draftId
          ? {
              ...m,
              planDraft: { ...m.planDraft, status: 'rejected' },
            }
          : m
      )
    );
  }, []);

  useEffect(() => {
    saveAIMemoryPersistence({
      ...aiMemory,
      maxContextChars: MAX_AI_MEMORY_CHARS,
      usedContextChars,
    });
  }, [aiMemory, usedContextChars]);

  // Listen for runtime errors and inline AI element edits from inline preview iframes
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'COPILOT_RUNTIME_ERROR' && e.data.itemId) {
        setRuntimeErrorsByItemId((prev) => ({
          ...prev,
          [String(e.data.itemId)]: String(e.data.message || 'Runtime Error'),
        }));
      } else if (e.data && e.data.type === 'WIN11_AI_INLINE_ELEMENT_EDIT' && e.data.itemId && e.data.instruction) {
        const targetItem = files.find((f) => f.id === String(e.data.itemId));
        if (targetItem && targetItem.content) {
          const elContext = e.data.elementInfo
            ? `العنصر المحدد: <${e.data.elementInfo.tag}> (${e.data.elementInfo.selector || ''}) النص الحالي: "${e.data.elementInfo.text || ''}"`
            : '';
          void fetch('/api/ai/app-edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetType: 'file',
              targetName: targetItem.name,
              fileType: targetItem.type,
              currentContent: targetItem.content,
              instruction: `${e.data.instruction}\n${elContext}\nعدل هذا العنصر أو القسم بدقة واحترافية مع الحفاظ على باقي المشروع بدون أي إيموجيز.`,
              featureHistory: targetItem.featureHistory || [],
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data?.updatedCode && typeof data.updatedCode === 'string') {
                onEditItemContent(targetItem.id, data.updatedCode, undefined, {
                  addedFeature: `تعديل ذكي لعنصر: ${String(e.data.instruction).slice(0, 50)}`,
                });
              }
            })
            .catch(() => {});
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [files, onEditItemContent]);

  const recordMemoryEntry = useCallback(
    (
      category: AIMemoryItem['category'],
      summary: string,
      extra?: Partial<AIContextualMemory> & { targetId?: string; targetName?: string }
    ) => {
      setAiMemory((prev) => {
        const cleanSummary = stripEmojis(summary).slice(0, 300);
        const filteredItems = prev.items.filter(
          (i) => i.summary !== cleanSummary && (extra?.targetId ? i.targetId !== extra.targetId : true)
        );
        const newItem: AIMemoryItem = {
          id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          category,
          summary: cleanSummary,
          targetId: extra?.targetId,
          targetName: extra?.targetName,
          updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        return {
          ...prev,
          maxContextChars: MAX_AI_MEMORY_CHARS,
          lastEditedFileId: extra?.lastEditedFileId ?? prev.lastEditedFileId,
          lastEditedFileName: extra?.lastEditedFileName ?? prev.lastEditedFileName,
          lastEditedFolderId: extra?.lastEditedFolderId ?? prev.lastEditedFolderId,
          lastEditedAppId: extra?.lastEditedAppId ?? prev.lastEditedAppId,
          items: [newItem, ...filteredItems].slice(0, 250),
        };
      });
    },
    []
  );

  const speakTextIfEnabled = useCallback(
    (text: string) => {
      if (!aiMemory.voiceTtsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(stripEmojis(text).slice(0, 260));
        utter.lang = /[\u0600-\u06FF]/.test(text) ? 'ar-SA' : 'en-US';
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speech synthesis errors
      }
    },
    [aiMemory.voiceTtsEnabled]
  );

  // Open windows on screen (excluding minimized or copilot itself)
  const openScreenWindows = useMemo(
    () => windows.filter((w) => w.isOpen && !w.isMinimized && w.appId !== 'copilot'),
    [windows]
  );

  const activeTargetedWindow = useMemo(
    () => openScreenWindows.find((w) => w.id === targetedWindowId) || null,
    [openScreenWindows, targetedWindowId]
  );

  // App & File Editor state
  const [selectedTargetKind, setSelectedTargetKind] = useState<
    'copilot_chat' | 'system_app' | 'file'
  >('copilot_chat');
  const [selectedSystemAppId, setSelectedSystemAppId] = useState<AppId>('copilot');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>(
    copilotConfig.assistantName
  );
  const [inspectorContent, setInspectorContent] = useState<string>(() =>
    JSON.stringify(copilotConfig, null, 2)
  );
  const [showRawCodeInEditor, setShowRawCodeInEditor] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const handleUndoActionSnapshot = useCallback(
    (snapshotId?: string) => {
      const targetSnap = snapshotId
        ? actionUndoStack.find((s) => s.id === snapshotId)
        : actionUndoStack[0];

      if (!targetSnap) {
        // Fallback: if in Studio or active file has previousContent, revert that file
        const activeF =
          files.find((f) => f.id === selectedFileId) ||
          (aiMemory.lastEditedFileId
            ? files.find((f) => f.id === aiMemory.lastEditedFileId)
            : undefined);
        if (activeF && activeF.previousContent) {
          onEditItemContent(activeF.id, '', undefined, {
            restorePrevious: true,
          });
          setSaveMessage('تم التراجع عن آخر تعديل برمجي');
          setTimeout(() => setSaveMessage(''), 2500);
        }
        return;
      }

      // 1. Revert all system settings (theme, wallpaper, volume, brightness, taskbar, app mods, copilot config)
      onUpdateSettings(targetSnap.prevSettings);

      // 2. Delete newly created files/folders from this turn
      if (targetSnap.newlyCreatedIds.length > 0) {
        onDeleteItems(targetSnap.newlyCreatedIds);
      }

      // 3. Restore edited or renamed files back to their pre-turn state
      for (const editedId of targetSnap.editedFileIds) {
        const before = targetSnap.prevFilesMap[editedId];
        if (before) {
          if (before.content !== undefined) {
            onEditItemContent(editedId, before.content, before.name);
          } else {
            onRenameItem(editedId, before.name);
          }
        }
      }

      // 4. Restore any deleted items from Recycle Bin
      if (targetSnap.deletedFileIds.length > 0) {
        onRestoreItems(targetSnap.deletedFileIds);
      }

      setActionUndoStack((prev) => prev.filter((s) => s.id !== targetSnap.id));
      setMessages((prev) =>
        prev.map((m) =>
          m.undoSnapshotId === targetSnap.id ? { ...m, undone: true } : m
        )
      );
      setSaveMessage(`تم التراجع عن: ${targetSnap.label}`);
      setTimeout(() => setSaveMessage(''), 3000);
    },
    [
      actionUndoStack,
      files,
      selectedFileId,
      aiMemory.lastEditedFileId,
      onUpdateSettings,
      onDeleteItems,
      onEditItemContent,
      onRenameItem,
      onRestoreItems,
    ]
  );

  const [editorChatMessages, setEditorChatMessages] = useState<EditorChatTurn[]>([
    {
      id: 'ed-welcome',
      role: 'assistant',
      text: 'اختر أي تطبيق من تطبيقات النظام أو أي ملف من القائمة الجانبية، ثم اكتب أو تحدث بصوتك بالتعديل المطلوب وسيتم تنفيذه وحفظه فوراً.',
    },
  ]);
  const [editorChatInput, setEditorChatInput] = useState<string>('');
  const [isEditorAiLoading, setIsEditorAiLoading] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const editorChatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    editorChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [editorChatMessages, isEditorAiLoading]);

  const editableFiles = useMemo(
    () =>
      files.filter(
        (f) =>
          (f.type === 'html' ||
            f.type === 'text' ||
            f.type === 'code' ||
            f.type === 'exe') &&
          f.parentId !== 'recyclebin'
      ),
    [files]
  );

  const handleToggleVoiceCommand = (targetMode: 'chat' | 'editor') => {
    if (isListeningVoice) {
      try {
        speechRecRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListeningVoice(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setMessages((prev) => [
        ...prev,
        {
          id: `voice-err-${Date.now()}`,
          role: 'assistant',
          text: 'المتصفح الحالي لا يدعم التعرف الصوتي المباشر (Web Speech API). يمكنك كتابة الأمر مباشرة.',
        },
      ]);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = voiceLang;
      rec.continuous = false;
      rec.interimResults = true;

      let finalTranscript = '';
      rec.onstart = () => setIsListeningVoice(true);
      rec.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t;
          } else {
            interim += t;
          }
        }
        const combined = (finalTranscript || interim).trim();
        if (targetMode === 'chat') {
          setInput(combined);
        } else {
          setEditorChatInput(combined);
        }
      };
      rec.onerror = () => {
        setIsListeningVoice(false);
      };
      rec.onend = () => {
        setIsListeningVoice(false);
        if (finalTranscript.trim()) {
          if (targetMode === 'chat') {
            void handleSend(finalTranscript.trim());
          }
        }
      };
      speechRecRef.current = rec;
      rec.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleFileAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const selected = Array.from(fileList).slice(0, 3);
    e.target.value = '';

    const loaded: ChatAttachment[] = [];
    for (const file of selected) {
      const isImg = file.type.startsWith('image/');
      if (isImg) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
        if (dataUrl) {
          loaded.push({
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            mimeType: file.type || 'image/png',
            kind: 'image',
            dataUrl,
          });
        }
      } else {
        const textContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || '').slice(0, 8000));
          reader.onerror = () => resolve('');
          reader.readAsText(file);
        });
        loaded.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          mimeType: file.type || 'text/plain',
          kind: /\.(html|css|js|ts|tsx|json|py)$/i.test(file.name) ? 'code' : 'text',
          textContent,
        });
      }
    }
    setPendingAttachments((prev) => [...prev, ...loaded].slice(0, 4));
  };

  const handleAutoFixItem = async (item: FileSystemItem) => {
    if (autoFixingItemId) return;
    const latestFile = files.find((f) => f.id === item.id) || item;
    const currentCode = latestFile.content || '';
    const errText =
      runtimeErrorsByItemId[item.id] ||
      'Inspect and fix any JavaScript runtime errors, missing DOM references, or broken controls.';

    setAutoFixingItemId(item.id);
    try {
      const res = await fetch('/api/ai/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentCode,
          errorMessage: errText,
          targetName: latestFile.name,
          isMultiFile: false,
        }),
      });
      const data = await res.json();
      if (data?.fixedCode && String(data.fixedCode).includes('<')) {
        onEditItemContent(latestFile.id, data.fixedCode, undefined, {
          addedFeature: 'Auto-Fix Runtime Error',
        });
        setRuntimeErrorsByItemId((prev) => {
          const copy = { ...prev };
          delete copy[item.id];
          return copy;
        });
        recordMemoryEntry('project', `تم إصلاح أخطاء ${latestFile.name} تلقائياً`, {
          lastEditedFileId: latestFile.id,
          lastEditedFileName: latestFile.name,
          targetId: latestFile.id,
          targetName: latestFile.name,
        });
      }
    } catch {
      // ignore
    } finally {
      setAutoFixingItemId(null);
    }
  };

  const handleSelectCopilotSelfInEditor = () => {
    setSelectedTargetKind('copilot_chat');
    setSelectedSystemAppId('copilot');
    setSelectedFileId('');
    setInspectorName(copilotConfig.assistantName);
    setInspectorContent(JSON.stringify(copilotConfig, null, 2));
    setSaveMessage('');
  };

  const handleSelectSystemAppInEditor = (appId: AppId) => {
    if (appId === 'copilot') {
      handleSelectCopilotSelfInEditor();
      return;
    }
    setSelectedTargetKind('system_app');
    setSelectedSystemAppId(appId);
    setSelectedFileId('');
    const appDef = APP_DEFINITIONS.find((a) => a.id === appId);
    const existingMod = settings.systemAppMods?.[appId] || {
      appId,
      customTitle: appDef?.name || appId,
      accentColor: '#0078d4',
      headerBgColor: '#202020',
      bannerText: '',
      useFullOverride: false,
    };
    setInspectorName(existingMod.customTitle || appDef?.name || appId);
    setInspectorContent(
      existingMod.useFullOverride && existingMod.fullOverrideHtml
        ? existingMod.fullOverrideHtml
        : JSON.stringify(existingMod, null, 2)
    );
    setSaveMessage('');
  };

  const handleSelectInspectorFile = (item: FileSystemItem) => {
    setSelectedTargetKind('file');
    setSelectedFileId(item.id);
    setInspectorName(item.name);
    setInspectorContent(item.content || '');
    setSaveMessage('');
  };

  const handleSaveManualCode = () => {
    if (selectedTargetKind === 'copilot_chat') {
      try {
        const parsed = JSON.parse(inspectorContent);
        onUpdateSettings({
          copilotConfig: {
            ...copilotConfig,
            ...parsed,
            assistantName:
              inspectorName.trim() || parsed.assistantName || copilotConfig.assistantName,
          },
        });
        setSaveMessage('تم الحفظ');
      } catch {
        onUpdateSettings({
          copilotConfig: {
            ...copilotConfig,
            assistantName: inspectorName.trim() || copilotConfig.assistantName,
          },
        });
        setSaveMessage('تم الحفظ');
      }
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    if (selectedTargetKind === 'system_app') {
      const existingMod = settings.systemAppMods?.[selectedSystemAppId] || {
        appId: selectedSystemAppId,
      };
      let nextMod: SystemAppMod = {
        ...existingMod,
        appId: selectedSystemAppId,
        customTitle: inspectorName.trim() || existingMod.customTitle,
        updatedAt: new Date().toLocaleTimeString(),
      };
      if (inspectorContent.trim().startsWith('<')) {
        nextMod.fullOverrideHtml = inspectorContent;
        nextMod.useFullOverride = true;
      } else {
        try {
          const parsed = JSON.parse(inspectorContent);
          nextMod = { ...nextMod, ...parsed, appId: selectedSystemAppId };
        } catch {
          nextMod.bannerText = inspectorContent.slice(0, 120);
        }
      }
      onUpdateSettings({
        systemAppMods: {
          ...(settings.systemAppMods || {}),
          [selectedSystemAppId]: nextMod,
        },
      });
      setSaveMessage('تم الحفظ');
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    if (!selectedFileId) return;
    onEditItemContent(
      selectedFileId,
      inspectorContent,
      inspectorName.trim() || undefined
    );
    setSaveMessage('تم الحفظ');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleResetSelectedAppMod = () => {
    if (selectedTargetKind === 'copilot_chat') {
      onUpdateSettings({ copilotConfig: DEFAULT_COPILOT_CONFIG });
      setInspectorName(DEFAULT_COPILOT_CONFIG.assistantName);
      setInspectorContent(JSON.stringify(DEFAULT_COPILOT_CONFIG, null, 2));
      setSaveMessage('تمت الاستعادة للوضع الأصلي');
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    if (selectedTargetKind === 'system_app') {
      const nextMods = { ...(settings.systemAppMods || {}) };
      delete nextMods[selectedSystemAppId];
      onUpdateSettings({ systemAppMods: nextMods });
      const appDef = APP_DEFINITIONS.find((a) => a.id === selectedSystemAppId);
      setInspectorName(appDef?.name || selectedSystemAppId);
      setInspectorContent(
        JSON.stringify({ appId: selectedSystemAppId, status: 'Default' }, null, 2)
      );
      setSaveMessage('تمت الاستعادة للوضع الأصلي');
      setTimeout(() => setSaveMessage(''), 2000);
    }
  };

  const handleSendEditorChatCommand = async () => {
    const cmd = editorChatInput.trim();
    if (!cmd || isEditorAiLoading) return;
    setEditorChatInput('');

    setEditorChatMessages((prev) => [
      ...prev,
      { id: `ed-u-${Date.now()}`, role: 'user', text: cmd },
    ]);
    setIsEditorAiLoading(true);

    const currentAppMod = settings.systemAppMods?.[selectedSystemAppId];
    const selectedFileObj =
      selectedTargetKind === 'file' ? files.find((f) => f.id === selectedFileId) : undefined;
    const targetFeatureHistory =
      selectedTargetKind === 'file'
        ? selectedFileObj?.featureHistory || []
        : selectedTargetKind === 'system_app'
        ? currentAppMod?.featureHistory || []
        : [];

    try {
      const res = await fetch('/api/ai/app-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cmd,
          targetType: selectedTargetKind,
          appId: selectedTargetKind === 'file' ? undefined : selectedSystemAppId,
          targetName: inspectorName,
          currentCode: inspectorContent,
          currentCopilotConfig: copilotConfig,
          currentAppMod,
          featureHistory: targetFeatureHistory,
          editorChatHistory: editorChatMessages.slice(-10),
        }),
      });
      const data = await res.json();

      if (data && !data.useLocalFallback) {
        if (data.resetToDefault) {
          handleResetSelectedAppMod();
        } else if (selectedTargetKind === 'copilot_chat') {
          if (data.clearChatHistory) {
            setMessages([
              {
                id: `welcome-${Date.now()}`,
                role: 'assistant',
                text: copilotConfig.welcomeMessage,
              },
            ]);
          }
          if (data.copilotPatch) {
            const cleanPatch = Object.fromEntries(
              Object.entries(data.copilotPatch).filter(
                ([_, v]) => v !== undefined && v !== null && v !== ''
              )
            );
            const mergedConfig: CopilotChatCustomization = {
              ...copilotConfig,
              ...cleanPatch,
            };
            onUpdateSettings({ copilotConfig: mergedConfig });
            setInspectorName(mergedConfig.assistantName);
            setInspectorContent(JSON.stringify(mergedConfig, null, 2));
          }
        } else if (selectedTargetKind === 'system_app') {
          if (data.appModPatch) {
            const cleanPatch = Object.fromEntries(
              Object.entries(data.appModPatch).filter(
                ([_, v]) => v !== undefined && v !== null && v !== ''
              )
            );
            const prevModFeatures = currentAppMod?.featureHistory || [];
            const mergedMod: SystemAppMod = {
              ...(currentAppMod || { appId: selectedSystemAppId }),
              ...cleanPatch,
              appId: selectedSystemAppId,
              featureHistory: [...prevModFeatures, cmd],
              updatedAt: new Date().toLocaleTimeString(),
            };
            onUpdateSettings({
              systemAppMods: {
                ...(settings.systemAppMods || {}),
                [selectedSystemAppId]: mergedMod,
              },
            });
            if (mergedMod.customTitle) {
              setInspectorName(mergedMod.customTitle);
            }
            setInspectorContent(
              mergedMod.useFullOverride && mergedMod.fullOverrideHtml
                ? mergedMod.fullOverrideHtml
                : JSON.stringify(mergedMod, null, 2)
            );
            recordMemoryEntry('project', `تعديل تطبيق النظام ${selectedSystemAppId}: ${cmd}`, {
              lastEditedAppId: selectedSystemAppId,
              targetId: selectedSystemAppId,
              targetName: inspectorName,
            });
          }
        } else if (selectedTargetKind === 'file' && selectedFileId && data.updatedCode) {
          setInspectorContent(data.updatedCode);
          onEditItemContent(
            selectedFileId,
            data.updatedCode,
            inspectorName.trim() || undefined,
            { addedFeature: cmd }
          );
          recordMemoryEntry('project', `تحديث ملف ${inspectorName}: ${cmd}`, {
            lastEditedFileId: selectedFileId,
            lastEditedFileName: inspectorName,
            targetId: selectedFileId,
            targetName: inspectorName,
          });
        }

        setEditorChatMessages((prev) => [
          ...prev,
          {
            id: `ed-a-${Date.now()}`,
            role: 'assistant',
            text: data.reply || 'تم تطبيق التعديل المطلوب مع الحفاظ على كافة الميزات السابقة.',
          },
        ]);
        setSaveMessage('تم التحديث التراكمي');
        setTimeout(() => setSaveMessage(''), 2000);
      } else {
        setEditorChatMessages((prev) => [
          ...prev,
          {
            id: `ed-a-${Date.now()}`,
            role: 'assistant',
            text: 'تعذر الاتصال بالخادم لتنفيذ التعديل حالياً، يرجى المحاولة مرة أخرى.',
          },
        ]);
      }
    } catch {
      setEditorChatMessages((prev) => [
        ...prev,
        {
          id: `ed-a-${Date.now()}`,
          role: 'assistant',
          text: 'حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.',
        },
      ]);
    } finally {
      setIsEditorAiLoading(false);
    }
  };

  const findItemByNameOrId = (target: string): FileSystemItem | undefined => {
    if (!target) return undefined;
    const q = target.toLowerCase().trim();
    return (
      files.find((f) => f.id === target || f.name.toLowerCase() === q) ||
      files.find((f) => f.name.toLowerCase().includes(q))
    );
  };

  // Multi-Action Compound Command Guarantee Layer:
  // Splits compound natural commands (connected by و / ثم / وبعدين / , / and / then) and executes any missed OS actions deterministically!
  const executeGuaranteedCommandIfMissed = async (
    rawInput: string,
    executedBadges: string[],
    affectedItems: FileSystemItem[]
  ): Promise<string | null> => {
    if (executedBadges.length > 0) return null;
    const fullText = rawInput
      .replace(/\bيفمني\b/g, 'يفهمني')
      .replace(/\bينفز\b/g, 'ينفذ')
      .trim();

    if (
      /^(ما هو|ما هي|من هو|من هي|مين|ليه|لماذا|كيف|ازاي|متى|امتى|هل |اشرح|عرفني|قولي معلومات|what|who|why|how|when|where|explain|tell me about)/i.test(
        fullText
      )
    ) {
      return null;
    }

    // Handle Contextual Memory continuation ("كمل على آخر مشروع" / "افتح آخر لعبة")
    if (
      /(كمل|اكمل|افتح|شغل)\s+(على\s+)?(آخر|اخر)\s+(مشروع|لعبة|لعبه|برنامج|تطبيق|ملف)/i.test(
        fullText
      )
    ) {
      if (aiMemory.lastEditedFileId) {
        const lastFile = files.find((f) => f.id === aiMemory.lastEditedFileId);
        if (lastFile) {
          onOpenItem(lastFile);
          affectedItems.push(lastFile);
          executedBadges.push(`فتح آخر مشروع: ${lastFile.name}`);
          return `تم فتح آخر مشروع عملت عليه "${lastFile.name}".`;
        }
      }
      if (aiMemory.lastEditedFolderId) {
        onLaunchApp('vscode', { folderId: aiMemory.lastEditedFolderId });
        executedBadges.push('فتح آخر مشروع في VS Code');
        return 'تم فتح آخر مشروع في Visual Studio Code.';
      }
    }

    const segments = fullText
      .split(
        /\s*(?:،|,|ثم|وبعدين|وبعدها|\band\b|\bthen\b|\s+و(?=(?:افتح|شغل|اقفل|اغلق|اقسم|اضبط|خلي|غير|اعمل|انشئ|ارفع|علي|زود|وطي|هدي|قلل|اكتم|رتب|نظم|ثبت)))\s*/i
      )
      .map((s) =>
        s
          .replace(
            /^(?:يا\s+كوبايلوت|كوبايلوت|لو\s+سمحت|ممكن|ياريت|يا\s+ريت|عاوزك|عايزك|عاوز|عايز|اريد|أريد|بقولك|من\s+فضلك)\s+/i,
            ''
          )
          .trim()
      )
      .filter(Boolean);

    const replies: string[] = [];
    let lastOpenedAppId: AppId | null = null;

    for (const text of segments) {
      const lower = text.toLowerCase();

      // 0. Create a project inside Visual Studio Code ("اعمل مشروع ... في فيجوال ستوديو كود")
      if (
        (lower.includes('مشروع') || lower.includes('project')) &&
        (lower.includes('vscode') ||
          lower.includes('vs code') ||
          lower.includes('فيجوال') ||
          lower.includes('كود'))
      ) {
        const projName =
          text
            .replace(
              /اعمل|اعملي|انشئ|أنشئ|برمج|صمم|افتح|فيجوال ستوديو كود|فيجوال ستوديو|في اس كود|vscode|vs code|مشروع|جوه|داخل|في/gi,
              ' '
            )
            .replace(/\s+/g, ' ')
            .trim() || 'Smart Web Project';
        const folder = onCreateItem(projName, 'folder', 'desktop');
        let htmlCode = `<!DOCTYPE html>\n<html lang="ar" dir="rtl">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>${projName}</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <main class="container">\n    <h1>${projName}</h1>\n    <p>${text}</p>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>`;
        let cssCode = `* { box-sizing: border-box; margin: 0; padding: 0; }\nbody { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; min-height: 100vh; padding: 32px; }`;
        let jsCode = `console.log('${projName} ready');`;

        try {
          const vsRes = await fetch('/api/ai/code-assist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: text,
              projectName: projName,
              htmlContext: '',
              cssContext: '',
              jsContext: '',
            }),
          });
          if (vsRes.ok) {
            const vsData = await vsRes.json();
            if (vsData?.htmlCode) htmlCode = vsData.htmlCode;
            if (vsData?.cssCode) cssCode = vsData.cssCode;
            if (vsData?.jsCode) jsCode = vsData.jsCode;
          }
        } catch {
          // ignore
        }

        onCreateItem('index.html', 'html', folder.id, {
          content: htmlCode,
          size: htmlCode.length,
        });
        onCreateItem('style.css', 'code', folder.id, {
          content: cssCode,
          size: cssCode.length,
        });
        onCreateItem('script.js', 'code', folder.id, {
          content: jsCode,
          size: jsCode.length,
        });
        affectedItems.push(folder);
        executedBadges.push(`مشروع VS Code: ${folder.name}`);
        onLaunchApp('vscode', {
          folderId: folder.id,
          customTitle: `${folder.name} - Visual Studio Code`,
        });
        replies.push(`تم إنشاء مشروع "${folder.name}" وفتحه في Visual Studio Code`);
        continue;
      }

      // 1. Open or Install App or File command
      const openMatch = text.match(
        /^(?:افتح|شغل|افتحلي|شغلي|تفتح|تشغل|ثبت|نزل|open|launch|start|install|run)\s+(.+)$/i
      );
      if (openMatch) {
        const targetStr = openMatch[1].trim();
        const appId = resolveAppIdFromName(targetStr);
        if (appId) {
          onLaunchApp(appId);
          lastOpenedAppId = appId;
          executedBadges.push(`فتح ${appId}`);
          replies.push(`تم فتح ${appId}`);
          if (lower.includes('يمين') || lower.includes('right')) {
            onSnapWindow?.(appId, 'right');
            executedBadges.push(`تقسيم ${appId} لليمين`);
          } else if (lower.includes('يسار') || lower.includes('شمال') || lower.includes('left')) {
            onSnapWindow?.(appId, 'left');
            executedBadges.push(`تقسيم ${appId} لليسار`);
          }
          continue;
        }
        const existingFile = findItemByNameOrId(targetStr);
        if (existingFile) {
          onOpenItem(existingFile);
          executedBadges.push(`فتح ${existingFile.name}`);
          replies.push(`تم فتح "${existingFile.name}"`);
          continue;
        }
        const matchedStoreApp = findStoreCatalogApp(targetStr);
        if (matchedStoreApp) {
          const alreadyInstalled = files.find(
            (f) =>
              f.parentId !== 'recyclebin' &&
              f.name.toLowerCase() === `${matchedStoreApp.name}.html`.toLowerCase()
          );
          const itemToOpen =
            alreadyInstalled ||
            onCreateItem(`${matchedStoreApp.name}.html`, 'html', 'desktop', {
              content: matchedStoreApp.htmlContent,
              size: 16384,
              featureHistory: [
                `تم التثبيت من Microsoft Store (${matchedStoreApp.version})`,
                ...matchedStoreApp.features,
              ],
            });
          affectedItems.push(itemToOpen);
          onOpenItem(itemToOpen);
          executedBadges.push(`تثبيت وتشغيل من المتجر: ${matchedStoreApp.name}`);
          replies.push(`تم تثبيت وتشغيل "${matchedStoreApp.name}" من Microsoft Store`);
          continue;
        }
        if (
          lower.includes('اغني') ||
          lower.includes('أغني') ||
          lower.includes('موسيق') ||
          lower.includes('song') ||
          lower.includes('music')
        ) {
          const played = await onPlayAndAddSpotifySearch(targetStr);
          executedBadges.push(`Spotify: ${played}`);
          replies.push(`تم تشغيل "${played}" على Spotify`);
          continue;
        }
      }

      // 1b. Snap window command ("اقسم الشاشة لليمين")
      if (lower.includes('اقسم') || lower.includes('snap') || lower.includes('قسم الشاشة')) {
        const snapTarget =
          resolveAppIdFromName(text) || lastOpenedAppId || openScreenWindows[0]?.appId;
        if (snapTarget && onSnapWindow) {
          const pos: SnapPosition =
            lower.includes('يسار') || lower.includes('شمال') || lower.includes('left')
              ? 'left'
              : 'right';
          onSnapWindow(snapTarget, pos);
          executedBadges.push(`تقسيم ${snapTarget} (${pos})`);
          replies.push(`تم تقسيم نافذة ${snapTarget}`);
          continue;
        }
      }

      // 2. Close App / Windows command
      if (/^(?:اقفل|اغلق|قفل|تقفل|close)\s+(.+)$/i.test(text)) {
        if (lower.includes('كل') || lower.includes('all') || lower.includes('النوافذ')) {
          onCloseWindowByAppOrAll('ALL');
          executedBadges.push('إغلاق جميع النوافذ');
          replies.push('تم إغلاق جميع النوافذ');
          continue;
        }
        const targetApp = resolveAppIdFromName(text);
        if (targetApp) {
          onCloseWindowByAppOrAll(targetApp);
          executedBadges.push(`إغلاق ${targetApp}`);
          replies.push(`تم إغلاق ${targetApp}`);
          continue;
        }
      }

      // 2b. Theme, Dark/Light Mode, Live Wallpaper & Arrange Desktop
      if (
        lower.includes('دارك مود') ||
        lower.includes('الوضع الليلي') ||
        lower.includes('ثيم غامق') ||
        lower.includes('dark mode')
      ) {
        onUpdateSettings({ theme: 'dark' });
        executedBadges.push('تفعيل الوضع الليلي (Dark Mode)');
        replies.push('تم تفعيل الوضع الليلي');
        continue;
      }
      if (
        lower.includes('لايت مود') ||
        lower.includes('الوضع النهاري') ||
        lower.includes('الوضع الفاتح') ||
        lower.includes('ثيم فاتح') ||
        lower.includes('light mode')
      ) {
        onUpdateSettings({ theme: 'light' });
        executedBadges.push('تفعيل الوضع الفاتح (Light Mode)');
        replies.push('تم تفعيل الوضع الفاتح');
        continue;
      }
      if (
        lower.includes('خلفية متحركة') ||
        lower.includes('خلفيه متحركه') ||
        lower.includes('خلفية حية') ||
        lower.includes('live wallpaper')
      ) {
        const preset = lower.includes('matrix') || lower.includes('ماتريكس')
          ? 'cyber-matrix'
          : lower.includes('نجوم') || lower.includes('star')
          ? 'starfield-3d'
          : 'fluent-aurora';
        onUpdateSettings({ liveWallpaperId: preset });
        executedBadges.push(`خلفية متحركة (${preset})`);
        replies.push('تم تشغيل الخلفية المتحركة التفاعلية');
        continue;
      }
      if (
        lower.includes('رتب سطح المكتب') ||
        lower.includes('رتب الديسكتوب') ||
        lower.includes('نظم الايقونات') ||
        lower.includes('arrange desktop')
      ) {
        onArrangeDesktop();
        executedBadges.push('ترتيب أيقونات سطح المكتب');
        replies.push('تم ترتيب أيقونات سطح المكتب');
        continue;
      }

      // 2c. Wi-Fi, Bluetooth, Night Light, Airplane Mode, Battery Saver, Desktop Icons
      if (/(واي فاي|وايفاي|الشبكة|النت|wifi|wi-fi)/i.test(lower)) {
        const turnOff = /(اطفي|إيقاف|اقفل|عطل|افصل|off|disable)/i.test(lower);
        const nextState = !turnOff;
        onUpdateSettings({ wifiEnabled: nextState });
        executedBadges.push(nextState ? 'تشغيل Wi-Fi' : 'إيقاف Wi-Fi');
        replies.push(nextState ? 'تم تشغيل اتصال Wi-Fi' : 'تم إيقاف اتصال Wi-Fi');
        continue;
      }
      if (/(بلوتوث|bluetooth)/i.test(lower)) {
        const turnOff = /(اطفي|إيقاف|اقفل|عطل|افصل|off|disable)/i.test(lower);
        const nextState = !turnOff;
        onUpdateSettings({ bluetoothEnabled: nextState });
        executedBadges.push(nextState ? 'تشغيل البلوتوث' : 'إيقاف البلوتوث');
        replies.push(nextState ? 'تم تشغيل البلوتوث' : 'تم إيقاف البلوتوث');
        continue;
      }
      if (/(الضوء الليلي|وضع القراءة|حماية العين|night light)/i.test(lower)) {
        const turnOff = /(اطفي|إيقاف|اقفل|عطل|الغاء|إلغاء|off|disable)/i.test(lower);
        const nextState = !turnOff;
        onUpdateSettings({ nightLight: nextState });
        executedBadges.push(nextState ? 'تفعيل الضوء الليلي' : 'إيقاف الضوء الليلي');
        replies.push(nextState ? 'تم تفعيل الضوء الليلي لحماية العين' : 'تم إيقاف الضوء الليلي');
        continue;
      }
      if (/(وضع الطيران|طيران|airplane)/i.test(lower)) {
        const turnOff = /(اطفي|إيقاف|اقفل|عطل|الغاء|إلغاء|off|disable)/i.test(lower);
        const nextState = !turnOff;
        onUpdateSettings({
          airplaneMode: nextState,
          ...(nextState ? { wifiEnabled: false, bluetoothEnabled: false } : {}),
        });
        executedBadges.push(nextState ? 'تفعيل وضع الطيران' : 'إيقاف وضع الطيران');
        replies.push(nextState ? 'تم تفعيل وضع الطيران' : 'تم إيقاف وضع الطيران');
        continue;
      }
      if (/(توفير الطاقة|موفر البطارية|battery saver)/i.test(lower)) {
        const turnOff = /(اطفي|إيقاف|اقفل|عطل|الغاء|إلغاء|off|disable)/i.test(lower);
        const nextState = !turnOff;
        onUpdateSettings({ batterySaver: nextState });
        executedBadges.push(nextState ? 'تفعيل موفر البطارية' : 'إيقاف موفر البطارية');
        replies.push(nextState ? 'تم تفعيل موفر البطارية' : 'تم إيقاف موفر البطارية');
        continue;
      }
      if (/(اخفي ايقونات|إخفاء أيقونات|اظهر ايقونات|إظهار أيقونات|ايقونات سطح المكتب|desktop icons)/i.test(lower)) {
        const hide = /(اخفي|إخفاء|خبي|hide)/i.test(lower);
        const nextVisible = !hide;
        onUpdateSettings({ desktopIconsVisible: nextVisible });
        executedBadges.push(nextVisible ? 'إظهار أيقونات سطح المكتب' : 'إخفاء أيقونات سطح المكتب');
        replies.push(nextVisible ? 'تم إظهار أيقونات سطح المكتب' : 'تم إخفاء أيقونات سطح المكتب');
        continue;
      }

      // 3. Volume & Brightness controls (with numbers OR relative colloquial phrases like "علي الصوت" / "هدي الاضاءة")
      if (
        lower.includes('صوت') ||
        lower.includes('volume') ||
        lower.includes('mute') ||
        lower.includes('إضاءة') ||
        lower.includes('اضاءة') ||
        lower.includes('اضاءه') ||
        lower.includes('النور') ||
        lower.includes('سطوع') ||
        lower.includes('brightness')
      ) {
        if (lower.includes('اكتم') || lower.includes('طفي الصوت') || lower.includes('mute')) {
          onUpdateSettings({ volume: 0, isMuted: true });
          executedBadges.push('كتم الصوت');
          replies.push('تم كتم الصوت');
        }
        const volMatch = text.match(/(?:صوت|الصوت|volume)\s*(?:على|لـ|الى|إلى)?\s*(\d{1,3})/i);
        if (volMatch) {
          const vol = Math.max(0, Math.min(100, Number(volMatch[1])));
          onUpdateSettings({ volume: vol, isMuted: vol === 0 });
          executedBadges.push(`الصوت ${vol}%`);
          replies.push(`تم ضبط الصوت على ${vol}%`);
        } else if (
          (lower.includes('صوت') || lower.includes('volume')) &&
          /(علي|ارفع|زود|عالي|up|increase|raise)/i.test(lower)
        ) {
          const nextVol = Math.min(100, (settings.volume || 50) + 25);
          onUpdateSettings({ volume: nextVol, isMuted: false });
          executedBadges.push(`رفع الصوت إلى ${nextVol}%`);
          replies.push(`تم رفع الصوت إلى ${nextVol}%`);
        } else if (
          (lower.includes('صوت') || lower.includes('volume')) &&
          /(وطي|هدي|قلل|نزل|واطي|down|lower|decrease)/i.test(lower)
        ) {
          const nextVol = Math.max(10, (settings.volume || 50) - 25);
          onUpdateSettings({ volume: nextVol, isMuted: false });
          executedBadges.push(`خفض الصوت إلى ${nextVol}%`);
          replies.push(`تم خفض الصوت إلى ${nextVol}%`);
        }

        const brMatch = text.match(
          /(?:اضاءة|إضاءة|اضاءه|الاضاءة|الإضاءة|النور|سطوع|brightness)\s*(?:على|لـ|الى|إلى)?\s*(\d{1,3})/i
        );
        if (brMatch) {
          const br = Math.max(60, Math.min(115, Number(brMatch[1])));
          onUpdateSettings({ brightness: br });
          executedBadges.push(`الإضاءة ${br}%`);
          replies.push(`تم ضبط الإضاءة على ${br}%`);
        } else if (
          (lower.includes('اضاء') ||
            lower.includes('إضاء') ||
            lower.includes('النور') ||
            lower.includes('سطوع') ||
            lower.includes('brightness')) &&
          /(علي|ارفع|زود|نور|up|increase|raise)/i.test(lower)
        ) {
          const nextBr = Math.min(115, (settings.brightness || 95) + 15);
          onUpdateSettings({ brightness: nextBr });
          executedBadges.push(`رفع الإضاءة إلى ${nextBr}%`);
          replies.push(`تم رفع الإضاءة إلى ${nextBr}%`);
        } else if (
          (lower.includes('اضاء') ||
            lower.includes('إضاء') ||
            lower.includes('النور') ||
            lower.includes('سطوع') ||
            lower.includes('brightness')) &&
          /(وطي|هدي|قلل|نزل|down|lower|dim)/i.test(lower)
        ) {
          const nextBr = Math.max(65, (settings.brightness || 95) - 18);
          onUpdateSettings({ brightness: nextBr });
          executedBadges.push(`تهدئة الإضاءة إلى ${nextBr}%`);
          replies.push(`تم تهدئة الإضاءة إلى ${nextBr}%`);
        }
        continue;
      }

      // 4. Power / Lock Screen actions
      if (
        lower.includes('ريستارت') ||
        lower.includes('اعادة تشغيل') ||
        lower.includes('إعادة تشغيل') ||
        lower === 'restart'
      ) {
        onPowerAction?.('restart');
        executedBadges.push('إعادة تشغيل النظام');
        return 'جاري إعادة تشغيل Windows 11...';
      }
      if (
        lower.includes('ايقاف التشغيل') ||
        lower.includes('إيقاف التشغيل') ||
        lower.includes('اقفل الجهاز') ||
        lower.includes('طفي الجهاز') ||
        lower === 'shutdown' ||
        lower === 'shut down'
      ) {
        onPowerAction?.('shutdown');
        executedBadges.push('إيقاف تشغيل النظام');
        return 'جاري إيقاف تشغيل Windows 11...';
      }
      if (
        lower.includes('اقفل الشاشة') ||
        lower.includes('شاشة القفل') ||
        lower.includes('lock screen')
      ) {
        onPowerAction?.('lock');
        executedBadges.push('قفل الشاشة');
        return 'تم قفل الشاشة.';
      }

      // 5. Create Folder
      const folderMatch = text.match(
        /^(?:اعمل|انشئ|أنشئ|كريت|create|make)\s+(?:فولدر|مجلد|folder)\s*(?:اسمه|باسم|named)?\s*(.+)$/i
      );
      if (folderMatch) {
        const fName = folderMatch[1].trim() || 'New Folder';
        const created = onCreateItem(fName, 'folder', 'desktop');
        affectedItems.push(created);
        executedBadges.push(`إنشاء مجلد ${created.name}`);
        replies.push(`تم إنشاء المجلد "${created.name}"`);
        continue;
      }

      // 5b. Create PDF Document
      if (
        (lower.includes('pdf') || lower.includes('بي دي اف')) &&
        /(اعمل|انشئ|أنشئ|اكتب|صمم|create|make|write)/i.test(lower)
      ) {
        const pdfTitle =
          text
            .replace(/اعمل|انشئ|أنشئ|اكتب|صمم|ملف|مستند|تقرير|pdf|بي دي اف|عن|باسم/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 28) || 'AI_Report';
        const pdfContent = `# ${pdfTitle}\n\nتم إنشاء هذا المستند الذكي بواسطة Windows 11 Copilot.\n\n• الموضوع: ${text}\n• التاريخ: ${new Date().toLocaleDateString()}\n\n---\n\n## Page 2: التفاصيل والتحليل\n\nيتضمن هذا القسم شرحاً تفصيلياً ونقاطاً منظمة حول "${pdfTitle}" مع إمكانية التعديل أو التلخيص بالذكاء الاصطناعي من داخل PDF Reader Studio.`;
        const createdPdf = onCreateItem(`${pdfTitle}.pdf`, 'pdf', 'desktop', {
          content: pdfContent,
          size: pdfContent.length,
          mimeType: 'application/pdf',
        });
        affectedItems.push(createdPdf);
        executedBadges.push(`إنشاء ملف PDF: ${createdPdf.name}`);
        onLaunchApp('pdfreader', {
          fileId: createdPdf.id,
          customTitle: `${createdPdf.name} - PDF Reader`,
        });
        replies.push(`تم إنشاء ملف PDF "${createdPdf.name}" وفتحه في قارئ PDF`);
        continue;
      }

      // 6. Create App / Game / Website / Guest Web Portal
      const createAppMatch = text.match(
        /^(?:اعمل|اعملي|اصنع|اصنعلي|انشئ|أنشئ|برمج|صمم|عاوز|عايز|build|create|make)\s+(?:اعمل\s+|تعمل\s+)?(?:لعبة|لعبه|تطبيق|برنامج|موقع|ويب|صفحة|صفحه|بوابة|سيستم|جيست|لجيست|اداة|أداة|آلة حاسبة|اله حاسبه|game|app|website|web|guest|portal|calculator|tool)\s*(.*)$/i
      );
      if (createAppMatch) {
        const desc = (createAppMatch[1] || text).trim();
        const cleanTitle = desc.slice(0, 28) || 'Custom App';
        const htmlContent = await requestBespokeAiApp(cleanTitle, text);
        const created = onCreateItem(`${cleanTitle}.html`, 'html', 'desktop', {
          content: htmlContent,
          size: htmlContent.length,
        });
        affectedItems.push(created);
        executedBadges.push(`إنشاء وتشغيل ${created.name}`);
        onOpenItem(created);
        setExpandedPreviewIds((prev) => ({ ...prev, [created.id]: true }));
        recordMemoryEntry('project', `إنشاء تطبيق ${created.name}`, {
          lastEditedFileId: created.id,
          lastEditedFileName: created.name,
          targetId: created.id,
          targetName: created.name,
        });
        replies.push(`تم إنشاء وتشغيل "${created.name}"`);
      }
    }

    return replies.length > 0 ? replies.join(' · ') : null;
  };

  // Export any single-file HTML app/game into a multi-file Visual Studio Code project folder while preserving featureHistory
  const handleExportAppToVSCode = useCallback(
    (sourceFile: FileSystemItem): FileSystemItem => {
      const baseName = sourceFile.name.replace(/\.[^/.]+$/, '') || 'StudioProject';
      const folderName = `${baseName}_Project`;
      const rawHtml = sourceFile.content || `<!DOCTYPE html>\n<html>\n<head><meta charset="UTF-8"/><title>${baseName}</title></head>\n<body><h1>${baseName}</h1></body>\n</html>`;

      // Extract <style> and <script> blocks cleanly if present
      const styleMatches = Array.from(rawHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi));
      const scriptMatches = Array.from(rawHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi));

      const extractedCss =
        styleMatches.map((m) => m[1].trim()).join('\n\n') ||
        `body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: #121212; color: #f3f3f3; }`;
      const extractedJs =
        scriptMatches.map((m) => m[1].trim()).join('\n\n') ||
        `console.log('${baseName} multi-file project initialized');`;

      let cleanedHtml = rawHtml
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

      if (cleanedHtml.includes('</head>')) {
        cleanedHtml = cleanedHtml.replace(
          '</head>',
          '  <link rel="stylesheet" href="style.css" />\n</head>'
        );
      }
      if (cleanedHtml.includes('</body>')) {
        cleanedHtml = cleanedHtml.replace(
          '</body>',
          '  <script src="script.js"></script>\n</body>'
        );
      }

      const prevFeatures = sourceFile.featureHistory || [`المشروع الأساسي: ${baseName}`];
      const folder = onCreateItem(folderName, 'folder', 'desktop', {
        featureHistory: prevFeatures,
      });

      onCreateItem('index.html', 'html', folder.id, {
        content: cleanedHtml,
        size: cleanedHtml.length,
        featureHistory: prevFeatures,
      });
      onCreateItem('style.css', 'code', folder.id, {
        content: extractedCss,
        size: extractedCss.length,
        featureHistory: prevFeatures,
      });
      onCreateItem('script.js', 'code', folder.id, {
        content: extractedJs,
        size: extractedJs.length,
        featureHistory: prevFeatures,
      });

      onLaunchApp('vscode', {
        folderId: folder.id,
        customTitle: `${folder.name} - Visual Studio Code`,
      });
      recordMemoryEntry('project', `تصدير "${baseName}" إلى VS Code`, {
        lastEditedFolderId: folder.id,
        targetId: folder.id,
        targetName: folder.name,
      });
      return folder;
    },
    [onCreateItem, onLaunchApp, recordMemoryEntry]
  );

  // Save generated image/artwork to Photos/Desktop and optionally set as Windows 11 Wallpaper
  const handleSaveMediaToSystem = useCallback(
    (media: GeneratedMediaItem, setWallpaper?: boolean) => {
      const cleanName = `${(media.title || 'AI_Artwork').replace(/[^\w\u0600-\u06FF-]/g, '_')}.svg`;
      const created = onCreateItem(cleanName, 'image', 'desktop', {
        imageUrl: media.imageUrl,
        mediaUrl: media.imageUrl,
        content: media.svgCode || '',
        size: (media.svgCode || media.imageUrl).length,
      });
      if (setWallpaper) {
        onUpdateSettings({
          customWallpaperUrl: media.imageUrl,
          liveWallpaperId: 'none',
        });
        setSaveMessage('تم تعيين الصورة كخلفية لسطح المكتب وحفظها بالملفات');
      } else {
        onOpenItem(created);
        setSaveMessage(`تم حفظ "${created.name}" في الملفات ومعرض الصور`);
      }
      setTimeout(() => setSaveMessage(''), 3000);
    },
    [onCreateItem, onOpenItem, onUpdateSettings]
  );

  // Direct browser download for generated/edited images inside chat
  const handleDownloadMedia = useCallback((media: GeneratedMediaItem) => {
    const cleanName = `${(media.title || 'AI_Artwork').replace(/[^\w\u0600-\u06FF-]/g, '_')}.svg`;
    try {
      const a = document.createElement('a');
      if (media.svgCode) {
        const blob = new Blob([media.svgCode], { type: 'image/svg+xml;charset=utf-8' });
        a.href = URL.createObjectURL(blob);
      } else {
        a.href = media.imageUrl;
      }
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSaveMessage(`جاري تحميل "${cleanName}"`);
      setTimeout(() => setSaveMessage(''), 2500);
    } catch {
      // ignore
    }
  }, []);

  const handleCancelResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `ai-cancel-${Date.now()}`,
        role: 'assistant',
        text: 'تم إلغاء الرد بناءً على طلبك.',
      },
    ]);
  }, []);

  const handleSend = async (
    promptText?: string,
    planOptions?: {
      planApproved?: boolean;
      approvedPlan?: CopilotTaskPlan;
      revisedSteps?: any[];
    }
  ) => {
    const rawInput = (promptText ?? input).trim();
    if ((!rawInput && pendingAttachments.length === 0) || isLoading) return;

    if (planOptions?.approvedPlan) {
      setMessages((prev) =>
        prev.map((m) =>
          m.taskPlan?.id === planOptions.approvedPlan?.id
            ? { ...m, taskPlan: { ...m.taskPlan, status: 'approved' } }
            : m
        )
      );
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const execStartMs = performance.now();
    const currentAttachments = [...pendingAttachments];
    setPendingAttachments([]);

    // Capture full pre-action snapshot so the user can Undo any option or change in one click
    const preSettingsSnapshot: SystemSettings = JSON.parse(
      JSON.stringify(settings)
    );
    const beforeFileIds = files.map((f) => f.id);
    const prevFilesMap: Record<
      string,
      { name: string; content?: string; parentId?: string }
    > = {};
    for (const f of files) {
      prevFilesMap[f.id] = {
        name: f.name,
        content: f.content,
        parentId: f.parentId,
      };
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: rawInput || `مرفق: ${currentAttachments.map((a) => a.name).join(', ')}`,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!promptText) setInput('');
    setIsLoading(true);

    try {
      const lower = rawInput.toLowerCase();
      const isMusicListQuery =
        (lower.includes('اغان') ||
          lower.includes('أغان') ||
          lower.includes('songs') ||
          lower.includes('tracks') ||
          lower.includes('funk') ||
          lower.includes('phonk') ||
          lower.includes('تريند')) &&
        !lower.startsWith('شغل ');

      let liveMusicResults: MusicRecommendation[] = [];
      let multiSourceData: { summary: string; sources: WebSourceLink[] } | null = null;
      let webContextString = '';

      if (isMusicListQuery) {
        const genreMatch =
          rawInput
            .replace(
              /قولي|ما هي|افضل|أفضل|احسن|أحسن|عشر|10|اغاني|أغاني|دلوقتي|حاليا|تريند|trending|top|ten|best|songs|music|right now|list/gi,
              ' '
            )
            .trim() || 'Top Hits';
        liveMusicResults = await fetchLiveMusicList(genreMatch);
        if (liveMusicResults.length > 0) {
          webContextString +=
            'Live Music Charts:\n' +
            liveMusicResults
              .map((m, i) => `${i + 1}. "${m.title}" by ${m.artist} (${m.album})`)
              .join('\n');
        }
      } else if (rawInput.length > 2) {
        multiSourceData = await fetchMultiSourceWebKnowledge(rawInput);
        if (multiSourceData) {
          webContextString += `Reference Info:\n${multiSourceData.summary}`;
        }
      }

      // Prepare open windows context for Real-Time Open Screen App Patching (Expanded for 1M context)
      const openWindowsPayload = openScreenWindows.map((w) => {
        const linkedFile = w.fileId ? files.find((f) => f.id === w.fileId) : undefined;
        return {
          windowId: w.id,
          appId: w.appId,
          title: w.title,
          fileId: w.fileId,
          fileName: linkedFile?.name,
          fileType: linkedFile?.type,
          codeSnippet: linkedFile?.content ? linkedFile.content.slice(0, 120000) : undefined,
        };
      });

      const targetedWindowPayload = activeTargetedWindow
        ? openWindowsPayload.find((w) => w.windowId === activeTargetedWindow.id)
        : openWindowsPayload[0] || undefined;

      // Resolve Active Project File across current session messages, targeted window, or AI Memory so Copilot NEVER forgets previous features!
      const lastSessionAffectedFile = (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const items = messages[i].affectedItems;
          if (items && items.length > 0) {
            const found = files.find((f) => f.id === items[0].id);
            if (
              found &&
              (found.type === 'html' ||
                found.type === 'code' ||
                found.type === 'text' ||
                found.type === 'exe')
            ) {
              return found;
            }
          }
        }
        return undefined;
      })();

      // Resolve last generated image in chat for iterative image editing via chat commands
      const lastChatGeneratedMedia = (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const mediaArr = messages[i].generatedMedia;
          if (mediaArr && mediaArr.length > 0) {
            return mediaArr[mediaArr.length - 1];
          }
        }
        return undefined;
      })();

      const activeProjectFile =
        (activeTargetedWindow?.fileId
          ? files.find((f) => f.id === activeTargetedWindow.fileId)
          : undefined) ||
        lastSessionAffectedFile ||
        (aiMemory.lastEditedFileId
          ? files.find((f) => f.id === aiMemory.lastEditedFileId)
          : undefined) ||
        (openScreenWindows.find((w) => w.fileId)?.fileId
          ? files.find((f) => f.id === openScreenWindows.find((w) => w.fileId)?.fileId)
          : undefined);

      const sessionUserPrompts = nextHistory
        .filter((m) => m.role === 'user')
        .map((m) => m.text.slice(0, 2000));

      const activeProjectPayload = activeProjectFile
        ? {
            id: activeProjectFile.id,
            name: activeProjectFile.name,
            type: activeProjectFile.type,
            fullCode: (activeProjectFile.content || '').slice(0, 350000),
            featureHistory:
              activeProjectFile.featureHistory && activeProjectFile.featureHistory.length > 0
                ? activeProjectFile.featureHistory
                : sessionUserPrompts.slice(0, -1),
          }
        : undefined;

      // Full Windows 11 OS state awareness (Desktop, Folders, Recycle Bin, System Apps, Mods & Settings)
      const fullOsState = {
        desktopFiles: files
          .filter((f) => f.parentId === 'desktop')
          .map((f) => ({
            id: f.id,
            name: f.name,
            type: f.type,
            size: f.size,
            featureCount: f.featureHistory?.length || 0,
          })),
        allFilesAndFolders: files
          .filter((f) => f.parentId !== 'recyclebin')
          .map((f) => ({
            id: f.id,
            name: f.name,
            type: f.type,
            parentId: f.parentId,
          })),
        recycleBinFiles: files
          .filter((f) => f.parentId === 'recyclebin')
          .map((f) => ({ id: f.id, name: f.name, type: f.type })),
        systemApps: APP_DEFINITIONS.map((a) => ({
          id: a.id,
          name: settings.systemAppMods?.[a.id]?.customTitle || a.name,
          isOpen: windows.some((w) => w.appId === a.id && w.isOpen),
          isModified: Boolean(settings.systemAppMods?.[a.id]),
        })),
        systemAppMods: settings.systemAppMods || {},
        theme: settings.theme,
        wallpaper: settings.wallpaperId,
        customWallpaperUrl: Boolean(settings.customWallpaperUrl),
        liveWallpaper: settings.liveWallpaperId || 'none',
        taskbarStyle: settings.taskbarStyle || 'mica',
        taskbarAlignment: settings.taskbarAlignment || 'center',
        accentColor: settings.accentColor || '#0078d4',
        volume: settings.volume,
        isMuted: settings.isMuted,
        brightness: settings.brightness,
      };

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          prompt: rawInput || 'قم بتحليل المرفقات وتنفيذ المطلوب بأقصى دقة',
          osState: fullOsState,
          openWindows: openWindowsPayload,
          targetedWindow: targetedWindowPayload,
          activeProject: activeProjectPayload,
          sessionUserPrompts,
          aiMemory: {
            ...aiMemory,
            maxContextChars: MAX_AI_MEMORY_CHARS,
            usedContextChars,
          },
          attachments: currentAttachments,
          lastGeneratedMediaSvg: lastChatGeneratedMedia?.svgCode,
          webContext: webContextString || undefined,
          aiMode: planOptions?.planApproved ? 'plan' : (copilotConfig.aiMode || aiMode),
          planApproved: Boolean(planOptions?.planApproved),
          customInstructions: copilotConfig.customInstructions || customInstructions,
          noEmojis: copilotConfig.noEmojisInWebsites !== false && noEmojisInWebsites,
          chatHistory: nextHistory
            .filter((m) => !isPolicyRefusalText(m.text))
            .slice(-120)
            .map((m) => ({
              role: m.role,
              text: m.text.slice(0, 12000),
            })),
        }),
      });

      const data = await res.json();

      if (data?.memoryNote) {
        recordMemoryEntry('fact', String(data.memoryNote));
      }

      const affectedItems: FileSystemItem[] = [];
      const executedBadges: string[] = [];
      const generatedMediaList: GeneratedMediaItem[] = [];

      // Check if user's command is an incremental feature addition or correction to the active project
      const isExplicitNewAppRequest =
        /(?:^|\s)(?:اعمل|اعملي|اصنع|اصنعلي|انشئ|أنشئ|برمج|صمم|عاوز|عايز|نبني|ابني|build|create|make|design)\s+(?:لي\s+|لنا\s+)?(?:مشروع|تطبيق|برنامج|لعبة|لعبه|موقع|ويب|صفحة|صفحه|بوابة|سيستم|نظام|متجر|كاشير|حاسبة|اداة|أداة|game|app|website|web|portal|system|store|tool|dashboard)/i.test(
          rawInput
        ) &&
        !/(?:في نفس|لنفس|على نفس|داخل نفس|للمشروع ده|في البرنامج ده|في التطبيق ده|في اللعبة دي)/i.test(
          rawInput
        );

      const isIncrementalFeaturePrompt =
        Boolean(activeProjectFile) &&
        !isExplicitNewAppRequest &&
        /(ضيف|اضف|أضف|زود|عدل|خلي|حط|كمان|ايضا|أيضاً|تنسى|ينسى|ميزة|ميزه|ميزات|مع الحفاظ|حسن|طور|شيل|احذف|بدل|غير|صلح|لا مش|مش كدا|كبر|صغر|لون|add |update |modify |include |also |keep |fix |change |remove |replace )/i.test(
          rawInput
        );

      if (Array.isArray(data?.actions)) {
        for (const act of data.actions) {
          const rawAction = String(act.actionType || act.type || '').trim();
          const normAction = rawAction
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .toLowerCase();

          switch (normAction) {
            case 'open_app':
            case 'launch_app':
            case 'open_settings': {
              const targetAppId =
                normAction === 'open_settings'
                  ? 'settings'
                  : (act.appId as AppId) ||
                    resolveAppIdFromName(act.targetName || act.fileName || act.appId || '');
              if (targetAppId) {
                onLaunchApp(targetAppId);
                executedBadges.push(`فتح ${targetAppId}`);
              }
              break;
            }

            case 'close_window':
            case 'close_app':
            case 'close_all': {
              const target =
                normAction === 'close_all' ? 'ALL' : act.appId || act.targetName || 'ALL';
              onCloseWindowByAppOrAll(target);
              executedBadges.push(`إغلاق ${target}`);
              break;
            }

            case 'generate_image':
            case 'create_image':
            case 'edit_image': {
              if (act.content) {
                const mediaItem: GeneratedMediaItem = {
                  id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  title: act.customTitle || act.fileName || 'AI Artwork',
                  description: act.query || rawInput,
                  imageUrl: act.content,
                  svgCode: act.customWidgetHtml,
                };
                generatedMediaList.push(mediaItem);
                executedBadges.push(`توليد صورة: ${mediaItem.title}`);
                if (
                  act.useFullOverride ||
                  /(خلفية|خلفيه|wallpaper)/i.test(rawInput)
                ) {
                  onUpdateSettings({
                    customWallpaperUrl: mediaItem.imageUrl,
                    liveWallpaperId: 'none',
                  });
                  executedBadges.push('تعيين كخلفية لسطح المكتب');
                }
              }
              break;
            }

            case 'create_pdf': {
              const pdfName = (act.fileName || act.targetName || 'Document.pdf').endsWith('.pdf')
                ? act.fileName || act.targetName
                : `${act.fileName || act.targetName || 'Document'}.pdf`;
              const pdfBody =
                act.content ||
                `# ${pdfName}\n\n${rawInput}\n\n---\n\n## Page 2\n\nتم إنشاء هذا المستند بواسطة Windows Copilot.`;
              const createdPdf = onCreateItem(pdfName, 'pdf', act.parentId || 'desktop', {
                content: pdfBody,
                size: pdfBody.length,
                mimeType: 'application/pdf',
              });
              affectedItems.push(createdPdf);
              executedBadges.push(`إنشاء PDF: ${createdPdf.name}`);
              onLaunchApp('pdfreader', {
                fileId: createdPdf.id,
                customTitle: `${createdPdf.name} - PDF Reader`,
              });
              break;
            }

            case 'summarize_pdf': {
              const targetPdf =
                findItemByNameOrId(act.targetName || act.fileName || '') ||
                files.find((f) => f.type === 'pdf' && f.parentId !== 'recyclebin');
              if (targetPdf) {
                affectedItems.push(targetPdf);
                executedBadges.push(`تحليل وتلخيص PDF: ${targetPdf.name}`);
                onLaunchApp('pdfreader', {
                  fileId: targetPdf.id,
                  customTitle: `${targetPdf.name} - PDF Reader`,
                });
              }
              break;
            }

            case 'export_to_vscode': {
              const sourceApp =
                findItemByNameOrId(act.targetName || act.fileName || '') || activeProjectFile;
              if (sourceApp) {
                const exportedFolder = handleExportAppToVSCode(sourceApp);
                affectedItems.push(exportedFolder);
                executedBadges.push(`تصدير إلى VS Code: ${exportedFolder.name}`);
              }
              break;
            }

            case 'install_store_app':
            case 'open_store_app': {
              const storeApp = findStoreCatalogApp(
                act.targetName || act.fileName || act.query || rawInput
              );
              if (storeApp) {
                const existing = files.find(
                  (f) =>
                    f.parentId !== 'recyclebin' &&
                    f.name.toLowerCase() === `${storeApp.name}.html`.toLowerCase()
                );
                const installedItem =
                  existing ||
                  onCreateItem(`${storeApp.name}.html`, 'html', 'desktop', {
                    content: storeApp.htmlContent,
                    size: 16384,
                    featureHistory: [
                      `تم التثبيت من Microsoft Store (${storeApp.version})`,
                      ...storeApp.features,
                    ],
                  });
                affectedItems.push(installedItem);
                executedBadges.push(`تثبيت وتشغيل: ${storeApp.name}`);
                onOpenItem(installedItem);
              } else {
                onLaunchApp('store');
                executedBadges.push('فتح Microsoft Store');
              }
              break;
            }

            case 'add_store_task': {
              const taskTxt = act.content || act.query || act.targetName || rawInput;
              try {
                const rawNotion = localStorage.getItem('win11_notionflow_data_v1');
                const parsedNotion = rawNotion
                  ? JSON.parse(rawNotion)
                  : { activeDocId: 'doc-1', docs: [], tasks: [] };
                parsedNotion.tasks = [
                  { id: `t-${Date.now()}`, text: taskTxt, status: 'todo' },
                  ...(Array.isArray(parsedNotion.tasks) ? parsedNotion.tasks : []),
                ];
                localStorage.setItem(
                  'win11_notionflow_data_v1',
                  JSON.stringify(parsedNotion)
                );
              } catch {
                // ignore
              }
              const notionApp = findStoreCatalogApp('notionflow');
              if (notionApp) {
                const existing = files.find(
                  (f) =>
                    f.parentId !== 'recyclebin' &&
                    f.name.toLowerCase() === `${notionApp.name}.html`.toLowerCase()
                );
                const installed =
                  existing ||
                  onCreateItem(`${notionApp.name}.html`, 'html', 'desktop', {
                    content: notionApp.htmlContent,
                    size: 16384,
                  });
                affectedItems.push(installed);
                onOpenItem(installed);
              }
              executedBadges.push(`إضافة مهمة في NotionFlow: ${taskTxt.slice(0, 32)}`);
              break;
            }

            case 'publish_store_app': {
              const appTitle =
                (act.fileName || act.customTitle || act.targetName || 'Smart Store Utility')
                  .replace(/\.html$/i, '')
                  .trim();
              const htmlBody =
                act.content ||
                act.fullOverrideHtml ||
                (await requestBespokeAiApp(appTitle, rawInput));
              const newStoreItem: StoreCatalogItem = {
                id: `store-ai-${Date.now()}`,
                name: appTitle,
                publisher: 'Windows Copilot AI Forge',
                category: (act.targetFolder as StoreCategory) || 'Productivity',
                rating: '5.0',
                downloads: 'New',
                version: '1.0.0',
                sizeLabel: '14.0 MB',
                accent: act.accentColor || '#0078d4',
                iconText: appTitle.slice(0, 2).toUpperCase(),
                description: act.query || rawInput,
                features: [
                  'تم بناؤه ونشره في Microsoft Store بواسطة Windows Copilot',
                  'متصل بجسر ملفات النظام وقابل للتعديل في VS Code',
                ],
                aiCapabilities: ['Copilot Published', 'Desktop Bridge', 'VS Code Ready'],
                keywords: [appTitle.toLowerCase(), 'ai', 'custom'],
                htmlContent: htmlBody,
                isCustomAiApp: true,
              };
              const currentCustom = loadCustomStoreApps();
              saveCustomStoreApps([newStoreItem, ...currentCustom]);
              window.dispatchEvent(new Event('win11-store-updated'));
              const createdFile = onCreateItem(`${appTitle}.html`, 'html', 'desktop', {
                content: htmlBody,
                size: htmlBody.length,
                featureHistory: [rawInput],
              });
              affectedItems.push(createdFile);
              executedBadges.push(`نشر في المتجر وتثبيت: ${appTitle}`);
              onLaunchApp('store');
              onOpenItem(createdFile);
              break;
            }

            case 'create_file':
            case 'create_app':
            case 'create_game':
            case 'create_website':
            case 'build_app': {
              const rawName = act.fileName || act.name || act.targetName || 'App.html';
              const isTextNote =
                act.fileType === 'text' || rawName.toLowerCase().endsWith('.txt');
              const finalType: FileSystemItem['type'] = isTextNote ? 'text' : 'html';
              const finalName =
                finalType === 'html' && !rawName.toLowerCase().endsWith('.html')
                  ? `${rawName.replace(/\.[^/.]+$/, '')}.html`
                  : rawName;
              const rawCandidateContent =
                act.content || act.fullOverrideHtml || act.customWidgetHtml || '';
              const finalContent =
                finalType === 'html'
                  ? rawCandidateContent.trim().length > 80
                    ? rawCandidateContent
                    : await requestBespokeAiApp(finalName.replace('.html', ''), rawInput)
                  : rawCandidateContent || rawInput;

              const existingSameFile = act.isNewProject
                ? files.find(
                    (f) =>
                      f.parentId !== 'recyclebin' &&
                      f.name.toLowerCase() === finalName.toLowerCase()
                  )
                : (isIncrementalFeaturePrompt ? activeProjectFile : undefined) ||
                  findItemByNameOrId(finalName);

              if (existingSameFile && existingSameFile.type === finalType && !act.isNewProject) {
                onEditItemContent(existingSameFile.id, finalContent, undefined, {
                  addedFeature: rawInput,
                });
                const prevFeats = existingSameFile.featureHistory || [];
                const nextFeats = prevFeats.includes(rawInput)
                  ? prevFeats
                  : [...prevFeats, rawInput];
                const updatedItem: FileSystemItem = {
                  ...existingSameFile,
                  previousContent: existingSameFile.content,
                  content: finalContent,
                  featureHistory: nextFeats,
                };
                affectedItems.push(updatedItem);
                executedBadges.push(
                  `تحديث تراكمي: ${updatedItem.name} (${nextFeats.length} ميزات)`
                );
                onOpenItem(updatedItem);
                setExpandedPreviewIds((prev) => ({ ...prev, [updatedItem.id]: true }));
                recordMemoryEntry(
                  'project',
                  `إضافة ميزة إلى "${updatedItem.name}": ${rawInput.slice(0, 60)}`,
                  {
                    lastEditedFileId: updatedItem.id,
                    lastEditedFileName: updatedItem.name,
                    targetId: updatedItem.id,
                    targetName: updatedItem.name,
                  }
                );
                break;
              }

              const targetParentId =
                act.parentId ||
                copilotConfig.outputDirectory ||
                outputDirectory ||
                'desktop';
              const created = onCreateItem(
                finalName,
                finalType,
                targetParentId,
                {
                  content: finalContent,
                  size: finalContent.length,
                  featureHistory: [rawInput],
                }
              );
              affectedItems.push(created);
              executedBadges.push(`إنشاء ${created.name}`);
              onOpenItem(created);
              if (finalType === 'html') {
                setExpandedPreviewIds((prev) => ({ ...prev, [created.id]: true }));
              }
              recordMemoryEntry('project', `تم بناء التطبيق "${created.name}"`, {
                lastEditedFileId: created.id,
                lastEditedFileName: created.name,
                targetId: created.id,
                targetName: created.name,
              });
              break;
            }

            case 'create_project_folder':
            case 'create_vscode_project': {
              const folderName = act.fileName || act.name || 'Web Project';
              const folder = onCreateItem(folderName, 'folder', act.parentId || 'desktop', {
                featureHistory: [rawInput],
              });
              const htmlCode =
                act.content ||
                `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8" />\n  <title>${folderName}</title>\n  <link rel="stylesheet" href="style.css" />\n</head>\n<body>\n  <h1>${folderName}</h1>\n  <script src="script.js"></script>\n</body>\n</html>`;
              const cssCode =
                act.cssContent ||
                `body { font-family: system-ui, sans-serif; background: #121212; color: #ffffff; padding: 32px; }`;
              const jsCode = act.jsContent || `console.log('${folderName} ready');`;

              onCreateItem('index.html', 'html', folder.id, {
                content: htmlCode,
                size: htmlCode.length,
                featureHistory: [rawInput],
              });
              onCreateItem('style.css', 'code', folder.id, {
                content: cssCode,
                size: cssCode.length,
              });
              onCreateItem('script.js', 'code', folder.id, {
                content: jsCode,
                size: jsCode.length,
              });

              affectedItems.push(folder);
              executedBadges.push(`مشروع VS Code: ${folder.name}`);
              onLaunchApp('vscode', {
                folderId: folder.id,
                customTitle: `${folder.name} - Visual Studio Code`,
              });
              recordMemoryEntry('project', `مشروع VS Code "${folder.name}"`, {
                lastEditedFolderId: folder.id,
                targetId: folder.id,
                targetName: folder.name,
              });
              break;
            }

            case 'create_folder': {
              const created = onCreateItem(
                act.fileName || act.name || act.targetName || 'New Folder',
                'folder',
                act.parentId || 'desktop'
              );
              affectedItems.push(created);
              executedBadges.push(`مجلد جديد: ${created.name}`);
              break;
            }

            case 'edit_file':
            case 'modify_file':
            case 'edit_open_window': {
              const target =
                findItemByNameOrId(act.targetName || act.fileName || '') ||
                activeProjectFile ||
                (activeTargetedWindow?.fileId
                  ? files.find((f) => f.id === activeTargetedWindow.fileId)
                  : undefined) ||
                (openScreenWindows.find((w) => w.fileId)?.fileId
                  ? files.find((f) => f.id === openScreenWindows.find((w) => w.fileId)?.fileId)
                  : undefined) ||
                (aiMemory.lastEditedFileId
                  ? files.find((f) => f.id === aiMemory.lastEditedFileId)
                  : undefined);

              if (target && act.content) {
                onEditItemContent(target.id, act.content, act.newName, {
                  addedFeature: rawInput,
                });
                const prevFeats = target.featureHistory || [];
                const nextFeats = prevFeats.includes(rawInput)
                  ? prevFeats
                  : [...prevFeats, rawInput];
                const updatedItem: FileSystemItem = {
                  ...target,
                  name: act.newName || target.name,
                  previousContent: target.content,
                  content: act.content,
                  featureHistory: nextFeats,
                };
                affectedItems.push(updatedItem);
                executedBadges.push(
                  `تحديث وتنفيذ: ${updatedItem.name}`
                );
                onOpenItem(updatedItem);
                setExpandedPreviewIds((prev) => ({ ...prev, [updatedItem.id]: true }));
                recordMemoryEntry(
                  'project',
                  `تعديل "${updatedItem.name}": ${rawInput.slice(0, 60)}`,
                  {
                    lastEditedFileId: updatedItem.id,
                    lastEditedFileName: updatedItem.name,
                    targetId: updatedItem.id,
                    targetName: updatedItem.name,
                  }
                );
              } else if (act.content) {
                const fallbackName =
                  act.targetName || act.fileName || act.newName || 'UpdatedApp.html';
                const cleanFallbackName = fallbackName.toLowerCase().endsWith('.html')
                  ? fallbackName
                  : `${fallbackName}.html`;
                const created = onCreateItem(
                  cleanFallbackName,
                  'html',
                  act.parentId || 'desktop',
                  {
                    content: act.content,
                    size: act.content.length,
                    featureHistory: [rawInput],
                  }
                );
                affectedItems.push(created);
                executedBadges.push(`إنشاء وتشغيل: ${created.name}`);
                onOpenItem(created);
                setExpandedPreviewIds((prev) => ({ ...prev, [created.id]: true }));
                recordMemoryEntry('project', `إنشاء "${created.name}"`, {
                  lastEditedFileId: created.id,
                  lastEditedFileName: created.name,
                  targetId: created.id,
                  targetName: created.name,
                });
              }
              break;
            }

            case 'rename_item': {
              const target = findItemByNameOrId(act.targetName || act.fileName || '');
              if (target && act.newName) {
                onRenameItem(target.id, act.newName);
                executedBadges.push(`إعادة تسمية إلى ${act.newName}`);
              }
              break;
            }

            case 'delete_item': {
              if (act.targetName === 'ALL_DESKTOP' || act.targetName === 'ALL') {
                const deskIds = files
                  .filter((f) => f.parentId === 'desktop' && f.appId !== 'recyclebin')
                  .map((f) => f.id);
                onDeleteItems(deskIds);
                executedBadges.push(`حذف ${deskIds.length} عنصر`);
              } else {
                const target = findItemByNameOrId(act.targetName || act.fileName || '');
                if (target) {
                  onDeleteItems([target.id]);
                  executedBadges.push(`حذف ${target.name}`);
                }
              }
              break;
            }

            case 'restore_item': {
              if (act.targetName === 'ALL') {
                const binIds = files
                  .filter((f) => f.parentId === 'recyclebin')
                  .map((f) => f.id);
                onRestoreItems(binIds);
                executedBadges.push(`استعادة ${binIds.length} عنصر`);
              } else {
                const target = findItemByNameOrId(act.targetName || '');
                if (target) {
                  onRestoreItems([target.id]);
                  executedBadges.push(`استعادة ${target.name}`);
                }
              }
              break;
            }

            case 'copy_item': {
              const target = findItemByNameOrId(act.targetName || '');
              if (target) {
                const copied = onCopyItem(
                  target,
                  act.targetFolder || 'desktop',
                  act.newName
                );
                affectedItems.push(copied);
                executedBadges.push(`نسخ ${copied.name}`);
              }
              break;
            }

            case 'move_item': {
              const target = findItemByNameOrId(act.targetName || '');
              if (target && act.targetFolder) {
                onMoveItems([target.id], act.targetFolder);
                executedBadges.push(`نقل ${target.name}`);
              }
              break;
            }

            case 'open_item': {
              const target =
                findItemByNameOrId(act.targetName || act.fileName || '') ||
                (aiMemory.lastEditedFileId
                  ? files.find((f) => f.id === aiMemory.lastEditedFileId)
                  : undefined);
              if (target) {
                onOpenItem(target);
                executedBadges.push(`فتح ${target.name}`);
              } else if (act.targetName) {
                const appId = resolveAppIdFromName(act.targetName);
                if (appId) {
                  onLaunchApp(appId);
                  executedBadges.push(`فتح ${appId}`);
                }
              }
              break;
            }

            case 'play_spotify_search':
            case 'play_music':
            case 'play_song': {
              const q = act.query || act.targetName || act.fileName;
              if (q) {
                const played = await onPlayAndAddSpotifySearch(q);
                executedBadges.push(`Spotify: ${played}`);
              }
              break;
            }

            case 'power_action':
            case 'lock_screen':
            case 'restart_system':
            case 'shutdown_system':
            case 'sleep_system': {
              const powerTarget = String(
                act.targetName || normAction
              ).toLowerCase();
              if (powerTarget.includes('restart')) {
                onPowerAction?.('restart');
                executedBadges.push('إعادة تشغيل النظام');
              } else if (powerTarget.includes('shut')) {
                onPowerAction?.('shutdown');
                executedBadges.push('إيقاف تشغيل النظام');
              } else if (powerTarget.includes('sleep')) {
                onPowerAction?.('sleep');
                executedBadges.push('وضع السكون');
              } else {
                onPowerAction?.('lock');
                executedBadges.push('قفل الشاشة');
              }
              break;
            }

            case 'update_settings':
            case 'set_theme':
            case 'change_theme':
            case 'set_wallpaper':
            case 'change_wallpaper':
            case 'set_volume':
            case 'set_brightness': {
              const partial: Partial<SystemSettings> = {};
              if (act.theme === 'dark' || act.theme === 'light') partial.theme = act.theme;
              if (act.wallpaperId) {
                const matchedWp =
                  WALLPAPERS.find((w) => w.id === act.wallpaperId) ||
                  WALLPAPERS.find((w) =>
                    w.id.toLowerCase().includes(String(act.wallpaperId).toLowerCase())
                  );
                if (matchedWp) {
                  partial.wallpaperId = matchedWp.id;
                  partial.customWallpaperUrl = undefined;
                }
              }
              if (act.liveWallpaperId) {
                partial.liveWallpaperId = act.liveWallpaperId as SystemSettings['liveWallpaperId'];
              }
              if (act.taskbarStyle) {
                partial.taskbarStyle = act.taskbarStyle as SystemSettings['taskbarStyle'];
              }
              if (act.accentColor) {
                partial.accentColor = act.accentColor;
              }
              if (act.taskbarAlignment === 'center' || act.taskbarAlignment === 'left') {
                partial.taskbarAlignment = act.taskbarAlignment;
              }
              if (typeof act.volume === 'number') {
                partial.volume = Math.max(0, Math.min(100, act.volume));
                partial.isMuted = partial.volume === 0;
              }
              if (typeof act.brightness === 'number') {
                partial.brightness = Math.max(60, Math.min(115, act.brightness));
              }
              if (typeof act.wifiEnabled === 'boolean') partial.wifiEnabled = act.wifiEnabled;
              if (typeof act.bluetoothEnabled === 'boolean') partial.bluetoothEnabled = act.bluetoothEnabled;
              if (typeof act.nightLight === 'boolean') partial.nightLight = act.nightLight;
              if (typeof act.airplaneMode === 'boolean') {
                partial.airplaneMode = act.airplaneMode;
                if (act.airplaneMode) {
                  partial.wifiEnabled = false;
                  partial.bluetoothEnabled = false;
                }
              }
              if (typeof act.batterySaver === 'boolean') partial.batterySaver = act.batterySaver;
              if (typeof act.desktopIconsVisible === 'boolean') partial.desktopIconsVisible = act.desktopIconsVisible;
              if (act.desktopIconSize === 'small' || act.desktopIconSize === 'medium' || act.desktopIconSize === 'large') {
                partial.desktopIconSize = act.desktopIconSize;
              }
              if (typeof act.taskbarAutoHide === 'boolean') partial.taskbarAutoHide = act.taskbarAutoHide;
              onUpdateSettings(partial);
              executedBadges.push('تحديث إعدادات النظام');
              break;
            }

            case 'minimize_window': {
              const resolvedId = (act.appId as AppId) || resolveAppIdFromName(act.targetName || '');
              const win = windows.find((w) => (resolvedId ? w.appId === resolvedId : w.appId !== 'copilot' && !w.isMinimized));
              if (win && onWindowAction) {
                onWindowAction(win.id, 'minimize');
                executedBadges.push(`تصغير نافذة ${win.title}`);
              }
              break;
            }

            case 'maximize_window': {
              const resolvedId = (act.appId as AppId) || resolveAppIdFromName(act.targetName || '');
              const win = windows.find((w) => (resolvedId ? w.appId === resolvedId : w.appId !== 'copilot'));
              if (win && onWindowAction) {
                onWindowAction(win.id, 'maximize');
                executedBadges.push(`تكبير نافذة ${win.title}`);
              }
              break;
            }

            case 'snap_window':
            case 'snap_windows': {
              const resolvedId =
                (act.appId as AppId) || resolveAppIdFromName(act.targetName || '');
              if (resolvedId && onSnapWindow) {
                onSnapWindow(
                  resolvedId,
                  (act.snapPosition as SnapPosition) || 'left'
                );
                executedBadges.push(`تقسيم نافذة ${resolvedId}`);
              }
              break;
            }

            case 'change_app_icon': {
              const resolvedId =
                (act.appId as AppId) || resolveAppIdFromName(act.targetName || '');
              if (resolvedId) {
                const chosenPreset =
                  CUSTOM_ICON_PRESETS.find((p) => p.id === act.iconPresetId) ||
                  CUSTOM_ICON_PRESETS[0];
                const nextIcons = {
                  ...(settings.customAppIcons || {}),
                  [resolvedId]: chosenPreset.url,
                };
                onUpdateSettings({ customAppIcons: nextIcons });
                executedBadges.push(`تغيير أيقونة ${resolvedId}`);
              }
              break;
            }

            case 'toggle_preview_mode': {
              onTogglePreviewMode?.();
              executedBadges.push('تبديل وضع ملء الشاشة (F1)');
              break;
            }

            case 'toggle_fullscreen': {
              onToggleFullScreen(act.enable ?? true);
              executedBadges.push('تبديل ملء الشاشة');
              break;
            }

            case 'arrange_desktop': {
              onArrangeDesktop();
              executedBadges.push('ترتيب أيقونات سطح المكتب');
              break;
            }

            case 'modify_copilot_chat': {
              const nextCopilot: CopilotChatCustomization = {
                ...copilotConfig,
                assistantName: act.assistantName || copilotConfig.assistantName,
                accentColor: act.accentColor || copilotConfig.accentColor,
                chatBgColor: act.chatBgColor || copilotConfig.chatBgColor,
                userBubbleColor: act.accentColor || copilotConfig.userBubbleColor,
                customBannerHtml: act.customBannerHtml ?? copilotConfig.customBannerHtml,
              };
              onUpdateSettings({ copilotConfig: nextCopilot });
              executedBadges.push('تحديث مظهر Copilot');
              break;
            }

            case 'modify_system_app': {
              const targetAppId =
                (act.appId as AppId) ||
                resolveAppIdFromName(act.targetName || '') ||
                resolveAppIdFromName(rawInput) ||
                activeTargetedWindow?.appId ||
                openScreenWindows[0]?.appId;
              if (targetAppId) {
                const wantsReset =
                  String(act.targetName || '').toUpperCase() === 'RESET' ||
                  /(رجع.*لأصل|رجع.*لاصل|استعادة.*الأصل|استعادة.*الاصلي|الوضع الأصلي|الوضع الاصلي|reset\s+to\s+default)/i.test(
                    rawInput
                  );
                if (wantsReset) {
                  const nextMods = { ...(settings.systemAppMods || {}) };
                  delete nextMods[targetAppId];
                  onUpdateSettings({ systemAppMods: nextMods });
                  executedBadges.push(`استعادة الوضع الأصلي: ${targetAppId}`);
                  onLaunchApp(targetAppId);
                  break;
                }
                const existing = settings.systemAppMods?.[targetAppId] || {
                  appId: targetAppId,
                };
                const updatedMod: SystemAppMod = {
                  ...existing,
                  appId: targetAppId,
                  customTitle: act.customTitle || existing.customTitle,
                  accentColor: act.accentColor || existing.accentColor,
                  customWidgetHtml: act.customWidgetHtml || existing.customWidgetHtml,
                  fullOverrideHtml: act.fullOverrideHtml || existing.fullOverrideHtml,
                  useFullOverride: act.useFullOverride ?? existing.useFullOverride,
                  updatedAt: new Date().toLocaleTimeString(),
                };
                onUpdateSettings({
                  systemAppMods: {
                    ...(settings.systemAppMods || {}),
                    [targetAppId]: updatedMod,
                  },
                });
                executedBadges.push(`تعديل مباشر: ${targetAppId}`);
                onLaunchApp(targetAppId);
                recordMemoryEntry('project', `تعديل تطبيق النظام ${targetAppId}`, {
                  lastEditedAppId: targetAppId,
                  targetId: targetAppId,
                  targetName: targetAppId,
                });
              }
              break;
            }
          }
        }
      }

      // Chat-driven Image Generation & Iterative Text Editing fallback if user asked to create/edit an image in chat
      if (
        generatedMediaList.length === 0 &&
        (Boolean(editingMediaContext) ||
          /(صمم صورة|اعمل صورة|ولد صورة|توليد صورة|ارسم|صورة خلفية|خلفيه|خلفية سطح مكتب|عدل الصورة|عدل هذه الصورة|عدل الخلفية|غير لون الصورة|شعار|لوجو|generate image|create image|draw |wallpaper)/i.test(
            rawInput
          ))
      ) {
        try {
          const targetEditMedia = editingMediaContext || lastChatGeneratedMedia;
          const isEditingLastImage =
            Boolean(editingMediaContext) ||
            (Boolean(targetEditMedia) &&
              /(عدل|غير|خلي|ضف|ضيف|أضف|زود|تعديل|edit|change|modify|update)/i.test(rawInput));
          const combinedPrompt = isEditingLastImage && targetEditMedia
            ? `${targetEditMedia.previousPrompt || targetEditMedia.title} — التعديل المطلوب: ${rawInput}`
            : rawInput;
          const mediaRes = await fetch('/api/ai/generate-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              prompt: combinedPrompt,
              previousPrompt: isEditingLastImage && targetEditMedia
                ? targetEditMedia.previousPrompt || targetEditMedia.title
                : undefined,
              previousSvgCode:
                isEditingLastImage && lastChatGeneratedMedia?.svgCode
                  ? lastChatGeneratedMedia.svgCode
                  : undefined,
            }),
          });
          const mediaData = await mediaRes.json();
          if (mediaData?.imageUrl) {
            const mediaItem: GeneratedMediaItem = {
              id: `media-${Date.now()}`,
              title:
                mediaData.title ||
                (isEditingLastImage
                  ? `تعديل: ${targetEditMedia?.title || 'صورة'}`
                  : rawInput.slice(0, 32)),
              description: mediaData.description || 'تم تصميم الصورة بالذكاء الاصطناعي بدقة 4K.',
              imageUrl: mediaData.imageUrl,
              svgCode: mediaData.svgCode,
              previousPrompt: combinedPrompt,
            };
            generatedMediaList.push(mediaItem);
            executedBadges.push(
              isEditingLastImage
                ? `تعديل الصورة: ${mediaItem.title}`
                : `توليد صورة: ${mediaItem.title}`
            );
            if (editingMediaContext) {
              setEditingMediaContext(null);
            }
            if (/(عينها خلفية|خليها خلفية|كخلفية|set as wallpaper)/i.test(rawInput)) {
              onUpdateSettings({
                customWallpaperUrl: mediaItem.imageUrl,
                liveWallpaperId: 'none',
              });
              executedBadges.push('تعيين كخلفية لسطح المكتب');
            }
          }
        } catch {
          // ignore
        }
      }

      const fallbackReply = await executeGuaranteedCommandIfMissed(
        rawInput,
        executedBadges,
        affectedItems
      );

      const elapsedMs = Math.round(performance.now() - execStartMs);
      setLastExecTimeMs(elapsedMs);

      const validAiReply =
        data?.reply && !isPolicyRefusalText(String(data.reply))
          ? String(data.reply)
          : '';

      const finalReplyText = stripEmojis(
        validAiReply ||
          fallbackReply ||
          multiSourceData?.summary ||
          (executedBadges.length > 0
            ? `تم تنفيذ: ${executedBadges.join('، ')}`
            : 'تم استلام طلبك وتنفيذه.')
      );

      speakTextIfEnabled(finalReplyText);

      let createdUndoId: string | undefined;
      if (
        executedBadges.length > 0 ||
        affectedItems.length > 0 ||
        generatedMediaList.length > 0
      ) {
        const newlyCreatedIds = affectedItems
          .filter((item) => !beforeFileIds.includes(item.id))
          .map((item) => item.id);
        const editedFileIds = affectedItems
          .filter((item) => beforeFileIds.includes(item.id))
          .map((item) => item.id);

        const snap: ActionUndoSnapshot = {
          id: `undo-${Date.now()}`,
          label: executedBadges[0] || rawInput.slice(0, 36) || 'آخر إجراء',
          prevSettings: preSettingsSnapshot,
          prevFilesMap,
          beforeFileIds,
          newlyCreatedIds,
          editedFileIds,
          deletedFileIds: [],
        };
        createdUndoId = snap.id;
        setActionUndoStack((prev) => [snap, ...prev].slice(0, 25));
      }

      const uniqueAffectedItems = dedupeFilesList(affectedItems);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: finalReplyText,
          executedBadges: executedBadges.length > 0 ? executedBadges : undefined,
          affectedItems: uniqueAffectedItems.length > 0 ? uniqueAffectedItems : undefined,
          generatedMedia: generatedMediaList.length > 0 ? generatedMediaList : undefined,
          musicList: liveMusicResults.length > 0 ? liveMusicResults : undefined,
          sources:
            multiSourceData?.sources && multiSourceData.sources.length > 0
              ? multiSourceData.sources
              : undefined,
          execTimeMs: elapsedMs,
          undoSnapshotId: createdUndoId,
          taskPlan: data?.taskPlan || undefined,
        },
      ]);

      // Send Windows 11 Notification when AI finishes user's request/command
      if (onNotify) {
        const notifTitle =
          executedBadges.length > 0
            ? `Windows Copilot — تم تنفيذ الأمر (${executedBadges.length})`
            : 'Windows Copilot — اكتمل الرد';
        const notifBody =
          executedBadges.length > 0
            ? `${executedBadges.join(' · ')} — ${finalReplyText.slice(0, 90)}`
            : finalReplyText.slice(0, 110);
        onNotify(notifTitle, notifBody);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      const affectedItems: FileSystemItem[] = [];
      const executedBadges: string[] = [];
      const fallbackReply = await executeGuaranteedCommandIfMissed(
        rawInput,
        executedBadges,
        affectedItems
      );

      const errReply =
        fallbackReply || 'عذراً، حدث خطأ مؤقت في الاتصال. يرجى إعادة إرسال طلبك.';
      speakTextIfEnabled(errReply);

      let createdUndoId: string | undefined;
      if (executedBadges.length > 0 || affectedItems.length > 0) {
        const snap: ActionUndoSnapshot = {
          id: `undo-${Date.now()}`,
          label: executedBadges[0] || rawInput.slice(0, 36) || 'آخر إجراء',
          prevSettings: preSettingsSnapshot,
          prevFilesMap,
          beforeFileIds,
          newlyCreatedIds: affectedItems
            .filter((item) => !beforeFileIds.includes(item.id))
            .map((item) => item.id),
          editedFileIds: affectedItems
            .filter((item) => beforeFileIds.includes(item.id))
            .map((item) => item.id),
          deletedFileIds: [],
        };
        createdUndoId = snap.id;
        setActionUndoStack((prev) => [snap, ...prev].slice(0, 25));
      }

      const uniqueErrAffectedItems = dedupeFilesList(affectedItems);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: errReply,
          executedBadges: executedBadges.length > 0 ? executedBadges : undefined,
          affectedItems: uniqueErrAffectedItems.length > 0 ? uniqueErrAffectedItems : undefined,
          undoSnapshotId: createdUndoId,
        },
      ]);

      if (onNotify && (executedBadges.length > 0 || fallbackReply)) {
        onNotify(
          'Windows Copilot — تم تنفيذ الأمر',
          executedBadges.length > 0 ? executedBadges.join(' · ') : errReply.slice(0, 100)
        );
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  // Plan Mode Approval, Rejection & Live Editing Handlers (like Gemini Studio Plan Mode)
  const handleApprovePlan = useCallback(
    async (plan: CopilotTaskPlan) => {
      const prompt = `موافقة واعتماد الخطة: ${plan.title} — يرجى تنفيذ كافة الخطوات المقترحة الآن بدون إيموجيز وبأعلى دقة.`;
      await handleSend(prompt, {
        planApproved: true,
        approvedPlan: plan,
      });
    },
    [handleSend]
  );

  const handleRejectPlan = useCallback((planId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.taskPlan?.id === planId
          ? { ...m, taskPlan: { ...m.taskPlan, status: 'rejected' } }
          : m
      )
    );
    setSaveMessage('تم رفض الخطة بناءً على اختيارك');
    setTimeout(() => setSaveMessage(''), 2500);
  }, []);

  const handleTogglePlanStepEdit = useCallback((planId: string, currentSteps: any[]) => {
    setActivePlanEdits((prev) => {
      const existing = prev[planId];
      if (existing?.editing) {
        return {
          ...prev,
          [planId]: { ...existing, editing: false },
        };
      }
      return {
        ...prev,
        [planId]: {
          editing: true,
          steps: existing?.steps || [...currentSteps],
        },
      };
    });
  }, []);

  const handleUpdateStepText = useCallback(
    (planId: string, stepIndex: number, newLabel: string, newDetails?: string) => {
      setActivePlanEdits((prev) => {
        const current = prev[planId]?.steps || [];
        const nextSteps = [...current];
        if (nextSteps[stepIndex]) {
          nextSteps[stepIndex] = {
            ...nextSteps[stepIndex],
            label: newLabel,
            details: newDetails !== undefined ? newDetails : nextSteps[stepIndex].details,
          };
        }
        return {
          ...prev,
          [planId]: { ...prev[planId], steps: nextSteps },
        };
      });
    },
    []
  );

  const handleSaveEditedSteps = useCallback(
    (planId: string) => {
      const edited = activePlanEdits[planId]?.steps;
      if (edited) {
        setMessages((prev) =>
          prev.map((m) =>
            m.taskPlan?.id === planId
              ? { ...m, taskPlan: { ...m.taskPlan, steps: edited } }
              : m
          )
        );
      }
      setActivePlanEdits((prev) => ({
        ...prev,
        [planId]: { ...prev[planId], editing: false },
      }));
      setSaveMessage('تم حفظ التعديلات على خطوات الخطة');
      setTimeout(() => setSaveMessage(''), 2500);
    },
    [activePlanEdits]
  );

  const handleLivePlanAiRefinement = useCallback(
    async (plan: CopilotTaskPlan) => {
      const feedback = (planFeedbackInputs[plan.id] || '').trim();
      if (!feedback) return;
      setPlanFeedbackInputs((prev) => ({ ...prev, [plan.id]: '' }));
      const prompt = `تعديل على خطة العمل "${plan.title}": ${feedback} — يرجى مراجعة وتحديث الخطة والخطوات المقترحة وفقاً لذلك.`;
      await handleSend(prompt, { planApproved: false });
    },
    [planFeedbackInputs, handleSend]
  );

  const fontSizeClass =
    copilotConfig.fontScale === 'large'
      ? 'text-[13.5px]'
      : copilotConfig.fontScale === 'compact'
      ? 'text-[11px]'
      : 'text-xs';

  const hasUserMessages = useMemo(
    () => messages.some((m) => m.role === 'user'),
    [messages]
  );

  const canUndoAnything =
    actionUndoStack.length > 0 ||
    editableFiles.some((f) => Boolean(f.previousContent));

  const zeroStateCards = [
    {
      category: 'المساعد الشامل وحل المشكلات',
      title: 'إجابة أي سؤال، كتابة تقارير وملخصات، وأبحاث',
      desc: 'اسأل عن أي موضوع، واطلب تحليل البيانات، حل المعادلات، كتابة رسائل وإيميلات احترافية، أو إعداد محتوى مخصص',
      prompt: 'اكتب تقريراً تحليلياً شاملاً عن استراتيجيات الإنتاجية وإدارة الوقت مع جدول عمل مقترح',
      icon: <Sparkles size={16} className="text-blue-500" />,
    },
    {
      category: 'إدارة وتحكم كامل في Windows 11',
      title: 'التحكم الفوري في إعدادات ونوافذ النظام',
      desc: 'إدارة النوافذ المفتوحة، شبكات الواي فاي، البلوتوث، مستوى الصوت والسطوع، الثيمات، وترتيب سطح المكتب',
      prompt: 'فعل الوضع الليلي وارفع مستوى الصوت إلى 80% ورتب أيقونات سطح المكتب بدقة',
      icon: <Cpu size={16} className="text-indigo-500" />,
    },
    {
      category: 'محرك الألعاب والرسوميات 3D',
      title: 'بناء ألعاب تفاعلية ثلاثية الأبعاد بضغطة واحدة',
      desc: 'بناء ألعاب فضاء، سباق سيارات، ومحاكاة فيزيائية كاملة وتشغيلها مباشرة داخل نافذة مخصصة',
      prompt: 'اصنع لعبة سباق سيارات 3D ممتعة مع عداد سرعة وتحكم بالأسهم وافتحها فوراً',
      icon: <Layers size={16} className="text-violet-500" />,
    },
    {
      category: 'استوديو الصور والوسائط 4K',
      title: 'توليد وتعديل الصور والخلفيات الفنية',
      desc: 'توليد خلفيات فنية وشعارات وتصميمات عالية الدقة وتعيينها كخلفية لسطح المكتب بطلب واحد',
      prompt: 'صمم صورة فنية مذهلة لمدينة مستقبلية بدقة فائقة وعينها كخلفية لسطح المكتب',
      icon: <ImageIcon size={16} className="text-blue-500" />,
    },
    {
      category: 'تطوير البرمجيات وأدوات النظام',
      title: 'بناء تطبيقات وأدوات ذكية متكاملة',
      desc: 'تطوير أدوات حسابية، لوحات تحكم، ومشاريع برمجية متكاملة وحفظها في المجلد الذي تحدده',
      prompt: 'اصنع أداة متقدمة لإدارة المهام والمشاريع مع مؤقت بومودورو وإحصائيات إنجاز',
      icon: <Zap size={16} className="text-indigo-500" />,
    },
    {
      category: 'الموسيقى والبحث الحي والإنتاجية',
      title: 'تشغيل الموسيقى والبحث المباشر في الويب',
      desc: 'تشغيل مقاطعك المفضلة في Spotify، والبحث عن أحدث المعلومات الحية، وتدوين الملاحظات',
      prompt: 'شغل موسيقى هادئة للتركيز في سبوتيفاي واعمل ملف ملاحظات بأهم أهداف اليوم',
      icon: <FolderGit2 size={16} className="text-violet-500" />,
    },
  ];

  const memoryUsagePercent = Math.min(
    100,
    Math.max(1, (usedContextChars / MAX_AI_MEMORY_CHARS) * 100)
  );

  return (
    <div
      className="flex flex-col h-full bg-white text-slate-800 select-none font-sans relative overflow-hidden"
      style={{ backgroundColor: copilotConfig.chatBgColor || '#FFFFFF' }}
    >
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        accept="image/*,.html,.css,.js,.ts,.tsx,.json,.txt,.md"
        className="hidden"
        onChange={handleFileAttachmentSelect}
      />

      {/* ====================================================================
       * MINIMAL CLEAN COPILOT TOP HEADER (Logo | Brand | Mode Badge | Settings)
       * ================================================================== */}
      <header className="h-12 px-4 bg-white/95 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 z-20 shadow-xs">
        {/* Zone 1: Copilot Logo & Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-0.5 flex items-center justify-center shadow-xs">
            <CopilotSvgIcon size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-slate-900 truncate">
                {copilotConfig.assistantName}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                  aiMode === 'plan'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {aiMode === 'plan' ? 'Plan' : 'Default'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              المساعد الذكي الشامل لنظام Windows 11
            </span>
          </div>

          {saveMessage && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-700 font-medium">
              <Check size={11} />
              <span>{saveMessage}</span>
            </span>
          )}
        </div>

        {/* Zone 2: Action Controls (Copy & Settings Gear Button) */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const allText = messages
                  .filter((m) => !(m.id.startsWith('welcome') && !hasUserMessages))
                  .map(
                    (m) =>
                      `${m.role === 'user' ? 'أنت' : copilotConfig.assistantName}: ${m.text}`
                  )
                  .join('\n\n');
                if (allText) {
                  handleCopyText(allText, 'copy-all-chat');
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs text-slate-700 transition-colors cursor-pointer"
              title="نسخ جميع رسائل المحادثة"
            >
              {copiedId === 'copy-all-chat' ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span className="hidden sm:inline text-emerald-600 font-medium">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span className="hidden sm:inline">نسخ المحادثة</span>
                </>
              )}
            </button>
          )}

          {/* Gear Settings Button (Opens Copilot Settings Side Panel) */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 text-xs font-semibold text-blue-700 transition-all cursor-pointer shadow-xs"
            title="إعدادات Copilot ووضع التخطيط ومسار حفظ الملفات والجلسات والذاكرة"
          >
            <Settings size={14} className="text-blue-600" />
            <span>الإعدادات</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
       * DYNAMIC CONTEXTUAL AI PROMPT SUGGESTIONS (Adapts to Conversation Topic)
       * ================================================================== */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-200">
            <Sparkles size={12} className="text-violet-600" />
            <span>أفكار ذكية:</span>
          </span>
          {smartSuggestions.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => void handleSend(promptText)}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer shadow-2xs"
            >
              {promptText}
            </button>
          ))}
          <button
            type="button"
            onClick={handleRefreshSmartSuggestions}
            className="p-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-violet-600 transition-colors cursor-pointer"
            title="توليد أفكار جديدة بالذكاء الاصطناعي"
          >
            <Sparkles size={12} />
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-slate-500 shrink-0">
          <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
            النوافذ: {windows.length}
          </span>
          <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
            الذاكرة: {usedContextChars.toLocaleString()} / 1M
          </span>
        </div>
      </div>

      {/* Legacy drawer disabled in favor of unified Side Sheet Settings Panel */}
      {false && (
        <div className="absolute inset-0 z-30 flex">
          <div className="w-80 max-w-[88vw] h-full bg-[#111827] border-r border-white/[0.12] shadow-2xl flex flex-col p-3.5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-lg border border-white/[0.08] flex-1 mr-2">
                <button
                  type="button"
                  onClick={() => setDrawerTab('sessions')}
                  className={`flex-1 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                    drawerTab === 'sessions'
                      ? 'bg-[#0078D4] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  المحادثات ({chatSessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('memory')}
                  className={`flex-1 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                    drawerTab === 'memory'
                      ? 'bg-[#0078D4] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الذاكرة (1M)
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('undo')}
                  className={`flex-1 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                    drawerTab === 'undo'
                      ? 'bg-[#0078D4] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  التراجع ({actionUndoStack.length})
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {drawerTab === 'sessions' && (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStartNewChat}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#0078D4] hover:bg-[#0369a1] text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>محادثة جديدة</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllSessions}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1 cursor-pointer"
                    title="حذف جميع المحادثات"
                  >
                    <Trash2 size={12} />
                    <span>مسح الكل</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  {chatSessions.map((session) => {
                    const isCurrent = session.id === activeSessionId;
                    const userTurns = session.messages.filter(
                      (m) => m.role === 'user'
                    ).length;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSwitchSession(session.id)}
                        className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-[#0078D4]/20 border-[#38bdf8]/60 text-white'
                            : 'bg-[#0B0F17] hover:bg-white/[0.05] border-white/[0.06] text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <MessageSquare
                            size={13}
                            className={
                              isCurrent
                                ? 'text-[#38bdf8] shrink-0'
                                : 'text-slate-500 shrink-0'
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate" dir="auto">
                              {session.title}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-mono tabular-nums">
                              <span>{session.updatedAt}</span>
                              <span>•</span>
                              <span>{userTurns} رسائل</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 shrink-0 cursor-pointer"
                          title="حذف هذه المحادثة"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {drawerTab === 'memory' && (
              <div className="flex-1 flex flex-col space-y-2.5 overflow-y-auto">
                {/* 1,000,000 Character Capacity Card */}
                <div className="p-3 rounded-lg bg-[#0B0F17] border border-white/[0.1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Brain size={13} className="text-[#38bdf8]" />
                      <span>سعة الذاكرة السياقية الفائقة</span>
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-emerald-400 font-semibold">
                      1,000,000 حرف
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0078D4] transition-all duration-300"
                      style={{ width: `${memoryUsagePercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono tabular-nums">
                    <span>المستخدم: {usedContextChars.toLocaleString('en-US')} حرف</span>
                    <span>المتاح: {(MAX_AI_MEMORY_CHARS - usedContextChars).toLocaleString('en-US')} حرف</span>
                  </div>
                </div>

                {aiMemory.lastEditedFileName && (
                  <div className="p-2.5 rounded-lg bg-[#0B0F17] border border-[#38bdf8]/30 space-y-2">
                    <div className="text-[10px] text-slate-400">
                      آخر مشروع أو تطبيق نشط في الذاكرة
                    </div>
                    <div className="font-semibold text-[#38bdf8] truncate">
                      {aiMemory.lastEditedFileName}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const f = files.find(
                            (item) => item.id === aiMemory.lastEditedFileId
                          );
                          if (f) {
                            onOpenItem(f);
                            setShowHistoryDrawer(false);
                          }
                        }}
                        className="flex-1 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[11px] text-white cursor-pointer"
                      >
                        فتح بنافذة ويندوز
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowHistoryDrawer(false);
                          void handleSend(
                            `كمل على آخر مشروع ${aiMemory.lastEditedFileName}`
                          );
                        }}
                        className="flex-1 py-1 rounded bg-[#0078D4] hover:bg-[#0369a1] text-[11px] text-white font-medium cursor-pointer"
                      >
                        استكمال التطوير
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">
                    سجل الذاكرة التراكمية ({aiMemory.items.length})
                  </span>
                  {aiMemory.items.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setAiMemory((prev) => ({
                          ...prev,
                          lastEditedFileId: undefined,
                          lastEditedFileName: undefined,
                          lastEditedFolderId: undefined,
                          items: [],
                        }))
                      }
                      className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                    >
                      مسح الذاكرة
                    </button>
                  )}
                </div>

                {aiMemory.items.length === 0 ? (
                  <div className="text-slate-400 text-[11px] py-6 text-center">
                    يحفظ Copilot تلقائياً كافة تفاصيل مشاريعك وتعديلاتك بسعة تصل إلى 1,000,000 حرف لتستكملها في أي وقت.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {aiMemory.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-[#0B0F17] border border-white/[0.06] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-slate-200 truncate">{item.summary}</div>
                          <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                            {item.updatedAt}
                          </div>
                        </div>
                        {item.targetName && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowHistoryDrawer(false);
                              setInput(`عدل ${item.targetName}: `);
                            }}
                            className="text-[11px] text-[#38bdf8] hover:underline shrink-0 cursor-pointer"
                          >
                            تعديل
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'undo' && (
              <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
                <div className="text-[11px] text-slate-400">
                  يمكنك التراجع الفوري بخطوة واحدة عن أي خيار أو تعديل نفذه الذكاء الاصطناعي على تطبيقات وإعدادات وملفات ويندوز:
                </div>
                {actionUndoStack.length === 0 ? (
                  <div className="text-slate-500 text-[11px] py-8 text-center">
                    لا توجد عمليات مسجلة للتراجع حالياً.
                  </div>
                ) : (
                  actionUndoStack.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-2.5 rounded-lg bg-[#0B0F17] border border-white/[0.08] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">
                          {snap.label}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          استعادة الحالة السابقة للنظام والتطبيقات والملفات
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoActionSnapshot(snap.id)}
                        className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-medium shrink-0 cursor-pointer"
                      >
                        تراجع الآن
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div
            className="flex-1 bg-black/40"
            onClick={() => setShowHistoryDrawer(false)}
          />
        </div>
      )}

      {copilotConfig.customBannerHtml && (
        <div
          dangerouslySetInnerHTML={{ __html: copilotConfig.customBannerHtml }}
        />
      )}

      {/* ====================================================================
       * UNIFIED CONVERSATION STREAM (Single Powerful AI Engine - No Studio Tab)
       * ================================================================== */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Smart Zero-State Hub when conversation is fresh */}
        {!hasUserMessages && (
          <div className="max-w-3xl mx-auto py-4 space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0078D4]/15 border border-[#38bdf8]/30 mb-1">
                <CopilotSvgIcon size={26} />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                مرحباً بك في {copilotConfig.assistantName}
              </h1>
              <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
                محرك ذكاء اصطناعي موحد بأقصى أداء وذاكرة سياقية تتسع لـ 1,000,000 حرف. اطلب أي مشروع أو لعبة بكلمات قليلة ليتم بناؤه كاملاً 100% وفتحه بنافذة ويندوز مستقلة، أو اطلب توليد وتعديل الصور وتعديل أي تطبيق أو إعداد في Windows 11 مباشرة من الشات.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {zeroStateCards.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => void handleSend(card.prompt)}
                  className="text-right p-3.5 rounded-xl bg-[#111827]/90 hover:bg-[#1e293b] border border-white/[0.08] hover:border-[#38bdf8]/40 transition-all group cursor-pointer flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-[#38bdf8] uppercase tracking-wider">
                      {card.category}
                    </span>
                    <div className="p-1.5 rounded-lg bg-white/[0.04] group-hover:bg-[#0078D4]/20 transition-colors">
                      {card.icon}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white mb-1">
                      {card.title}
                    </div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">
                      {card.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Streamlined Conversation Timeline */}
        <div className="max-w-3xl mx-auto space-y-3">
          {messages
            .filter((m) => !(m.id.startsWith('welcome') && !hasUserMessages))
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  style={{
                    backgroundColor:
                      msg.role === 'user'
                        ? copilotConfig.userBubbleColor || '#0078D4'
                        : copilotConfig.aiBubbleColor || '#1E293B',
                  }}
                  className={`max-w-[92%] rounded-xl px-4 py-3 ${fontSizeClass} leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'text-white'
                      : 'border border-white/[0.08] text-slate-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div dir="auto" className="flex-1">{msg.text}</div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.text, `msg-${msg.id}`)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium shrink-0 transition-all cursor-pointer border ${
                        copiedId === `msg-${msg.id}`
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                          : msg.role === 'user'
                          ? 'bg-black/20 hover:bg-black/35 border-white/20 text-white/90 hover:text-white'
                          : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/[0.10] text-slate-300 hover:text-white'
                      }`}
                      title="نسخ الرسالة (Copy Message)"
                    >
                      {copiedId === `msg-${msg.id}` ? (
                        <>
                          <Check size={11} className="text-emerald-400" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>نسخ</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Attached Images / Files in Message */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {msg.attachments.map((att) =>
                        att.kind === 'image' && att.dataUrl ? (
                          <img
                            key={att.id}
                            src={att.dataUrl}
                            alt={att.name}
                            referrerPolicy="no-referrer"
                            className="max-h-36 rounded-lg border border-white/15 object-contain bg-black/30"
                          />
                        ) : (
                          <div
                            key={att.id}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/25 border border-white/15 text-[11px]"
                          >
                            <FileCode size={12} />
                            <span className="truncate max-w-[160px]">{att.name}</span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Comprehensive Task Plan Card (Gemini Studio Plan Mode) */}
                  {msg.taskPlan && (
                    <div
                      className="mt-3 p-4 rounded-xl bg-[#090d16] border border-cyan-500/30 shadow-[0_4px_24px_rgba(0,120,212,0.18)] text-right space-y-3.5"
                      dir="rtl"
                    >
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                            <Layers size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                              <span>خطة عمل مقترحة</span>
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                                Plan Mode
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              نفس آلية Gemini Studio: تتطلب الموافقة الصريحة قبل التنفيذ الفعلي
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {msg.taskPlan.status === 'approved' || msg.taskPlan.status === 'executed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold">
                              <CheckCircle2 size={12} />
                              <span>تمت الموافقة والتنفيذ</span>
                            </span>
                          ) : msg.taskPlan.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-semibold">
                              <X size={12} />
                              <span>تم رفض الخطة</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-semibold animate-pulse">
                              <Sparkles size={12} />
                              <span>بانتظار الموافقة للاعتماد والتنفيذ</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Target */}
                      <div>
                        <div className="text-sm font-bold text-white">
                          {msg.taskPlan.title}
                        </div>
                        {msg.taskPlan.summary && (
                          <div className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {msg.taskPlan.summary}
                          </div>
                        )}
                        {(msg.taskPlan.targetApp || msg.taskPlan.targetFile) && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                            <span>الهدف:</span>
                            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-cyan-300">
                              {msg.taskPlan.targetFile || msg.taskPlan.targetApp}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Steps Checklist */}
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                          <span>خطوات التنفيذ التفصيلية ({msg.taskPlan.steps.length}):</span>
                          {msg.taskPlan.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleTogglePlanStepEdit(msg.taskPlan!.id, msg.taskPlan!.steps)}
                              className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={11} />
                              <span>{activePlanEdits[msg.taskPlan.id]?.editing ? 'إلغاء التعديل اليدوي' : 'تعديل الخطوات يدوياً'}</span>
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {(activePlanEdits[msg.taskPlan.id]?.editing
                            ? activePlanEdits[msg.taskPlan.id].steps || msg.taskPlan.steps
                            : msg.taskPlan.steps
                          ).map((step, sIdx) => (
                            <div
                              key={step.id || sIdx}
                              className="p-2.5 rounded-lg bg-black/40 border border-white/10 flex items-start gap-2.5 transition-colors"
                            >
                              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold font-mono flex items-center justify-center shrink-0 mt-0.5">
                                {sIdx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                {activePlanEdits[msg.taskPlan!.id]?.editing ? (
                                  <div className="space-y-1.5">
                                    <input
                                      type="text"
                                      value={step.label}
                                      onChange={(e) =>
                                        handleUpdateStepText(
                                          msg.taskPlan!.id,
                                          sIdx,
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 rounded bg-[#111827] border border-cyan-500/40 text-xs text-white focus:outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={step.details || ''}
                                      placeholder="تفاصيل الخطوة..."
                                      onChange={(e) =>
                                        handleUpdateStepText(
                                          msg.taskPlan!.id,
                                          sIdx,
                                          step.label,
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-0.5 rounded bg-[#111827] border border-white/10 text-[11px] text-slate-300 focus:outline-none"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-xs font-semibold text-slate-100">
                                      {step.label}
                                    </div>
                                    {step.details && (
                                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                        {step.details}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {activePlanEdits[msg.taskPlan.id]?.editing && (
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEditedSteps(msg.taskPlan!.id)}
                              className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              حفظ التعديلات على الخطوات
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Live AI Plan Refinement Chat Input */}
                      {msg.taskPlan.status === 'pending' && (
                        <div className="pt-2 border-t border-white/10 space-y-2">
                          <div className="text-[11px] text-slate-300 font-medium">
                            تعديل الخطة live مع الذكاء الاصطناعي (أعد توجيه الخطة أو غير اتجاهها):
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={planFeedbackInputs[msg.taskPlan.id] || ''}
                              onChange={(e) =>
                                setPlanFeedbackInputs((prev) => ({
                                  ...prev,
                                  [msg.taskPlan!.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void handleLivePlanAiRefinement(msg.taskPlan!);
                                }
                              }}
                              placeholder="اكتب تعديلك على الخطة (مثلاً: ركز على قاعدة البيانات، أضف ميزة بحث، أو احذف خطوة كذا)..."
                              className="flex-1 bg-black/40 border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => void handleLivePlanAiRefinement(msg.taskPlan!)}
                              disabled={!planFeedbackInputs[msg.taskPlan.id]?.trim()}
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
                            >
                              تحديث الخطة
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Primary Actions: Approve & Execute vs Reject */}
                      {msg.taskPlan.status === 'pending' && (
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => void handleApprovePlan(msg.taskPlan!)}
                            className="flex-1 min-w-[140px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
                          >
                            <Check size={14} />
                            <span>الموافقة والتنفيذ الآن (Approve)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPlan(msg.taskPlan!.id)}
                            className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 border border-rose-500/40 text-xs font-semibold text-rose-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <X size={14} />
                            <span>رفض الخطة (Reject)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Generated Images / Wallpapers Inline Cards in Chat */}
                  {msg.generatedMedia && msg.generatedMedia.length > 0 && (
                    <div className="mt-3 space-y-2.5">
                      {msg.generatedMedia.map((media) => (
                        <div
                          key={media.id}
                          className="rounded-lg bg-[#0B0F17] border border-white/[0.1] overflow-hidden"
                        >
                          <div className="relative aspect-video w-full bg-black overflow-hidden">
                            <img
                              src={media.imageUrl}
                              alt={media.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-2.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">
                                {media.title}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                دقة 4K جاهزة للتحميل أو التعيين كخلفية أو الحفظ بالملفات
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMediaContext({
                                    title: media.title,
                                    previousPrompt: media.previousPrompt || media.title,
                                    imageUrl: media.imageUrl,
                                  });
                                  setInput('عدل هذه الصورة: أضف إضاءة نيون سينمائية وتفاصيل أعمق ');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-500/25 hover:bg-indigo-500/40 border border-indigo-400/40 text-[11px] text-indigo-200 font-medium cursor-pointer"
                                title="تعديل هذه الصورة بالأوامر النصية عبر الذكاء الاصطناعي"
                              >
                                <Sparkles size={11} />
                                <span>تعديل بالأوامر النصية</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMedia(media)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[11px] text-white cursor-pointer"
                                title="تحميل الصورة مباشرة إلى جهازك"
                              >
                                <Download size={11} />
                                <span>تحميل الصورة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveMediaToSystem(media, true)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0078D4] hover:bg-[#0369a1] text-[11px] text-white font-medium cursor-pointer"
                                title="تعيين كخلفية لسطح المكتب في ويندوز 11"
                              >
                                <Monitor size={11} />
                                <span>تعيين كخلفية</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveMediaToSystem(media, false)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-[11px] text-[#38bdf8] cursor-pointer"
                                title="حفظ الصورة على سطح المكتب وفي الملفات"
                              >
                                <ImageIcon size={11} />
                                <span>حفظ بالملفات</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Music Results */}
                  {msg.musicList && msg.musicList.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {msg.musicList.map((track, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            onPlayAndAddSpotifySearch(
                              `${track.title} ${track.artist}`
                            )
                          }
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#0B0F17] hover:bg-[#0078D4]/25 border border-white/[0.08] text-left transition-all cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-medium text-white truncate">
                              {track.title}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {track.artist}
                            </div>
                          </div>
                          <Play size={12} className="text-[#1ed760] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Web Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex flex-wrap gap-1.5">
                      {msg.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B0F17] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-[#38bdf8] transition-colors"
                        >
                          <Globe size={11} />
                          <span className="truncate max-w-[180px]">{src.title}</span>
                          <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Executed OS Action Summary + Instant One-Step Undo Button */}
                  {msg.executedBadges && msg.executedBadges.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2 text-[11px] text-[#38bdf8]">
                      <span className="truncate">
                        {msg.undone
                          ? `تم التراجع عن: ${msg.executedBadges.join(' · ')}`
                          : msg.executedBadges.join(' · ')}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {msg.undoSnapshotId && !msg.undone && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUndoActionSnapshot(msg.undoSnapshotId)
                            }
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-[10px] text-amber-300 font-medium cursor-pointer"
                            title="التراجع الفوري بخطوة واحدة عن هذا التعديل"
                          >
                            <RotateCcw size={10} />
                            <span>تراجع فوري</span>
                          </button>
                        )}
                        {typeof msg.execTimeMs === 'number' && (
                          <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                            {(msg.execTimeMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Created / Updated Project Cards -> Auto-Saved on Desktop & Opened in Independent Windows Window */}
                  {msg.affectedItems && msg.affectedItems.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      {dedupeFilesList(msg.affectedItems).map((item) => {
                        const liveItem =
                          files.find((f) => f.id === item.id) || item;
                        const isHtmlPreviewable =
                          liveItem.type === 'html' && Boolean(liveItem.content);
                        const isPreviewOpen = Boolean(
                          expandedPreviewIds[liveItem.id]
                        );
                        const runtimeErr = runtimeErrorsByItemId[liveItem.id];
                        const isAutoFixing = autoFixingItemId === liveItem.id;

                        return (
                          <div
                            key={`${msg.id}-${liveItem.id}`}
                            className="rounded-lg bg-[#0B0F17] border border-white/[0.08] overflow-hidden"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileItemIconRenderer
                                  type={liveItem.type}
                                  name={liveItem.name}
                                  size={18}
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-semibold text-white truncate block">
                                    {liveItem.name}
                                  </span>
                                  {liveItem.featureHistory &&
                                    liveItem.featureHistory.length > 0 && (
                                      <span className="text-[10px] text-[#38bdf8] block truncate font-mono tabular-nums">
                                        تم حفظه على سطح المكتب • {liveItem.featureHistory.length} ميزات محفوظة
                                      </span>
                                    )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                                {liveItem.content && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyText(
                                        liveItem.content || '',
                                        `file-${liveItem.id}`
                                      )
                                    }
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-slate-200 cursor-pointer"
                                    title="نسخ كود المشروع بالكامل (Copy Code)"
                                  >
                                    {copiedId === `file-${liveItem.id}` ? (
                                      <>
                                        <Check size={11} className="text-emerald-400" />
                                        <span className="text-emerald-400">تم النسخ</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={11} />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                {liveItem.previousContent && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onEditItemContent(
                                        liveItem.id,
                                        '',
                                        undefined,
                                        { restorePrevious: true }
                                      )
                                    }
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-amber-300 cursor-pointer"
                                    title="التراجع عن آخر تعديل على هذا الملف"
                                  >
                                    <RotateCcw size={11} />
                                    <span>تراجع</span>
                                  </button>
                                )}

                                {isHtmlPreviewable && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleExportAppToVSCode(liveItem)}
                                      className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-[#38bdf8] cursor-pointer"
                                      title="تصدير وفتح كمشروع متعدد الملفات في Visual Studio Code"
                                    >
                                      <Code2 size={11} />
                                      <span>VS Code</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedPreviewIds((prev) => ({
                                          ...prev,
                                          [liveItem.id]: !prev[liveItem.id],
                                        }))
                                      }
                                      className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-slate-200 cursor-pointer"
                                    >
                                      {isPreviewOpen ? (
                                        <EyeOff size={11} />
                                      ) : (
                                        <Eye size={11} />
                                      )}
                                      <span>
                                        {isPreviewOpen ? 'إخفاء المعاينة' : 'معاينة سريعة'}
                                      </span>
                                    </button>
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onOpenItem(liveItem)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0078D4] hover:bg-[#0369a1] text-[11px] text-white font-medium cursor-pointer"
                                  title="فتح التطبيق في نافذة ويندوز مستقلة"
                                >
                                  <ExternalLink size={11} />
                                  <span>فتح بنافذة ويندوز</span>
                                </button>
                              </div>
                            </div>

                            {runtimeErr && (
                              <div className="px-3 py-1.5 bg-rose-950/60 border-t border-rose-500/30 flex items-center justify-between gap-2 text-[11px] text-rose-200">
                                <div className="flex items-center gap-1.5 truncate">
                                  <AlertTriangle
                                    size={12}
                                    className="text-rose-400 shrink-0"
                                  />
                                  <span className="truncate font-mono">
                                    {runtimeErr}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAutoFixItem(liveItem)}
                                  disabled={isAutoFixing}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-medium shrink-0 cursor-pointer"
                                >
                                  {isAutoFixing
                                    ? 'جاري الإصلاح...'
                                    : 'إصلاح تلقائي'}
                                </button>
                              </div>
                            )}

                            {isHtmlPreviewable && isPreviewOpen && (
                              <div className="border-t border-white/[0.08] bg-[#060913] flex flex-col">
                                <div className="px-3 py-1.5 bg-[#0f172a] border-b border-white/[0.08] flex items-center justify-between gap-2 flex-wrap text-[10px]">
                                  <span className="text-slate-300 font-semibold">
                                    معاينة تفاعلية متعددة الأجهزة (ومحدد عناصر AI مدمج بالأسفل):
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {(['desktop', 'tablet', 'mobile'] as const).map((dev) => {
                                      const activeDev = inlinePreviewDeviceById[liveItem.id] || 'desktop';
                                      const label = dev === 'desktop' ? 'كمبيوتر 100%' : dev === 'tablet' ? 'تابلت 768px' : 'موبايل 375px';
                                      return (
                                        <button
                                          key={dev}
                                          type="button"
                                          onClick={() =>
                                            setInlinePreviewDeviceById((prev) => ({
                                              ...prev,
                                              [liveItem.id]: dev,
                                            }))
                                          }
                                          className={`px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors ${
                                            activeDev === dev
                                              ? 'bg-[#0078D4] text-white'
                                              : 'bg-white/[0.06] text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          {label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="h-80 w-full relative flex justify-center overflow-auto bg-[#050811] p-1">
                                  <iframe
                                    title={`preview-${liveItem.id}`}
                                    srcDoc={injectRuntimeErrorBridge(
                                      liveItem.content || '',
                                      liveItem.id
                                    )}
                                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"
                                    style={{
                                      width:
                                        (inlinePreviewDeviceById[liveItem.id] || 'desktop') === 'mobile'
                                          ? '375px'
                                          : (inlinePreviewDeviceById[liveItem.id] || 'desktop') === 'tablet'
                                          ? '768px'
                                          : '100%',
                                      maxWidth: '100%',
                                    }}
                                    className="h-full border border-white/[0.08] rounded-lg transition-all duration-300 bg-black"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

          {isLoading && (
            <div className="text-xs text-[#38bdf8] px-2 flex items-center gap-2">
              <Sparkles size={13} className="animate-spin" />
              <span>
                جاري تنفيذ طلبك بأقصى أداء عبر محرك Windows Copilot الموحد...
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ====================================================================
       * CONTEXTUAL BAR: Pending Attachments & Open Windows Live Target Bar
       * ================================================================== */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2 bg-[#111827] border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto shrink-0">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F17] border border-white/[0.1] text-xs text-slate-200 shrink-0"
            >
              {att.kind === 'image' && att.dataUrl ? (
                <img
                  src={att.dataUrl}
                  alt={att.name}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded object-cover"
                />
              ) : (
                <FileCode size={13} className="text-[#38bdf8]" />
              )}
              <span className="truncate max-w-[130px]">{att.name}</span>
              <button
                type="button"
                onClick={() =>
                  setPendingAttachments((prev) =>
                    prev.filter((item) => item.id !== att.id)
                  )
                }
                className="text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {openScreenWindows.length > 0 && (
        <div className="px-4 py-1.5 bg-[#111827]/70 border-t border-white/[0.06] flex items-center justify-between gap-2 text-[11px] text-slate-300 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <Monitor size={12} className="text-[#38bdf8] shrink-0" />
            <span className="truncate">
              {activeTargetedWindow
                ? `تعديل مباشر من الشات على النافذة المفتوحة: ${activeTargetedWindow.title}`
                : 'النوافذ المفتوحة حالياً في ويندوز (اضغط لاستهدافها بالتعديل الفوري من الشات):'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {openScreenWindows.slice(0, 4).map((win) => {
              const isSel = targetedWindowId === win.id;
              return (
                <button
                  key={win.id}
                  type="button"
                  onClick={() => setTargetedWindowId(isSel ? null : win.id)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                    isSel
                      ? 'bg-[#0078D4]/25 border-[#38bdf8] text-[#38bdf8] font-semibold'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-300'
                  }`}
                >
                  {win.title.slice(0, 18)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {editingMediaContext && (
        <div className="px-4 py-1.5 bg-indigo-950/80 border-t border-indigo-400/30 flex items-center justify-between gap-2 text-[11px] text-indigo-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={editingMediaContext.imageUrl}
              alt={editingMediaContext.title}
              className="w-6 h-6 rounded object-cover border border-indigo-400/40 shrink-0"
            />
            <span className="truncate">
              وضع تعديل الصورة بالأوامر النصية نشط: <strong>{editingMediaContext.title}</strong> — اكتب التعديل المطلوب بالأسفل واضغط إرسال
            </span>
          </div>
          <button
            type="button"
            onClick={() => setEditingMediaContext(null)}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] shrink-0 cursor-pointer"
          >
            إلغاء التعديل
          </button>
        </div>
      )}

      {/* ====================================================================
       * UNIFIED BOTTOM COMMAND DOCK (Single Max-Performance AI Engine)
       * [ إرفاق ] [ صوت حي + نطق ] [ حقل الإدخال الذكي الشامل ] [ تراجع فوري ] [ إرسال ]
       * ================================================================== */}
      {/* ====================================================================
       * UNIFIED BOTTOM COMMAND DOCK (White Background with Blue & Violet Accents)
       * [ إرفاق ] [ صوت حي + نطق ] [ حقل الإدخال الذكي ] [ Default / Plan التبديل ] [ إرسال ]
       * ================================================================== */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0 z-20 shadow-xs"
      >
        {/* 1. Attach File / Image */}
        <button
          type="button"
          onClick={() => attachmentInputRef.current?.click()}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shrink-0 cursor-pointer"
          title="إرفاق صورة أو ملف أو كود"
        >
          <Paperclip size={14} />
        </button>

        {/* 2. Live Voice Input & Voice TTS Toggle */}
        <button
          type="button"
          onClick={() => handleToggleVoiceCommand('chat')}
          className={`p-2 rounded-lg border transition-colors shrink-0 cursor-pointer ${
            isListeningVoice
              ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
          title={
            isListeningVoice
              ? 'جاري الاستماع للصوت... اضغط للإيقاف'
              : 'تحدث بالصوت لتنفيذ أي أمر بالعامية أو الفصحى'
          }
        >
          {isListeningVoice ? <MicOff size={14} /> : <Mic size={14} />}
        </button>

        <button
          type="button"
          onClick={() =>
            setAiMemory((prev) => ({
              ...prev,
              voiceTtsEnabled: !prev.voiceTtsEnabled,
            }))
          }
          className={`p-2 rounded-lg border transition-colors shrink-0 cursor-pointer ${
            aiMemory.voiceTtsEnabled
              ? 'bg-blue-50 border-blue-200 text-blue-600'
              : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
          }`}
          title={
            aiMemory.voiceTtsEnabled
              ? 'الرد الصوتي مفعل (اضغط لكتم الصوت)'
              : 'تفعيل الرد الصوتي الناطق'
          }
        >
          {aiMemory.voiceTtsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>

        {/* 3. Unified Smart Prompt Input Field (Auto-expanding with completely hidden scrollbar) */}
        <textarea
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 180)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if ((input.trim() || pendingAttachments.length > 0) && !isLoading) {
                void handleSend();
                e.currentTarget.style.height = 'auto';
              }
            }
          }}
          placeholder="اسأل أو اطلب أي شيء: استفسارات، كتابة تقارير، تحكم بالنظام، توليد صور، ألعاب، أو برمجة..."
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="flex-1 min-w-[160px] max-h-44 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none leading-relaxed no-scrollbar"
        />

        {/* 4. Gemini Studio Style Default & Plan Mode Switcher (replaces undo button) */}
        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 shrink-0 select-none shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setAiMode('default');
              handleSaveCopilotPreferences({ aiMode: 'default' });
            }}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              aiMode === 'default'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="الوضع الافتراضي (Default Mode): تنفيذ فوري مباشر لجميع المهام"
          >
            Default
          </button>
          <button
            type="button"
            onClick={() => {
              setAiMode('plan');
              handleSaveCopilotPreferences({ aiMode: 'plan' });
            }}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              aiMode === 'plan'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
            title="وضع التخطيط (Plan Mode): خطة مهام منظمة تتطلب الموافقة والتعديل الحي"
          >
            Plan
          </button>
        </div>

        {/* 5. Primary Send / Cancel Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={handleCancelResponse}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 border border-rose-400 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer shadow-sm"
            title="إلغاء الرد وإيقاف التفكير فوراً"
          >
            <Square size={12} className="fill-current" />
            <span>إلغاء الرد</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() && pendingAttachments.length === 0}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm"
          >
            <Send size={13} />
            <span>إرسال</span>
          </button>
        )}
      </form>

      {/* ====================================================================
       * COMPREHENSIVE WINDOWS 11 COPILOT SETTINGS SIDE SHEET (بناء جانبي)
       * ================================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div
            className="w-full max-w-md sm:max-w-lg h-full bg-white text-slate-900 shadow-2xl flex flex-col border-l border-slate-200 text-right animate-in slide-in-from-right duration-300"
            dir="rtl"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">إعدادات Copilot الشاملة</h3>
                  <p className="text-[11px] text-slate-500">أوضاع التشغيل، مسار الملفات، التفضيلات، الجلسات، والذاكرة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Tabs Bar */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                onClick={() => setSettingsTab('mode')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settingsTab === 'mode'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Layers size={13} />
                <span>أوضاع التشغيل</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('storage')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settingsTab === 'storage'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Folder size={13} />
                <span>مسار الملفات</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('preferences')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settingsTab === 'preferences'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Sliders size={13} />
                <span>التفضيلات</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('sessions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settingsTab === 'sessions'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <MessageSquare size={13} />
                <span>الجلسات ({chatSessions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('memory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settingsTab === 'memory'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Brain size={13} />
                <span>الذاكرة (1M)</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('undo')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settingsTab === 'undo'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <RotateCcw size={13} />
                <span>التراجع ({actionUndoStack.length})</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto no-scrollbar space-y-4 text-xs">
              {/* Tab 1: Mode */}
              {settingsTab === 'mode' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                    <h4 className="text-sm font-bold text-slate-900 mb-1.5 flex items-center gap-2">
                      <Sparkles size={16} className="text-blue-600" />
                      <span>اختر أسلوب عمل محرك الذكاء الاصطناعي في Windows 11</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      يمكنك التبديل بين التنفيذ الفوري المباشر أو وضع التخطيط (Plan Mode) على غرار Gemini Studio لإنشاء خطة مهام منظمة تتطلب موافقتك الصريحة مع إمكانية التعديل المباشر قبل التنفيذ.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Option 1: Default Mode */}
                    <div
                      onClick={() => {
                        setAiMode('default');
                        handleSaveCopilotPreferences({ aiMode: 'default' });
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        aiMode === 'default'
                          ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Hammer size={14} className="text-blue-600" />
                          <span>الوضع الافتراضي (Default Mode)</span>
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            aiMode === 'default'
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {aiMode === 'default' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        يقوم الذكاء الاصطناعي بتنفيذ المهام وإجابة الاستفسارات وبناء المشاريع والألعاب فوراً بأسلوب مباشر وسريع.
                      </p>
                    </div>

                    {/* Option 2: Plan Mode */}
                    <div
                      onClick={() => {
                        setAiMode('plan');
                        handleSaveCopilotPreferences({ aiMode: 'plan' });
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        aiMode === 'plan'
                          ? 'bg-violet-50/70 border-violet-500 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <FileText size={14} className="text-violet-600" />
                          <span className="font-bold text-slate-900 text-xs">
                            وضع التخطيط (Plan Mode)
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-bold">
                            Gemini Studio
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            aiMode === 'plan'
                              ? 'border-violet-600 bg-violet-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {aiMode === 'plan' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        يولد خطة عمل تفصيلية خطوة بخطوة مع إمكانية مراجعة وتعديل الخطوات والموافقة عليها قبل الشروع في التنفيذ.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Storage */}
              {settingsTab === 'storage' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50/60 to-purple-50 border border-indigo-200">
                    <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                      <Folder size={16} className="text-blue-600" />
                      <span>تخصيص مسار حفظ الملفات والمشاريع</span>
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      حدد أين تريد حفظ التطبيقات والمشاريع والمستندات والملفات التي ينشئها Copilot: على سطح المكتب، في المستندات، في التنزيلات، أو داخل This PC.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-800 block text-xs">
                      اختر المجلد الافتراضي السريع:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'desktop',
                          label: 'سطح المكتب (Desktop)',
                          path: 'C:/Users/User/Desktop',
                        },
                        {
                          id: 'documents',
                          label: 'المستندات (Documents)',
                          path: 'C:/Users/User/Documents',
                        },
                        {
                          id: 'downloads',
                          label: 'التنزيلات (Downloads)',
                          path: 'C:/Users/User/Downloads',
                        },
                        {
                          id: 'thispc',
                          label: 'محرك الأقراص C: (This PC)',
                          path: 'C:/Projects',
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setOutputDirectory(item.id);
                            handleSaveCopilotPreferences({
                              outputDirectory: item.id,
                            });
                          }}
                          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                            outputDirectory === item.id
                              ? 'bg-blue-50 border-blue-500 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="font-bold text-slate-900 text-xs mb-0.5">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            {item.path}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <label className="font-bold text-slate-800 block text-xs">
                      أو اكتب مسار مخصص (Custom Path / Folder):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={outputDirectory}
                        onChange={(e) => setOutputDirectory(e.target.value)}
                        placeholder="مثال: C:/Projects/MyApps أو desktop"
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveCopilotPreferences({ outputDirectory })
                        }
                        className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
                      >
                        حفظ المسار
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Preferences */}
              {settingsTab === 'preferences' && (
                <div className="space-y-4">
                  {/* Custom Permanent Instructions */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-900 block text-xs">
                      تعليمات وتوجيهات مخصصة دائمة (Custom Instructions)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      وجّه Copilot بأسلوب الإجابة المفضل لديك، وطريقة صياغة الحلول، أو أي تفضيلات دائمة تريد الالتزام بها عبر كل المحادثات.
                    </p>
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      placeholder="مثال: يرجى تقديم إجابات واضحة ودقيقة، مع كتابة كود موديولار منظم بدون إيموجيز، وتنسيق الأفكار في نقاط رئيسية سهلة القراءة..."
                      rows={5}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none resize-none no-scrollbar leading-relaxed"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveCopilotPreferences({ customInstructions })
                      }
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      حفظ التعليمات الدائمة
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Sessions */}
              {settingsTab === 'sessions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-xs font-semibold">
                      جلسات المحادثة المحفوظة ({chatSessions.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleStartNewChat();
                        setShowSettingsModal(false);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>+ محادثة جديدة</span>
                    </button>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                    {chatSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          session.id === activeSessionId
                            ? 'bg-blue-50/80 border-blue-400 shadow-xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          onClick={() => {
                            handleSwitchSession(session.id);
                            setShowSettingsModal(false);
                          }}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {session.title}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{session.messages.length} رسالة</span>
                            <span>•</span>
                            <span>{session.updatedAt}</span>
                          </div>
                        </div>
                        {chatSessions.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="حذف هذه الجلسة"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Memory */}
              {settingsTab === 'memory' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        سعة الذاكرة السياقية (1M Tokens)
                      </span>
                      <span className="font-mono text-blue-600 text-xs font-bold">
                        {usedContextChars.toLocaleString()} / 1,000,000 حرف
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(2, (usedContextChars / 1000000) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {aiMemory.items.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-700">
                        العناصر المحفوظة في الذاكرة:
                      </span>
                      {aiMemory.items.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 truncate"
                        >
                          {item.summary}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAiMemory((prev) => ({
                          ...prev,
                          items: [],
                          cumulativeContextLog: '',
                          usedContextChars: 0,
                          lastEditedFileId: undefined,
                          lastEditedFileName: undefined,
                        }));
                        setSaveMessage('تم تفريغ الذاكرة');
                        setTimeout(() => setSaveMessage(''), 2500);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-medium transition-colors cursor-pointer"
                    >
                      تفريغ الذاكرة السياقية
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 6: Undo */}
              {settingsTab === 'undo' && (
                <div className="space-y-3">
                  <div className="text-slate-600 text-[11px]">
                    التراجع الفوري بخطوة واحدة عن التعديلات التي نفذها Copilot على النظام والتطبيقات:
                  </div>
                  {actionUndoStack.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      لا توجد عمليات مسجلة للتراجع حالياً.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {actionUndoStack.map((snap) => (
                        <div
                          key={snap.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {snap.label}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              استعادة الحالة السابقة للنظام
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUndoActionSnapshot(snap.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold cursor-pointer"
                          >
                            تراجع الآن
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Windows 11 Copilot Pro
              </span>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


