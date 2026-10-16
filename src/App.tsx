import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Minus,
  Square,
  X,
  Volume2,
  VolumeX,
  Wifi,
  BatteryCharging,
  ChevronUp,
  ChevronRight,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Trash2,
  Edit3,
  ExternalLink,
  Copy,
  Scissors,
  Clipboard,
  Maximize2,
  Minimize2,
  Upload,
  Sun,
  Moon,
  Bluetooth,
  Power,
  User,
  CloudSun,
  ArrowUpDown,
  Monitor,
  Lock,
  Bell,
  Keyboard,
  Pin,
  PinOff,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Plus,
  Shield,
  Music,
  Heart,
  Layers,
  Send,
  Sparkles,
  Check,
  Settings,
  ArrowLeft,
  Folder,
  Hammer,
  FileText,
} from 'lucide-react';
import {
  AppId,
  FileSystemItem,
  OSClipboard,
  OSNotification,
  SnapPosition,
  SpotifyTrack,
  SystemSettings,
  UserAccount,
  WindowInstance,
} from './types/os';
import {
  playWin11Sound,
  playVolumeTestPing,
  setMasterSystemAudioVolume,
} from './utils/win11Sounds';
import {
  clearAllWindowsPersistence,
  dedupeFilesList,
  loadAccountProfileSnapshot,
  loadFromIndexedDB,
  loadInitialFilesSync,
  loadInitialSettingsSync,
  normalizeCleanDesktopLayout,
  saveAccountProfileSnapshot,
  saveFilesPersistence,
  saveSettingsPersistence,
  saveSpotifyPersistence,
  saveWindowsPersistence,
} from './utils/osPersistence';
import {
  APP_DEFINITIONS,
  INITIAL_FILE_SYSTEM,
  INITIAL_SPOTIFY_TRACKS,
  WALLPAPERS,
  createSynthesizedWavUrl,
} from './data/initialFileSystem';
import {
  matchKnownNativeApp,
  parseRealExternalFile,
} from './utils/fileImporter';
import { injectWin11KernelBridge } from './utils/kernelEngine';
import {
  AppIconRenderer,
  FileItemIconRenderer,
  TaskViewIcon,
  WindowsStartIcon,
  setGlobalCustomAppIcons,
} from './components/icons/WinIcons';
import { ThisPCApp } from './components/apps/ThisPCApp';
import { SpotifyApp } from './components/apps/SpotifyApp';
import {
  searchRealSongs,
  loadSavedPlaylists,
  savePlaylists,
  CustomPlaylist,
} from './utils/spotifyAudioEngine';
import { NotepadApp } from './components/apps/NotepadApp';
import {
  BrowserApp,
  matchCatalogAppForFile,
} from './components/apps/BrowserApp';
import { VSCodeApp } from './components/apps/VSCodeApp';
import { CopilotApp } from './components/apps/CopilotApp';
import { AppInstallerApp } from './components/apps/AppInstallerApp';
import { PdfReaderApp } from './components/apps/PdfReaderApp';
import { MediaPlayerApp } from './components/apps/MediaPlayerApp';
import {
  MicrosoftStoreApp,
  STORE_APPS_CATALOG,
} from './components/apps/MicrosoftStoreApp';
import {
  CalculatorApp,
  PaintApp,
  PhotosApp,
  SettingsApp,
  TaskManagerApp,
  TerminalApp,
} from './components/apps/UtilityApps';
import { LiveWallpaperCanvas } from './components/apps/LiveWallpaperCanvas';

const GRID_CELL_W = 88;
const GRID_CELL_H = 96;
const GRID_PADDING_X = 12;
const GRID_PADDING_Y = 12;

interface ContextMenuState {
  x: number;
  y: number;
  targetItemId?: string;
}

interface MarqueeBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export default function App() {
  const [rawFiles, setRawFiles] = useState<FileSystemItem[]>(() =>
    dedupeFilesList(loadInitialFilesSync(INITIAL_FILE_SYSTEM))
  );
  const files = useMemo(() => dedupeFilesList(rawFiles), [rawFiles]);
  const filesRef = useRef<FileSystemItem[]>(files);
  filesRef.current = files;

  const setFiles = useCallback(
    (
      updater:
        | FileSystemItem[]
        | ((prev: FileSystemItem[]) => FileSystemItem[])
    ) => {
      setRawFiles((prev) => {
        const cleanPrev = dedupeFilesList(prev);
        const next =
          typeof updater === 'function' ? updater(cleanPrev) : updater;
        const deduped = dedupeFilesList(next);
        filesRef.current = deduped;
        return deduped;
      });
    },
    []
  );

  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrack[]>(() =>
    INITIAL_SPOTIFY_TRACKS.map((t, idx) => ({
      ...t,
      audioUrl: createSynthesizedWavUrl(idx === 0 ? 220 : 261.63, 8),
    }))
  );

  const [settings, setSettings] = useState<SystemSettings>(() =>
    loadInitialSettingsSync({
      theme: 'dark',
      wallpaperId: 'bloom-dark',
      taskbarAlignment: 'center',
      volume: 80,
      isMuted: false,
      brightness: 100,
      password: '',
      requirePasswordOnSettings: false,
      systemSounds: true,
      activeAccountId: 'acc-admin',
      accounts: [
        {
          id: 'acc-admin',
          name: 'Administrator',
          email: 'admin@windows11.local',
          role: 'Administrator',
          avatarColor: '#0078d4',
        },
        {
          id: 'acc-guest',
          name: 'Workspace User',
          email: 'user@windows11.local',
          role: 'Standard User',
          avatarColor: '#10b981',
        },
      ],
    })
  );

  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [topZIndex, setTopZIndex] = useState<number>(20);
  const [hydrationReady, setHydrationReady] = useState<boolean>(false);

  // Hydrate full high-capacity IndexedDB state on mount (restores large videos, images, audio, and all files/settings)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [idbFiles, idbSettings, idbSpotify] = await Promise.all([
        loadFromIndexedDB<FileSystemItem[]>('files'),
        loadFromIndexedDB<SystemSettings>('settings'),
        loadFromIndexedDB<SpotifyTrack[]>('spotifyTracks'),
      ]);
      if (!mounted) return;
      const hasCleanedIdbV10 =
        localStorage.getItem('win11_idb_cleaned_v10') === '1';
      if (Array.isArray(idbFiles) && idbFiles.length > 0) {
        const cleaned = normalizeCleanDesktopLayout(idbFiles, !hasCleanedIdbV10);
        filesRef.current = cleaned;
        setFiles(cleaned);
      }
      if (idbSettings && typeof idbSettings === 'object') {
        setSettings((prev) => ({
          ...prev,
          ...idbSettings,
          accounts:
            Array.isArray(idbSettings.accounts) &&
            idbSettings.accounts.length > 0
              ? idbSettings.accounts
              : prev.accounts,
        }));
      }
      if (!hasCleanedIdbV10) {
        try {
          localStorage.setItem('win11_idb_cleaned_v10', '1');
        } catch {
          // ignore
        }
      }
      if (Array.isArray(idbSpotify) && idbSpotify.length > 0) {
        setSpotifyTracks(
          idbSpotify.map((t, idx) => ({
            ...t,
            audioUrl:
              t.audioUrl && t.audioUrl.length > 5
                ? t.audioUrl
                : createSynthesizedWavUrl(idx % 2 === 0 ? 220 : 261.63, 8),
          }))
        );
      }
      setHydrationReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Automatically save every change to files, settings, Spotify tracks, and windows + Per-Account Profile & Cloud Sync
  const prevAccountIdRef = useRef<string>(settings.activeAccountId || 'acc-admin');

  useEffect(() => {
    saveFilesPersistence(files);
  }, [files]);

  useEffect(() => {
    saveSettingsPersistence(settings);
  }, [settings]);

  // Switch isolated user desktop & theme workspace when activeAccountId changes
  useEffect(() => {
    const nextAccId = settings.activeAccountId || 'acc-admin';
    if (prevAccountIdRef.current !== nextAccId) {
      prevAccountIdRef.current = nextAccId;
      (async () => {
        const targetProf = await loadAccountProfileSnapshot(nextAccId);
        if (targetProf && Array.isArray(targetProf.files) && targetProf.files.length > 0) {
          const cleaned = normalizeCleanDesktopLayout(targetProf.files);
          filesRef.current = cleaned;
          setFiles(cleaned);
          setSettings((prev) => ({
            ...prev,
            wallpaperId: targetProf.wallpaperId || prev.wallpaperId,
            liveWallpaperId: targetProf.liveWallpaperId || 'none',
            accentColor: targetProf.accentColor || prev.accentColor || '#0078d4',
            taskbarAlignment: targetProf.taskbarAlignment || prev.taskbarAlignment,
            taskbarStyle: targetProf.taskbarStyle || prev.taskbarStyle || 'mica',
          }));
        } else {
          const defaultFiles = normalizeCleanDesktopLayout(INITIAL_FILE_SYSTEM);
          filesRef.current = defaultFiles;
          setFiles(defaultFiles);
        }
      })();
    }
  }, [settings.activeAccountId]);

  // Debounced Save & Cloud Sync to /api/cloud-sync/:accountId
  useEffect(() => {
    if (!hydrationReady) return;
    const timer = setTimeout(() => {
      const accId = settings.activeAccountId || 'acc-admin';
      void saveAccountProfileSnapshot(accId, {
        accountId: accId,
        files: filesRef.current,
        wallpaperId: settings.wallpaperId,
        liveWallpaperId: settings.liveWallpaperId,
        accentColor: settings.accentColor,
        taskbarStyle: settings.taskbarStyle,
        taskbarAlignment: settings.taskbarAlignment,
        theme: settings.theme,
        updatedAt: new Date().toISOString(),
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    files,
    settings.activeAccountId,
    settings.wallpaperId,
    settings.liveWallpaperId,
    settings.accentColor,
    settings.taskbarStyle,
    settings.taskbarAlignment,
    settings.theme,
    hydrationReady,
  ]);

  useEffect(() => {
    if (hydrationReady) {
      saveSpotifyPersistence(spotifyTracks);
    }
  }, [spotifyTracks, hydrationReady]);

  useEffect(() => {
    saveWindowsPersistence(windows);
  }, [windows]);

  // Windows 11 Notification Center & Toast Popups (Starts clean without unread badge clutter)
  const [notifications, setNotifications] = useState<OSNotification[]>([]);
  const [toastNotifications, setToastNotifications] = useState<OSNotification[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [snapHoverWinId, setSnapHoverWinId] = useState<string | null>(null);
  const [, setIconRenderTick] = useState<number>(0);

  // Sync Master System Volume & Mute state with Web Audio synthesizer and HTML media
  useEffect(() => {
    setMasterSystemAudioVolume(settings.volume, settings.isMuted);
  }, [settings.volume, settings.isMuted]);

  // Sync Custom App Icons globally across Desktop, Taskbar, Start Menu, and Windows
  useEffect(() => {
    setGlobalCustomAppIcons(settings.customAppIcons);
    setIconRenderTick((t) => t + 1);
  }, [settings.customAppIcons]);

  const playSoundIfEnabled = useCallback(
    (type: 'startup' | 'shutdown' | 'notify' | 'unlock' | 'lock' | 'appOpen' | 'error') => {
      if (settings.systemSounds === false || settings.isMuted) return;
      playWin11Sound(type, settings.volume, false);
    },
    [settings.systemSounds, settings.isMuted, settings.volume]
  );

  const pushNotification = useCallback(
    (title: string, message: string, appId?: AppId) => {
      const notif: OSNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        appId,
        read: false,
      };
      setNotifications((prev) => [notif, ...prev.slice(0, 19)]);
      setToastNotifications((prev) => [notif, ...prev.slice(0, 2)]);
      playSoundIfEnabled('notify');
      setTimeout(() => {
        setToastNotifications((prev) => prev.filter((t) => t.id !== notif.id));
      }, 4500);
    },
    [playSoundIfEnabled]
  );

  // Active & Sign-in User Accounts
  const accountsList: UserAccount[] = useMemo(
    () =>
      settings.accounts && settings.accounts.length > 0
        ? settings.accounts
        : [
            {
              id: 'acc-admin',
              name: 'Administrator',
              email: 'admin@windows11.local',
              role: 'Administrator',
              avatarColor: '#0078d4',
            },
          ],
    [settings.accounts]
  );

  const activeAccount: UserAccount = useMemo(
    () =>
      accountsList.find((a) => a.id === settings.activeAccountId) || accountsList[0],
    [accountsList, settings.activeAccountId]
  );

  // Lock Screen & System Power state
  const [isSystemLocked, setIsSystemLocked] = useState<boolean>(false);
  const [lockStage, setLockStage] = useState<'cover' | 'signin'>('cover');
  const [signInSelectedAccId, setSignInSelectedAccId] = useState<string>('acc-admin');
  const [lockPasswordInput, setLockPasswordInput] = useState<string>('');
  const [showLockPassword, setShowLockPassword] = useState<boolean>(false);
  const [lockError, setLockError] = useState<string>('');
  const [isAddingAccountOnLock, setIsAddingAccountOnLock] = useState<boolean>(false);
  const [newLockAccName, setNewLockAccName] = useState<string>('');
  const [newLockAccPin, setNewLockAccPin] = useState<string>('');
  const [isSettingPinOnLock, setIsSettingPinOnLock] = useState<boolean>(false);
  const [newPinValue, setNewPinValue] = useState<string>('');
  const [isLockPowerMenuOpen, setIsLockPowerMenuOpen] = useState<boolean>(false);
  const [isPowerMenuOpen, setIsPowerMenuOpen] = useState<boolean>(false);
  const [powerState, setPowerState] = useState<
    'on' | 'sleeping' | 'shutting_down' | 'powered_off' | 'restarting' | 'booting'
  >('on');
  const [powerStatusText, setPowerStatusText] = useState<string>('Shutting down');
  const [powerProgress, setPowerProgress] = useState<number>(0);

  const triggerLockScreen = useCallback(() => {
    setIsStartOpen(false);
    setIsPowerMenuOpen(false);
    setIsQuickSettingsOpen(false);
    setIsCalendarOpen(false);
    setSignInSelectedAccId(activeAccount.id);
    setLockStage('cover');
    setLockPasswordInput('');
    setLockError('');
    setIsAddingAccountOnLock(false);
    setIsSettingPinOnLock(false);
    setIsSystemLocked(true);
    playSoundIfEnabled('lock');
  }, [activeAccount.id, playSoundIfEnabled]);

  const triggerSleep = useCallback(() => {
    setIsStartOpen(false);
    setIsPowerMenuOpen(false);
    setIsLockPowerMenuOpen(false);
    setIsQuickSettingsOpen(false);
    setIsCalendarOpen(false);
    playSoundIfEnabled('shutdown');
    setPowerState('sleeping');
  }, [playSoundIfEnabled]);

  const triggerShutDown = useCallback(() => {
    setIsStartOpen(false);
    setIsPowerMenuOpen(false);
    setIsLockPowerMenuOpen(false);
    setIsQuickSettingsOpen(false);
    setIsCalendarOpen(false);
    saveFilesPersistence(filesRef.current);
    saveSettingsPersistence(settings);
    playSoundIfEnabled('shutdown');
    setPowerProgress(18);
    setPowerStatusText('Saving your Windows 11 workspace and closing apps...');
    setPowerState('shutting_down');
    setTimeout(() => {
      setPowerProgress(68);
      setPowerStatusText('Shutting down');
    }, 900);
    setTimeout(() => {
      setPowerProgress(100);
    }, 1900);
    setTimeout(() => {
      setWindows([]);
      setPowerState('powered_off');
    }, 2600);
  }, [playSoundIfEnabled, settings]);

  const triggerRestart = useCallback(() => {
    setIsStartOpen(false);
    setIsPowerMenuOpen(false);
    setIsLockPowerMenuOpen(false);
    setIsQuickSettingsOpen(false);
    setIsCalendarOpen(false);
    saveFilesPersistence(filesRef.current);
    saveSettingsPersistence(settings);
    playSoundIfEnabled('shutdown');
    setPowerProgress(22);
    setPowerStatusText('Saving system state and closing apps...');
    setPowerState('restarting');
    setTimeout(() => {
      setPowerProgress(74);
      setPowerStatusText('Restarting');
    }, 950);
    setTimeout(() => {
      setPowerProgress(100);
    }, 1850);
    setTimeout(() => {
      setWindows([]);
      setPowerState('booting');
      setTimeout(() => {
        playSoundIfEnabled('startup');
        setPowerState('on');
        setSignInSelectedAccId(activeAccount.id);
        setLockStage('cover');
        setIsSystemLocked(true);
      }, 2400);
    }, 2500);
  }, [activeAccount.id, playSoundIfEnabled, settings]);

  // Desktop interaction states
  const [selectedDesktopIds, setSelectedDesktopIds] = useState<string[]>([]);
  const [renamingDesktopId, setRenamingDesktopId] = useState<string | null>(null);
  const [renameDesktopValue, setRenameDesktopValue] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [marquee, setMarquee] = useState<MarqueeBox | null>(null);
  const marqueeRef = useRef<MarqueeBox | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [osClipboard, setOsClipboard] = useState<OSClipboard | null>(null);

  // Shell popups
  const [isStartOpen, setIsStartOpen] = useState<boolean>(false);
  const [showAllStartApps, setShowAllStartApps] = useState<boolean>(false);
  const [startSearch, setStartSearch] = useState<string>('');
  const [isTaskViewOpen, setIsTaskViewOpen] = useState<boolean>(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState<boolean>(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [isKeyboardFlyoutOpen, setIsKeyboardFlyoutOpen] = useState<boolean>(false);
  const [isCopilotFlyoutOpen, setIsCopilotFlyoutOpen] = useState<boolean>(false);
  const [miniCopilotView, setMiniCopilotView] = useState<'chat' | 'settings'>('chat');
  const [flyoutAnchorX, setFlyoutAnchorX] = useState<number | null>(null);
  const [miniChatMessages, setMiniChatMessages] = useState<
    Array<{
      id: string;
      role: 'user' | 'assistant';
      text: string;
      badge?: string;
      imageUrl?: string;
      imageTitle?: string;
      previousPrompt?: string;
    }>
  >([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'أهلاً بك! أنا Copilot الذكي الشامل لنظام Windows 11. اطلب بناء لعبة 3D أو موقع، توليد أو تعديل صورة 4K، أو تشغيل وإيقاف أي شيء في النظام فوراً.',
    },
  ]);
  const [miniChatInput, setMiniChatInput] = useState<string>('');
  const [isMiniChatLoading, setIsMiniChatLoading] = useState<boolean>(false);
  const [isCopilotWindowBusy, setIsCopilotWindowBusy] = useState<boolean>(false);
  const miniChatAbortRef = useRef<AbortController | null>(null);
  const miniChatScrollRef = useRef<HTMLDivElement | null>(null);
  const [miniChatCopiedId, setMiniChatCopiedId] = useState<string | null>(null);
  const [miniCustomFolder, setMiniCustomFolder] = useState<string>('');
  const [miniSmartSuggestions, setMiniSmartSuggestions] = useState<string[]>([
    'اعمل لعبة سيارات 3D ثلاثية الأبعاد',
    'صمم صورة فضاء 4K وعينها كخلفية',
    'فعل الوضع الليلي والضوء الليلي',
    'افتح الإعدادات وخصص الألوان',
  ]);
  const handleRefreshMiniSuggestions = useCallback(() => {
    const pools = [
      [
        'ابنِ لعبة ألغاز ثلاثية الأبعاد تفاعلية',
        'ولّد صورة رائد فضاء في مجرة نيون بدقة فائقة',
        'صمم حاسبة متقدمة مع رسوم بيانية',
        'نظف الملفات المؤقتة وحسن سرعة النظام',
      ],
      [
        'أنشئ موقعاً إلكترونياً كاملاً بتصميم Glassmorphism',
        'صمم خلفية طبيعية لجبال الألب الثلجية مع إضاءة حية',
        'اكتب كود تطبيق لإدارة المهام والمواعيد اليومية',
        'اعرض تفاصيل استهلاك الذاكرة والمعالج بدقة',
      ],
      [
        'اعمل لعبة طائرات حربية 3D مع إطلاق صواريخ',
        'صمم شعاراً احترافياً بتدرجات اللون الأزرق والبنفسجي',
        'فعل وضع التخطيط المنظم Plan Mode',
        'أنشئ قائمة تشغيل موسيقية ذكية في Spotify',
      ],
    ];
    setMiniSmartSuggestions((prev) => {
      const idx = Math.floor(Math.random() * pools.length);
      return pools[idx] || prev;
    });
  }, []);
  const handleCopyMiniChatText = useCallback((textToCopy: string, idKey: string) => {
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
    setMiniChatCopiedId(idKey);
    setTimeout(() => {
      setMiniChatCopiedId((prev) => (prev === idKey ? null : prev));
    }, 1800);
  }, []);
  const isAiCurrentlyWorking = isMiniChatLoading || isCopilotWindowBusy;
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [keyboardLang, setKeyboardLang] = useState<'ENG' | 'ARA'>('ENG');
  const [keyboardInfo, setKeyboardInfo] = useState<{
    key: string;
    lastKey: string;
    code: string;
    lastCode: string;
    language: 'ARA' | 'ENG';
    detectedScript: string;
    physicalLayout: string;
    capsLock: boolean;
    numLock: boolean;
    shift: boolean;
    shiftPressed: boolean;
    ctrl: boolean;
    ctrlPressed: boolean;
    alt: boolean;
    altPressed: boolean;
    locationLabel: string;
    keyboardHardware: string;
    totalKeysPressed: number;
    wpm: number;
  }>({
    key: 'Ready',
    lastKey: 'None',
    code: 'KeyA',
    lastCode: 'Ready',
    language: 'ENG',
    detectedScript: 'English (US) QWERTY',
    physicalLayout: 'Standard 104-Key QWERTY / Arabic (101)',
    capsLock: false,
    numLock: true,
    shift: false,
    shiftPressed: false,
    ctrl: false,
    ctrlPressed: false,
    alt: false,
    altPressed: false,
    locationLabel: 'Standard Key',
    keyboardHardware: 'Standard 104-Key QWERTY / Arabic (101) Keyboard',
    totalKeysPressed: 0,
    wpm: 0,
  });
  const [activePressedCodes, setActivePressedCodes] = useState<string[]>([]);
  const keyPressTimestampsRef = useRef<number[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Quick toggles in system tray
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(true);
  const [btEnabled, setBtEnabled] = useState<boolean>(true);
  const [nightLight, setNightLight] = useState<boolean>(false);

  // Window drag & 8-way resize refs
  const [isWindowInteracting, setIsWindowInteracting] = useState<boolean>(false);
  const draggingWinRef = useRef<{
    winId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizingWinRef = useRef<{
    winId: string;
    dir: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const desktopRef = useRef<HTMLDivElement | null>(null);
  const desktopFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullScreen = useCallback((forceState?: boolean) => {
    if (forceState === true && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullScreen(true);
    } else if (forceState === false && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
      setIsFullScreen(false);
    } else if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullScreen(false);
    }
  }, []);

  const desktopItems = useMemo(
    () => dedupeFilesList(files).filter((f) => f.parentId === 'desktop'),
    [files]
  );

  const recycleBinHasItems = useMemo(
    () => files.some((f) => f.parentId === 'recyclebin'),
    [files]
  );

  const findNextFreeDesktopGrid = useCallback(
    (existingItems: FileSystemItem[]): { col: number; row: number } => {
      const occupied = new Set(
        existingItems
          .filter((i) => i.parentId === 'desktop')
          .map((i) => `${i.gridCol ?? 0},${i.gridRow ?? 0}`)
      );
      const maxRows = 6;
      for (let col = 0; col < 18; col++) {
        for (let row = 0; row < maxRows; row++) {
          if (!occupied.has(`${col},${row}`)) {
            return { col, row };
          }
        }
      }
      return { col: 3, row: 0 };
    },
    []
  );

  const focusWindow = useCallback((winId: string) => {
    setTopZIndex((prev) => {
      const nextZ = prev + 1;
      setWindows((ws) =>
        ws.map((w) =>
          w.id === winId ? { ...w, zIndex: nextZ, isMinimized: false } : w
        )
      );
      return nextZ;
    });
    setActiveWindowId(winId);
  }, []);

  const launchApp = useCallback(
    (
      appId: AppId,
      options?: {
        fileId?: string;
        folderId?: string;
        customTitle?: string;
        forceNewWindow?: boolean;
        isMinimized?: boolean;
        keepFlyoutOpen?: boolean;
      }
    ) => {
      if (!options?.keepFlyoutOpen) {
        setIsStartOpen(false);
        setIsTaskViewOpen(false);
        setIsQuickSettingsOpen(false);
        setIsCalendarOpen(false);
      }

      const targetAppId: AppId = appId === 'recyclebin' ? 'thispc' : appId;
      const targetFolderId =
        appId === 'recyclebin' ? 'recyclebin' : options?.folderId;

      const existing = !options?.forceNewWindow
        ? windows.find(
            (w) =>
              w.appId === targetAppId &&
              w.isOpen &&
              (!options?.fileId || w.fileId === options.fileId)
          )
        : undefined;

      if (existing) {
        setTopZIndex((prev) => {
          const nextZ = prev + 1;
          setWindows((ws) =>
            ws.map((w) =>
              w.id === existing.id
                ? {
                    ...w,
                    isMinimized:
                      options?.isMinimized !== undefined
                        ? options.isMinimized
                        : false,
                    zIndex: nextZ,
                    fileId: options?.fileId ?? w.fileId,
                    folderId: targetFolderId ?? w.folderId,
                    title: options?.customTitle ?? w.title,
                  }
                : w
            )
          );
          return nextZ;
        });
        if (!options?.isMinimized) {
          setActiveWindowId(existing.id);
        }
        return;
      }

      const appDef = APP_DEFINITIONS.find((a) => a.id === targetAppId);
      const sameAppCount = windows.filter(
        (w) => w.appId === targetAppId && w.isOpen
      ).length;
      const width = Math.min(
        appDef?.defaultSize.width || 880,
        window.innerWidth - 40
      );
      const height = Math.min(
        appDef?.defaultSize.height || 580,
        window.innerHeight - 80
      );
      const offset = ((windows.length + sameAppCount) % 6) * 26;
      const x = Math.max(
        20,
        Math.round((window.innerWidth - width) / 2) + offset - 30
      );
      const y = Math.max(
        16,
        Math.round((window.innerHeight - height - 48) / 2) + offset - 20
      );

      const newWinId = `win-${targetAppId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 5)}`;
      const baseTitle =
        options?.customTitle ||
        (appId === 'recyclebin'
          ? 'Recycle Bin'
          : appDef?.name || 'Window');
      const finalTitle =
        sameAppCount > 0 && !options?.customTitle
          ? `${baseTitle} (${sameAppCount + 1})`
          : baseTitle;

      setTopZIndex((prev) => {
        const nextZ = prev + 1;
        const newWin: WindowInstance = {
          id: newWinId,
          appId: targetAppId,
          title: finalTitle,
          isOpen: true,
          isMinimized: Boolean(options?.isMinimized),
          isMaximized: false,
          zIndex: nextZ,
          position: { x, y },
          size: { width, height },
          fileId: options?.fileId,
          folderId: targetFolderId,
        };
        setWindows((ws) => [...ws, newWin]);
        return nextZ;
      });
      if (!options?.isMinimized) {
        setActiveWindowId(newWinId);
      }
    },
    [windows]
  );

  const snapWindowById = useCallback(
    (winId: string, snapPos?: SnapPosition) => {
      setTopZIndex((prev) => {
        const nextZ = prev + 1;
        setWindows((ws) =>
          ws.map((w) =>
            w.id === winId
              ? {
                  ...w,
                  isMinimized: false,
                  isMaximized: false,
                  snapPosition: snapPos,
                  zIndex: nextZ,
                }
              : w
          )
        );
        return nextZ;
      });
      setActiveWindowId(winId);
      setSnapHoverWinId(null);
    },
    []
  );

  const snapWindowByAppId = useCallback(
    (appId: AppId, snapPos: SnapPosition) => {
      const existing = windows.find((w) => w.appId === appId && w.isOpen);
      if (existing) {
        snapWindowById(existing.id, snapPos);
      } else {
        launchApp(appId);
        setTimeout(() => {
          setWindows((ws) =>
            ws.map((w) =>
              w.appId === appId
                ? { ...w, isMaximized: false, snapPosition: snapPos }
                : w
            )
          );
        }, 50);
      }
    },
    [windows, snapWindowById, launchApp]
  );

  const openFileSystemItem = useCallback(
    (item: FileSystemItem) => {
      if (!item) return;
      if (item.appId) {
        launchApp(item.appId);
        return;
      }
      if (item.type === 'exe' || item.type === 'app') {
        const matchedNative = matchKnownNativeApp(item.name);
        if (matchedNative) {
          launchApp(matchedNative.appId);
          return;
        }
      }
      if (item.type === 'folder') {
        launchApp('thispc', {
          folderId: item.id,
          customTitle: `${item.name} - File Explorer`,
        });
        return;
      }
      if (item.type === 'code') {
        launchApp('vscode', {
          fileId: item.id,
          folderId: item.parentId,
          customTitle: `${item.name} - Visual Studio Code`,
        });
        return;
      }
      if (item.type === 'pdf') {
        launchApp('pdfreader', {
          fileId: item.id,
          customTitle: `${item.name} - PDF Reader Studio`,
        });
        return;
      }
      if (item.type === 'video') {
        launchApp('mediaplayer', {
          fileId: item.id,
          customTitle: `${item.name} - Media Player`,
        });
        return;
      }
      if (item.type === 'html' || item.type === 'exe') {
        launchApp('edge', {
          fileId: item.id,
          customTitle: item.name,
        });
        return;
      }
      if (item.type === 'audio') {
        const audioSrc = item.mediaUrl || item.audioUrl;
        if (audioSrc) {
          const cleanTitle = item.name.replace(/\.[^/.]+$/, '');
          setSpotifyTracks((prev) => {
            if (prev.some((t) => t.audioUrl === audioSrc)) return prev;
            return [
              {
                id: `track-${Date.now()}`,
                title: cleanTitle,
                artist: item.audioArtist || 'Local Audio File',
                album: 'My PC',
                duration: 180,
                coverUrl:
                  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80',
                audioUrl: audioSrc,
                isLiked: true,
                source: 'local',
              },
              ...prev,
            ];
          });
        }
        launchApp('mediaplayer', {
          fileId: item.id,
          customTitle: `${item.name} - Media Player`,
        });
        return;
      }
      if (item.type === 'image') {
        launchApp('photos', {
          fileId: item.id,
          customTitle: `${item.name} - Photos`,
        });
        return;
      }
      launchApp('notepad', {
        fileId: item.id,
        customTitle: `${item.name} - Notepad`,
      });
    },
    [launchApp]
  );

  // Synchronous item creator using filesRef so it ALWAYS returns a valid FileSystemItem even inside async functions
  const createFileSystemItem = useCallback(
    (
      name: string,
      type: FileSystemItem['type'],
      parentId = 'desktop',
      extra?: Partial<FileSystemItem>
    ): FileSystemItem => {
      const currentList = filesRef.current;
      const pos =
        parentId === 'desktop'
          ? findNextFreeDesktopGrid(currentList)
          : { col: undefined, row: undefined };

      const initialFeatures = Array.isArray(extra?.featureHistory)
        ? extra.featureHistory
        : extra?.content
          ? [`الإصدار الأساسي: ${name}`]
          : undefined;

      const initialSnapshots =
        extra?.versionSnapshots ||
        (extra?.content
          ? [
              {
                id: `snap-v1-${Date.now()}`,
                version: 1,
                label: initialFeatures?.[0] || `الإصدار الأول (v1)`,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                content: extra.content,
                featureHistory: initialFeatures || [],
              },
            ]
          : undefined);

      const generatedId = `item-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}-${Math.floor(Math.random() * 1000)}`;

      const createdItem: FileSystemItem = {
        ...extra,
        id: generatedId,
        name,
        type,
        parentId,
        size: extra?.size ?? (type === 'folder' ? 0 : 2048),
        createdAt: new Date().toISOString().slice(0, 10),
        gridCol: extra?.gridCol ?? pos.col,
        gridRow: extra?.gridRow ?? pos.row,
        ...(initialFeatures ? { featureHistory: initialFeatures } : {}),
        ...(initialSnapshots ? { versionSnapshots: initialSnapshots } : {}),
      };

      const nextFiles = dedupeFilesList([
        ...currentList.filter((f) => f.id !== createdItem.id),
        createdItem,
      ]);
      filesRef.current = nextFiles;
      setFiles(nextFiles);
      return createdItem;
    },
    [findNextFreeDesktopGrid]
  );

  const updateFileSystemItem = useCallback(
    (id: string, partial: Partial<FileSystemItem>) => {
      setFiles((prev) => {
        const next = prev.map((f) => (f.id === id ? { ...f, ...partial } : f));
        filesRef.current = next;
        return next;
      });
    },
    []
  );

  const editItemContent = useCallback(
    (
      id: string,
      newContent: string,
      newName?: string,
      extraMeta?: {
        addedFeature?: string;
        restorePrevious?: boolean;
        restoreVersion?: number;
      }
    ) => {
      setFiles((prev) => {
        const next = prev.map((f) => {
          if (f.id !== id) return f;

          // Restore specific version snapshot (v1, v2, v3...)
          if (
            typeof extraMeta?.restoreVersion === 'number' &&
            Array.isArray(f.versionSnapshots)
          ) {
            const targetSnap = f.versionSnapshots.find(
              (s) => s.version === extraMeta.restoreVersion
            );
            if (targetSnap) {
              return {
                ...f,
                previousContent: f.content,
                content: targetSnap.content,
                featureHistory: targetSnap.featureHistory,
                size: new Blob([targetSnap.content]).size,
              };
            }
          }

          // Undo to previous content
          if (extraMeta?.restorePrevious && f.previousContent) {
            const restoredContent = f.previousContent;
            const prevHistory = Array.isArray(f.featureHistory)
              ? f.featureHistory.slice(0, -1)
              : [];
            return {
              ...f,
              content: restoredContent,
              previousContent: undefined,
              featureHistory: prevHistory,
              size: new Blob([restoredContent]).size,
            };
          }

          const currentHistory = Array.isArray(f.featureHistory) ? f.featureHistory : [];
          const cleanFeat = extraMeta?.addedFeature?.trim();
          const nextHistory =
            cleanFeat && !currentHistory.includes(cleanFeat)
              ? [...currentHistory, cleanFeat]
              : currentHistory;

          // Build versionSnapshots stack (up to 15 versions)
          const existingSnaps = Array.isArray(f.versionSnapshots)
            ? [...f.versionSnapshots]
            : f.content
              ? [
                  {
                    id: `snap-v1-${Date.now() - 1000}`,
                    version: 1,
                    label: currentHistory[0] || `الإصدار الأول (v1)`,
                    timestamp: 'سابق',
                    content: f.content,
                    featureHistory: currentHistory,
                  },
                ]
              : [];

          let nextSnaps = existingSnaps;
          if (newContent && (existingSnaps.length === 0 || f.content !== newContent || cleanFeat)) {
            const nextVer =
              existingSnaps.length > 0
                ? Math.max(...existingSnaps.map((s) => s.version)) + 1
                : 1;
            nextSnaps = [
              ...existingSnaps,
              {
                id: `snap-v${nextVer}-${Date.now()}`,
                version: nextVer,
                label: cleanFeat || `تحديث الكود (v${nextVer})`,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                content: newContent,
                featureHistory: nextHistory,
              },
            ].slice(-15);
          }

          return {
            ...f,
            previousContent:
              f.content && f.content !== newContent ? f.content : f.previousContent,
            content: newContent,
            name: newName || f.name,
            featureHistory: nextHistory,
            versionSnapshots: nextSnaps,
            size: new Blob([newContent]).size,
          };
        });
        filesRef.current = next;
        return next;
      });
    },
    []
  );

  // Global Bridge for Microsoft Store Utility Apps (Saves files to Desktop & sets Wallpapers from Store apps)
  useEffect(() => {
    const onStoreBridgeMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== 'STORE_OS_BRIDGE') return;

      if (data.action === 'SAVE_FILE' && data.fileName) {
        const fType =
          data.fileType === 'html' ||
          data.fileType === 'code' ||
          data.fileType === 'image' ||
          data.fileType === 'pdf'
            ? data.fileType
            : 'text';
        createFileSystemItem(String(data.fileName), fType, 'desktop', {
          content: String(data.content || ''),
          imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
          size: new Blob([String(data.content || '')]).size,
        });
        pushNotification(
          'Microsoft Store Bridge',
          `تم حفظ الملف "${data.fileName}" على سطح المكتب بنجاح.`,
          'store'
        );
      } else if (data.action === 'SET_WALLPAPER' && data.imageUrl) {
        createFileSystemItem('Store_Wallpaper.svg', 'image', 'desktop', {
          content: String(data.svgCode || ''),
          imageUrl: String(data.imageUrl),
        });
        setSettings((prev) => ({
          ...prev,
          customWallpaperUrl: String(data.imageUrl),
          liveWallpaperId: 'none',
        }));
        pushNotification(
          'Pixel & Vector Studio',
          'تم تعيين التصميم الجديد كخلفية لسطح المكتب وحفظ نسخة منه!',
          'store'
        );
      }
    };
    window.addEventListener('message', onStoreBridgeMessage);
    return () => window.removeEventListener('message', onStoreBridgeMessage);
  }, [createFileSystemItem, pushNotification]);

  const renameFileSystemItem = useCallback((id: string, newName: string) => {
    const clean = newName.trim();
    if (!clean) return;
    setFiles((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, name: clean } : f));
      filesRef.current = next;
      return next;
    });
  }, []);

  const deleteFileSystemItems = useCallback((ids: string[]) => {
    setFiles((prev) => {
      const next = prev
        .map((f) => {
          if (!ids.includes(f.id)) return f;
          if (f.appId === 'recyclebin') return f;
          if (f.parentId === 'recyclebin') {
            return null;
          }
          return {
            ...f,
            originalParentId: f.parentId,
            parentId: 'recyclebin',
          };
        })
        .filter(Boolean) as FileSystemItem[];
      filesRef.current = next;
      return next;
    });
    setSelectedDesktopIds((prev) => prev.filter((id) => !ids.includes(id)));
  }, []);

  const restoreFileSystemItems = useCallback(
    (ids: string[]) => {
      setFiles((prev) => {
        const updated = [...prev];
        for (const id of ids) {
          const idx = updated.findIndex((f) => f.id === id);
          if (idx !== -1 && updated[idx].parentId === 'recyclebin') {
            const targetParent = updated[idx].originalParentId || 'desktop';
            const pos =
              targetParent === 'desktop'
                ? findNextFreeDesktopGrid(updated)
                : { col: undefined, row: undefined };
            updated[idx] = {
              ...updated[idx],
              parentId: targetParent,
              gridCol: pos.col,
              gridRow: pos.row,
            };
          }
        }
        filesRef.current = updated;
        return updated;
      });
    },
    [findNextFreeDesktopGrid]
  );

  const moveFileSystemItems = useCallback(
    (ids: string[], targetFolderId: string) => {
      setFiles((prev) => {
        const updated = [...prev];
        for (const id of ids) {
          const idx = updated.findIndex((f) => f.id === id);
          if (idx !== -1 && updated[idx].id !== targetFolderId) {
            const pos =
              targetFolderId === 'desktop'
                ? findNextFreeDesktopGrid(updated)
                : { col: undefined, row: undefined };
            updated[idx] = {
              ...updated[idx],
              parentId: targetFolderId,
              gridCol: pos.col,
              gridRow: pos.row,
            };
          }
        }
        filesRef.current = updated;
        return updated;
      });
    },
    [findNextFreeDesktopGrid]
  );

  const copySingleItem = useCallback(
    (
      item: FileSystemItem,
      targetFolder = 'desktop',
      customName?: string
    ): FileSystemItem => {
      const extIndex = item.name.lastIndexOf('.');
      const defaultCopyName =
        extIndex > 0
          ? `${item.name.slice(0, extIndex)} - Copy${item.name.slice(extIndex)}`
          : `${item.name} - Copy`;
      return createFileSystemItem(
        customName || defaultCopyName,
        item.type,
        targetFolder,
        {
          content: item.content,
          mediaUrl: item.mediaUrl,
          imageUrl: item.imageUrl,
          audioUrl: item.audioUrl,
          customIconUrl: item.customIconUrl,
          mimeType: item.mimeType,
          peInfo: item.peInfo,
          size: item.size,
          appId: item.appId,
        }
      );
    },
    [createFileSystemItem]
  );

  const pasteToFolder = useCallback(
    (targetFolder: string) => {
      if (!osClipboard || osClipboard.ids.length === 0) return;
      if (osClipboard.mode === 'cut') {
        moveFileSystemItems(osClipboard.ids, targetFolder);
        setOsClipboard(null);
      } else {
        const itemsToCopy = filesRef.current.filter((f) =>
          osClipboard.ids.includes(f.id)
        );
        itemsToCopy.forEach((item) => {
          copySingleItem(item, targetFolder);
        });
      }
    },
    [osClipboard, moveFileSystemItems, copySingleItem]
  );

  const arrangeDesktopIcons = useCallback(() => {
    setFiles((prev) => {
      const cleaned = normalizeCleanDesktopLayout(prev, true);
      const desk = cleaned.filter((f) => f.parentId === 'desktop');
      const others = cleaned.filter((f) => f.parentId !== 'desktop');
      const coreOrder = [
        'desk-thispc',
        'desk-recyclebin',
        'desk-edge',
        'desk-vscode',
        'desk-copilot',
      ];
      const sorted = [...desk].sort((a, b) => {
        const idxA = coreOrder.indexOf(a.id);
        const idxB = coreOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        if (a.type === 'app' && b.type !== 'app') return -1;
        if (a.type !== 'app' && b.type === 'app') return 1;
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
      const maxRows = 6;
      const arranged = sorted.map((item, idx) => ({
        ...item,
        gridCol: Math.floor(idx / maxRows),
        gridRow: idx % maxRows,
      }));
      const next = [...others, ...arranged];
      filesRef.current = next;
      return next;
    });
  }, []);

  const handlePlayAndAddSpotifySearch = useCallback(
    async (query: string): Promise<string> => {
      try {
        const found = await searchRealSongs(query);
        const first = found[0];
        if (first) {
          setSpotifyTracks((prev) => {
            const exists = prev.some((t) => t.id === first.id || (t.title === first.title && t.artist === first.artist));
            return exists ? prev : [first, ...prev];
          });
          launchApp('spotify');
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent('win11-media-command', {
                detail: { appId: 'spotify', action: 'playTrack', trackId: first.id },
              })
            );
          }, 300);
          return `${first.title} - ${first.artist}`;
        }
      } catch {
        // fallback below
      }
      launchApp('spotify');
      return query;
    },
    [launchApp]
  );

  // Import real external files dropped or chosen on Desktop
  const handleImportExternalFilesToDesktop = useCallback(
    async (fileList: FileList | File[], dropCol?: number, dropRow?: number) => {
      const arr = Array.from(fileList);
      if (arr.length === 0) return;

      let lastCreated: FileSystemItem | null = null;
      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        const parsed = await parseRealExternalFile(file);
        const extra = { ...parsed.extra };
        if (parsed.type === 'exe') {
          const matchedEngine = matchCatalogAppForFile({
            id: 'temp',
            name: parsed.name,
            type: 'exe',
            parentId: 'desktop',
            size: 0,
            createdAt: '',
          });
          if (matchedEngine) {
            extra.content = matchedEngine.htmlContent;
            extra.customIconUrl = matchedEngine.iconSvgDataUrl;
          }
        }
        if (dropCol !== undefined && dropRow !== undefined && i === 0) {
          extra.gridCol = Math.max(0, dropCol);
          extra.gridRow = Math.max(0, dropRow);
        }
        const created = createFileSystemItem(
          parsed.name,
          parsed.type,
          'desktop',
          extra
        );
        lastCreated = created;
      }

      if (arr.length === 1 && lastCreated) {
        openFileSystemItem(lastCreated);
      }
    },
    [createFileSystemItem, openFileSystemItem]
  );

  // Global keyboard detector + shortcuts on Desktop (Preview Mode on 0 or F1, Lock screen Space/Enter, Alt+Shift language switch, Ctrl+C/X/V, F2, Delete, Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 1. Live Physical Keyboard & Language Detector
      const isArabicChar = /[\u0600-\u06FF]/.test(e.key);
      const isLatinChar = /^[a-zA-Z]$/.test(e.key);
      let nextLang: 'ARA' | 'ENG' | null = null;

      if ((e.altKey && e.key === 'Shift') || (e.shiftKey && e.key === 'Alt')) {
        setKeyboardLang((prev) => {
          const toggled = prev === 'ENG' ? 'ARA' : 'ENG';
          nextLang = toggled;
          return toggled;
        });
      } else if (isArabicChar) {
        nextLang = 'ARA';
        setKeyboardLang('ARA');
      } else if (isLatinChar) {
        nextLang = 'ENG';
        setKeyboardLang('ENG');
      }

      const locMap: Record<number, string> = {
        0: 'Standard Key',
        1: 'Left Modifier',
        2: 'Right Modifier',
        3: 'Numpad Key (Full 104-Key Keyboard)',
      };

      const now = Date.now();
      keyPressTimestampsRef.current = [
        ...keyPressTimestampsRef.current.filter((t) => now - t < 60000),
        now,
      ];
      const calculatedWpm = Math.round(keyPressTimestampsRef.current.length / 5);
      const displayKey = e.key === ' ' ? 'Space' : e.key;
      const displayCode = e.code || e.key;

      setKeyboardInfo((prev) => {
        const resolvedLang = nextLang || prev.language;
        const resolvedHardware =
          e.location === 3
            ? 'Full-Size 104-Key Keyboard with Numpad (ANSI/ISO)'
            : prev.keyboardHardware;
        return {
          key: displayKey,
          lastKey: displayKey,
          code: displayCode,
          lastCode: displayCode,
          language: resolvedLang,
          detectedScript:
            resolvedLang === 'ARA'
              ? 'العربية (Arabic 101)'
              : 'English (US) QWERTY',
          physicalLayout: resolvedHardware,
          capsLock: e.getModifierState
            ? e.getModifierState('CapsLock')
            : prev.capsLock,
          numLock: e.getModifierState
            ? e.getModifierState('NumLock')
            : prev.numLock,
          shift: e.shiftKey,
          shiftPressed: e.shiftKey,
          ctrl: e.ctrlKey,
          ctrlPressed: e.ctrlKey,
          alt: e.altKey,
          altPressed: e.altKey,
          locationLabel: locMap[e.location] || 'Standard Key',
          keyboardHardware: resolvedHardware,
          totalKeysPressed: prev.totalKeysPressed + 1,
          wpm: calculatedWpm,
        };
      });

      if (e.code) {
        setActivePressedCodes((prev) =>
          prev.includes(e.code) ? prev : [...prev.slice(-8), e.code]
        );
      }

      if (isSystemLocked) {
        if (lockStage === 'cover' && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          setSignInSelectedAccId(activeAccount.id);
          setLockStage('signin');
        }
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;

      // Shortcut '0' toggles Studio Preview Mode (hides Taskbar, window headers & browser bars while keeping apps running)
      if (
        (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setIsPreviewMode((prev) => !prev);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedDesktopIds.length > 0) {
          setOsClipboard({ ids: selectedDesktopIds, mode: 'copy' });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (selectedDesktopIds.length > 0) {
          setOsClipboard({ ids: selectedDesktopIds, mode: 'cut' });
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (osClipboard) {
          pasteToFolder('desktop');
        }
      } else if (e.key === 'Delete' && selectedDesktopIds.length > 0) {
        deleteFileSystemItems(selectedDesktopIds);
      } else if (e.key === 'F2' && selectedDesktopIds.length === 1) {
        const item = filesRef.current.find((f) => f.id === selectedDesktopIds[0]);
        if (item) {
          setRenamingDesktopId(item.id);
          setRenameDesktopValue(item.name);
        }
      } else if (e.key === 'Enter' && selectedDesktopIds.length === 1) {
        const item = filesRef.current.find((f) => f.id === selectedDesktopIds[0]);
        if (item) openFileSystemItem(item);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code) {
        setActivePressedCodes((prev) => prev.filter((c) => c !== e.code));
      }
      setKeyboardInfo((prev) => ({
        ...prev,
        shift: e.shiftKey,
        shiftPressed: e.shiftKey,
        ctrl: e.ctrlKey,
        ctrlPressed: e.ctrlKey,
        alt: e.altKey,
        altPressed: e.altKey,
      }));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    isSystemLocked,
    lockStage,
    activeAccount.id,
    selectedDesktopIds,
    osClipboard,
    pasteToFolder,
    deleteFileSystemItems,
    openFileSystemItem,
  ]);

  // Smooth 60fps Window Dragging, 8-Direction Window Resizing & Desktop Marquee Selection
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (resizingWinRef.current) {
        const { winId, dir, startX, startY, origX, origY, origW, origH } =
          resizingWinRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const minW = 340;
        const minH = 230;

        setWindows((ws) =>
          ws.map((w) => {
            if (w.id !== winId) return w;
            let newX = origX;
            let newY = origY;
            let newW = origW;
            let newH = origH;

            if (dir.includes('e')) {
              newW = Math.max(minW, Math.min(window.innerWidth - origX, origW + dx));
            }
            if (dir.includes('s')) {
              newH = Math.max(
                minH,
                Math.min(window.innerHeight - 48 - origY, origH + dy)
              );
            }
            if (dir.includes('w')) {
              const possibleW = origW - dx;
              if (possibleW >= minW) {
                newW = possibleW;
                newX = Math.max(0, origX + dx);
              }
            }
            if (dir.includes('n')) {
              const possibleH = origH - dy;
              if (possibleH >= minH) {
                newH = possibleH;
                newY = Math.max(0, origY + dy);
              }
            }

            return {
              ...w,
              isMaximized: false,
              snapPosition: undefined,
              position: { x: newX, y: newY },
              size: { width: newW, height: newH },
            };
          })
        );
        return;
      }

      if (draggingWinRef.current) {
        const { winId, startX, startY, origX, origY } = draggingWinRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        setWindows((ws) =>
          ws.map((w) =>
            w.id === winId
              ? {
                  ...w,
                  isMaximized: false,
                  snapPosition: undefined,
                  position: {
                    x: Math.max(0, origX + dx),
                    y: Math.max(
                      0,
                      Math.min(window.innerHeight - 80, origY + dy)
                    ),
                  },
                }
              : w
          )
        );
      }

      if (marqueeRef.current && desktopRef.current) {
        const rect = desktopRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        const updatedBox: MarqueeBox = {
          ...marqueeRef.current,
          currentX,
          currentY,
        };
        marqueeRef.current = updatedBox;
        setMarquee(updatedBox);

        const minX = Math.min(updatedBox.startX, currentX);
        const maxX = Math.max(updatedBox.startX, currentX);
        const minY = Math.min(updatedBox.startY, currentY);
        const maxY = Math.max(updatedBox.startY, currentY);

        const currentDesktopItems = filesRef.current.filter(
          (f) => f.parentId === 'desktop'
        );
        const hits = currentDesktopItems
          .filter((item) => {
            const ix = GRID_PADDING_X + (item.gridCol ?? 0) * GRID_CELL_W;
            const iy = GRID_PADDING_Y + (item.gridRow ?? 0) * GRID_CELL_H;
            const iw = 80;
            const ih = 90;
            return ix < maxX && ix + iw > minX && iy < maxY && iy + ih > minY;
          })
          .map((i) => i.id);
        setSelectedDesktopIds(hits);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (resizingWinRef.current) {
        resizingWinRef.current = null;
        setIsWindowInteracting(false);
      }
      if (draggingWinRef.current) {
        const { winId } = draggingWinRef.current;
        // Edge-drag automatic Split Screen Snap or Top Maximize
        if (e.clientY <= 6) {
          setWindows((ws) =>
            ws.map((w) =>
              w.id === winId ? { ...w, isMaximized: true, snapPosition: undefined } : w
            )
          );
        } else if (e.clientX <= 10) {
          setWindows((ws) =>
            ws.map((w) =>
              w.id === winId ? { ...w, isMaximized: false, snapPosition: 'left' } : w
            )
          );
        } else if (e.clientX >= window.innerWidth - 10) {
          setWindows((ws) =>
            ws.map((w) =>
              w.id === winId ? { ...w, isMaximized: false, snapPosition: 'right' } : w
            )
          );
        }
        draggingWinRef.current = null;
        setIsWindowInteracting(false);
      }
      if (marqueeRef.current) {
        marqueeRef.current = null;
        setMarquee(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const currentWallpaper =
    WALLPAPERS.find((w) => w.id === settings.wallpaperId) || WALLPAPERS[0];

  const isLightMode = settings.theme === 'light';

  // ============================================================================
  // WINDOWS 11 TASKBAR: PINNED APPS, ACTIVE APPS, HOVER PREVIEW, JUMP LISTS & DRAG-AND-DROP
  // ============================================================================
  const defaultPinnedTaskbarApps = useMemo(
    () =>
      APP_DEFINITIONS.filter((a) => a.pinnedToTaskbar).map((a) => a.id),
    []
  );

  const pinnedTaskbarApps: AppId[] = useMemo(() => {
    if (
      Array.isArray(settings.pinnedTaskbarApps) &&
      settings.pinnedTaskbarApps.length > 0
    ) {
      return settings.pinnedTaskbarApps;
    }
    return defaultPinnedTaskbarApps;
  }, [settings.pinnedTaskbarApps, defaultPinnedTaskbarApps]);

  // Active (running) apps that are NOT pinned appear automatically and disappear when closed
  const activeUnpinnedApps: AppId[] = useMemo(() => {
    const runningIds = Array.from(
      new Set(windows.filter((w) => w.isOpen).map((w) => w.appId))
    );
    return runningIds.filter((id) => !pinnedTaskbarApps.includes(id));
  }, [windows, pinnedTaskbarApps]);

  const taskbarAppIds: AppId[] = useMemo(
    () => [...pinnedTaskbarApps, ...activeUnpinnedApps],
    [pinnedTaskbarApps, activeUnpinnedApps]
  );

  // Auto-scroll Mini Copilot Quick Chat Flyout when new messages arrive
  useEffect(() => {
    if (isCopilotFlyoutOpen && miniChatScrollRef.current) {
      miniChatScrollRef.current.scrollTop = miniChatScrollRef.current.scrollHeight;
    }
  }, [miniChatMessages, isMiniChatLoading, isCopilotFlyoutOpen]);

  const handleCancelMiniCopilot = useCallback(() => {
    if (miniChatAbortRef.current) {
      miniChatAbortRef.current.abort();
      miniChatAbortRef.current = null;
    }
    setIsMiniChatLoading(false);
    setMiniChatMessages((prev) => [
      ...prev,
      {
        id: `mc-cancel-${Date.now()}`,
        role: 'assistant',
        text: 'تم إلغاء الرد بناءً على طلبك.',
      },
    ]);
  }, []);

  const handleSendMiniCopilot = useCallback(
    async (customPrompt?: string) => {
      const text = (customPrompt ?? miniChatInput).trim();
      if (!text || isMiniChatLoading) return;

      const controller = new AbortController();
      miniChatAbortRef.current = controller;

      const userMsg = {
        id: `mc-u-${Date.now()}`,
        role: 'user' as const,
        text,
      };
      const updatedHistory = [...miniChatMessages, userMsg];
      setMiniChatMessages(updatedHistory);
      if (!customPrompt) setMiniChatInput('');
      setIsMiniChatLoading(true);

      try {
        const res = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            prompt: text,
            osState: {
              theme: settings.theme,
              taskbarStyle: settings.taskbarStyle || 'default',
              taskbarAlignment: settings.taskbarAlignment || 'center',
              volume: settings.volume,
              brightness: settings.brightness,
              desktopFiles: files
                .filter((f) => f.parentId === 'desktop')
                .map((f) => ({ id: f.id, name: f.name, type: f.type })),
            },
            chatHistory: updatedHistory.slice(-12).map((m) => ({
              role: m.role,
              text: m.text,
            })),
          }),
        });
        const data = await res.json();
        const badges: string[] = [];

        if (Array.isArray(data?.actions)) {
          for (const act of data.actions) {
            const rawAction = String(act.actionType || act.type || '')
              .replace(/([a-z])([A-Z])/g, '$1_$2')
              .toLowerCase();
            if (
              rawAction === 'open_app' ||
              rawAction === 'launch_app' ||
              rawAction === 'open_settings'
            ) {
              const targetId =
                rawAction === 'open_settings'
                  ? 'settings'
                  : (act.appId as AppId);
              if (targetId) {
                launchApp(targetId);
                badges.push(`فتح ${targetId}`);
              }
            } else if (rawAction === 'close_app' && act.appId) {
              setWindows((ws) => ws.filter((w) => w.appId !== act.appId));
              badges.push(`إغلاق ${act.appId}`);
            } else if (rawAction === 'close_all_windows') {
              setWindows([]);
              badges.push('إغلاق جميع النوافذ');
            } else if (rawAction === 'minimize_window') {
              const win = windows.find((w) => (act.appId ? w.appId === act.appId : !w.isMinimized));
              if (win) {
                setWindows((ws) =>
                  ws.map((w) => (w.id === win.id ? { ...w, isMinimized: true } : w))
                );
                badges.push(`تصغير ${win.title}`);
              }
            } else if (rawAction === 'maximize_window') {
              const win = windows.find((w) => (act.appId ? w.appId === act.appId : true));
              if (win) {
                setWindows((ws) =>
                  ws.map((w) =>
                    w.id === win.id
                      ? { ...w, isMaximized: !w.isMaximized, snapPosition: undefined }
                      : w
                  )
                );
                badges.push(`تكبير ${win.title}`);
              }
            } else if (rawAction === 'update_settings') {
              if (typeof act.wifiEnabled === 'boolean') setWifiEnabled(act.wifiEnabled);
              if (typeof act.bluetoothEnabled === 'boolean') setBtEnabled(act.bluetoothEnabled);
              if (typeof act.nightLight === 'boolean') setNightLight(act.nightLight);
              if (typeof act.airplaneMode === 'boolean' && act.airplaneMode) {
                setWifiEnabled(false);
                setBtEnabled(false);
              }
              setSettings((prev) => ({
                ...prev,
                ...(act.theme ? { theme: act.theme } : {}),
                ...(act.taskbarStyle ? { taskbarStyle: act.taskbarStyle } : {}),
                ...(act.taskbarAlignment
                  ? { taskbarAlignment: act.taskbarAlignment }
                  : {}),
                ...(typeof act.volume === 'number' ? { volume: act.volume, isMuted: act.volume === 0 } : {}),
                ...(typeof act.brightness === 'number'
                  ? { brightness: act.brightness }
                  : {}),
                ...(typeof act.wifiEnabled === 'boolean' ? { wifiEnabled: act.wifiEnabled } : {}),
                ...(typeof act.bluetoothEnabled === 'boolean' ? { bluetoothEnabled: act.bluetoothEnabled } : {}),
                ...(typeof act.nightLight === 'boolean' ? { nightLight: act.nightLight } : {}),
                ...(typeof act.airplaneMode === 'boolean' ? { airplaneMode: act.airplaneMode } : {}),
                ...(typeof act.batterySaver === 'boolean' ? { batterySaver: act.batterySaver } : {}),
                ...(typeof act.desktopIconsVisible === 'boolean' ? { desktopIconsVisible: act.desktopIconsVisible } : {}),
              }));
              badges.push('تحديث إعدادات النظام');
            } else if (
              (rawAction === 'create_file' ||
                rawAction === 'create_app' ||
                rawAction === 'create_game' ||
                rawAction === 'create_website' ||
                rawAction === 'build_app') &&
              (act.fileName || act.targetName)
            ) {
              const name = act.fileName || act.targetName || 'App.html';
              const targetParent =
                act.parentId ||
                settings.copilotConfig?.outputDirectory ||
                'desktop';
              const created = createFileSystemItem(
                name,
                act.fileType || 'html',
                targetParent,
                { content: act.content || '' }
              );
              openFileSystemItem(created);
              badges.push(`إنشاء وتشغيل ${name}`);
            } else if (
              rawAction === 'play_spotify_search' ||
              rawAction === 'play_spotify_track'
            ) {
              const query = String(act.query || act.targetName || text).trim();
              if (query) {
                try {
                  const found = await searchRealSongs(query);
                  const trackToPlay = found[0];
                  if (trackToPlay) {
                    setSpotifyTracks((prev) => {
                      const exists = prev.some((t) => t.id === trackToPlay.id || t.title === trackToPlay.title);
                      return exists ? prev : [trackToPlay, ...prev];
                    });
                    launchApp('spotify');
                    setTimeout(() => {
                      window.dispatchEvent(
                        new CustomEvent('win11-media-command', {
                          detail: {
                            appId: 'spotify',
                            action: 'playTrack',
                            trackId: trackToPlay.id,
                          },
                        })
                      );
                    }, 300);
                    badges.push(`تشغيل: ${trackToPlay.title} (${trackToPlay.artist})`);
                  }
                } catch {
                  launchApp('spotify');
                }
              }
            } else if (rawAction === 'create_spotify_playlist') {
              const plTitle = String(act.title || act.targetName || 'قائمة Copilot الذكية').trim();
              const plDesc = String(act.description || 'قائمة تم إنشاؤها عبر Copilot AI للأغاني الحقيقية').trim();
              const trackQueries: string[] = Array.isArray(act.tracks) && act.tracks.length > 0
                ? act.tracks
                : [text];

              const resolvedTracks: SpotifyTrack[] = [];
              for (const tQ of trackQueries.slice(0, 6)) {
                try {
                  const res = await searchRealSongs(tQ);
                  if (res[0]) resolvedTracks.push(res[0]);
                } catch {
                  // continue
                }
              }

              if (resolvedTracks.length > 0) {
                setSpotifyTracks((prev) => {
                  const next = [...prev];
                  for (const rt of resolvedTracks) {
                    if (!next.some((t) => t.id === rt.id)) next.unshift(rt);
                  }
                  return next;
                });

                const newPl: CustomPlaylist = {
                  id: `pl-copilot-${Date.now()}`,
                  title: plTitle,
                  description: plDesc,
                  coverGradient: 'from-emerald-600 via-teal-800 to-zinc-950',
                  coverEmoji: '✨',
                  trackIds: resolvedTracks.map((t) => t.id),
                  createdAt: new Date().toISOString().slice(0, 10),
                };

                const currentPls = loadSavedPlaylists();
                const updatedPls = [newPl, ...currentPls.filter((p) => p.id !== newPl.id)];
                savePlaylists(updatedPls);

                badges.push(`إنشاء قائمة: ${plTitle} (${resolvedTracks.length} تراك)`);
                launchApp('spotify');
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent('win11-media-command', {
                      detail: {
                        appId: 'spotify',
                        action: 'playTrack',
                        trackId: resolvedTracks[0].id,
                      },
                    })
                  );
                }, 350);
              }
            } else if (rawAction === 'add_to_spotify_playlist') {
              const songQuery = String(act.query || act.targetName || '').trim();
              const targetTitle = String(act.playlistTitle || '').trim();
              if (songQuery) {
                const found = await searchRealSongs(songQuery);
                const trackToAdd = found[0];
                if (trackToAdd) {
                  setSpotifyTracks((prev) => {
                    const exists = prev.some((t) => t.id === trackToAdd.id);
                    return exists ? prev : [trackToAdd, ...prev];
                  });
                  const currentPls = loadSavedPlaylists();
                  const targetPl = currentPls.find(
                    (p) => targetTitle && p.title.toLowerCase().includes(targetTitle.toLowerCase())
                  ) || currentPls[0];
                  if (targetPl && !targetPl.trackIds.includes(trackToAdd.id)) {
                    targetPl.trackIds.push(trackToAdd.id);
                    savePlaylists(currentPls);
                    badges.push(`إضافة ${trackToAdd.title} إلى ${targetPl.title}`);
                  }
                }
              }
            }
          }
        }

        // Direct Natural Language Intent Bridge (Ensures instant execution for Arabic/English queries)
        const isMusicPlayIntent =
          /(شغل|سمعني|play|شغلي|تشغيل|شغل اغنية|شغل أغنية)\s*(.+)/i.test(text) &&
          !badges.some((b) => b.includes('تشغيل:') || b.includes('إنشاء قائمة:'));
        const isPlaylistIntent =
          /(اعمل|انشئ|صمم|سوي|سويلي|create|make)\s*(playlist|بلاي ليست|قائمة تشغيل|قائمه تشغيل|مكس|mix)\s*(.*)/i.test(text) &&
          !badges.some((b) => b.includes('إنشاء قائمة:'));

        if (isMusicPlayIntent) {
          const match = text.match(/(شغل|سمعني|play|شغلي|تشغيل|شغل اغنية|شغل أغنية)\s*(.*)/i);
          const rawQ = (match?.[2] || text).replace(/(اغنية|أغنية|تراك|song|track)/gi, '').trim() || 'Amr Diab';
          try {
            const found = await searchRealSongs(rawQ);
            const chosen = found[0];
            if (chosen) {
              setSpotifyTracks((prev) => {
                const exists = prev.some((t) => t.id === chosen.id || t.title === chosen.title);
                return exists ? prev : [chosen, ...prev];
              });
              launchApp('spotify', { isMinimized: true, keepFlyoutOpen: true });
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('win11-media-command', {
                    detail: {
                      appId: 'spotify',
                      action: 'playTrack',
                      trackId: chosen.id,
                    },
                  })
                );
              }, 300);
              badges.push(`تشغيل: ${chosen.title} (${chosen.artist})`);
            }
          } catch {
            // ignore
          }
        } else if (isPlaylistIntent) {
          const match = text.match(/(اعمل|انشئ|صمم|سوي|سويلي|create|make)\s*(playlist|بلاي ليست|قائمة تشغيل|قائمه تشغيل|مكس|mix)\s*(.*)/i);
          const rawSubject = (match?.[3] || text).replace(/(لـ|ل|حق|for|about)/gi, '').trim() || 'أغاني مفضلة';
          try {
            const found = await searchRealSongs(rawSubject);
            const sampleTracks = found.slice(0, 6);
            if (sampleTracks.length > 0) {
              setSpotifyTracks((prev) => {
                const next = [...prev];
                for (const st of sampleTracks) {
                  if (!next.some((t) => t.id === st.id)) next.unshift(st);
                }
                return next;
              });

              const newPl: CustomPlaylist = {
                id: `pl-ai-${Date.now()}`,
                title: `قائمة: ${rawSubject}`,
                description: `قائمة مخصصة تم إنشاؤها عبر Copilot لأفضل الأغاني الحقيقية.`,
                coverGradient: 'from-purple-700 via-indigo-900 to-zinc-950',
                coverEmoji: '🔥',
                trackIds: sampleTracks.map((t) => t.id),
                createdAt: new Date().toISOString().slice(0, 10),
              };

              const currentPls = loadSavedPlaylists();
              savePlaylists([newPl, ...currentPls]);
              window.dispatchEvent(new CustomEvent('win11-spotify-playlists-updated'));
              badges.push(`إنشاء قائمة تشغيل: ${newPl.title}`);
              launchApp('spotify', { isMinimized: true, keepFlyoutOpen: true });
              setTimeout(() => {
                window.dispatchEvent(
                  new CustomEvent('win11-media-command', {
                    detail: {
                      appId: 'spotify',
                      action: 'playTrack',
                      trackId: sampleTracks[0].id,
                    },
                  })
                );
              }, 350);
            }
          } catch {
            // ignore
          }
        } else if (
          /(ضيف|حط|نزل|اضف|حطلي|add)\s*(اغنية|أغنية|تراك|song|track)?\s*(.+)/i.test(text) &&
          !badges.some((b) => b.includes('تشغيل:') || b.includes('إنشاء قائمة:') || b.includes('إضافة'))
        ) {
          const match = text.match(/(ضيف|حط|نزل|اضف|حطلي|add)\s*(اغنية|أغنية|تراك|song|track)?\s*(.+)/i);
          const rawPrompt = (match?.[3] || text).trim();
          let songQuery = rawPrompt;
          let targetPlTitle = '';
          const plSplit = rawPrompt.split(/(?:في قائمة|إلى قائمة|الي قائمة|to playlist|in playlist)\s*/i);
          if (plSplit.length > 1) {
            songQuery = plSplit[0].trim();
            targetPlTitle = plSplit[1].trim();
          }

          try {
            const found = await searchRealSongs(songQuery || 'Amr Diab');
            const trackToAdd = found[0];
            if (trackToAdd) {
              setSpotifyTracks((prev) => {
                const exists = prev.some((t) => t.id === trackToAdd.id);
                return exists ? prev : [trackToAdd, ...prev];
              });
              const currentPls = loadSavedPlaylists();
              const targetPl = currentPls.find(
                (p) => targetPlTitle && p.title.toLowerCase().includes(targetPlTitle.toLowerCase())
              ) || currentPls[0];

              if (targetPl) {
                if (!targetPl.trackIds.includes(trackToAdd.id)) {
                  targetPl.trackIds.push(trackToAdd.id);
                  savePlaylists(currentPls);
                  window.dispatchEvent(new CustomEvent('win11-spotify-playlists-updated'));
                  badges.push(`إضافة: ${trackToAdd.title} إلى ${targetPl.title}`);
                } else {
                  badges.push(`${trackToAdd.title} موجودة بالفعل في ${targetPl.title}`);
                }
              }
              launchApp('spotify', { isMinimized: true, keepFlyoutOpen: true });
            }
          } catch {
            // ignore
          }
        }

        let generatedImageUrl: string | undefined;
        let generatedImageTitle: string | undefined;
        let generatedPreviousPrompt: string | undefined;

        if (
          /(صورة|صوره|خلفية|خلفيه|لوجو|شعار|ارسم|صمم صورة|اعمل صورة|توليد صورة|عدل الصورة|عدل هذه الصورة|image|wallpaper|logo)/i.test(
            text
          )
        ) {
          try {
            const lastImgMsg = [...miniChatMessages]
              .reverse()
              .find((m) => Boolean(m.imageUrl));
            const isEditing =
              Boolean(lastImgMsg) &&
              /(عدل|تعديل|غير|ضف|ضيف|أضف|خلي|اجعل|edit|modify)/i.test(text);
            const combinedPrompt =
              isEditing && lastImgMsg
                ? `${lastImgMsg.previousPrompt || lastImgMsg.imageTitle || ''} — التعديل المطلوب: ${text}`
                : text;
            const mediaRes = await fetch('/api/ai/generate-media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                prompt: combinedPrompt,
                previousPrompt:
                  isEditing && lastImgMsg
                    ? lastImgMsg.previousPrompt || lastImgMsg.imageTitle
                    : undefined,
              }),
            });
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              if (mediaData?.imageUrl) {
                generatedImageUrl = mediaData.imageUrl;
                generatedImageTitle = mediaData.title || text.slice(0, 32);
                generatedPreviousPrompt = combinedPrompt;
                badges.push(isEditing ? `تعديل صورة: ${generatedImageTitle}` : `توليد صورة: ${generatedImageTitle}`);
                if (/(عينها خلفية|خليها خلفية|كخلفية|set as wallpaper)/i.test(text)) {
                  setSettings((prev) => ({
                    ...prev,
                    customWallpaperUrl: mediaData.imageUrl,
                    liveWallpaperId: 'none',
                  }));
                  badges.push('تعيين كخلفية لسطح المكتب');
                }
              }
            }
          } catch {
            // ignore
          }
        }

        const replyText =
          data?.reply || 'تم تنفيذ طلبك بنجاح! هل تريد شيئاً آخر؟';

        setMiniChatMessages((prev) => [
          ...prev,
          {
            id: `mc-a-${Date.now()}`,
            role: 'assistant',
            text: replyText,
            badge: badges.length > 0 ? badges.join(' · ') : undefined,
            imageUrl: generatedImageUrl,
            imageTitle: generatedImageTitle,
            previousPrompt: generatedPreviousPrompt,
          },
        ]);

        pushNotification(
          badges.length > 0
            ? `Copilot السريع — تم تنفيذ الأمر`
            : 'Copilot السريع — اكتمل الرد',
          badges.length > 0
            ? `${badges.join(' · ')} — ${replyText.slice(0, 90)}`
            : replyText.slice(0, 100),
          'copilot'
        );
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          return;
        }
        setMiniChatMessages((prev) => [
          ...prev,
          {
            id: `mc-e-${Date.now()}`,
            role: 'assistant',
            text: 'عذراً، حدث خطأ في الاتصال السريع. حاول مرة أخرى.',
          },
        ]);
      } finally {
        if (miniChatAbortRef.current === controller) {
          miniChatAbortRef.current = null;
        }
        setIsMiniChatLoading(false);
      }
    },
    [
      miniChatInput,
      isMiniChatLoading,
      miniChatMessages,
      settings,
      files,
      windows,
      launchApp,
      createFileSystemItem,
      openFileSystemItem,
      pushNotification,
    ]
  );

  const isAppPinnedToTaskbar = useCallback(
    (appId: AppId) => pinnedTaskbarApps.includes(appId),
    [pinnedTaskbarApps]
  );

  const togglePinAppToTaskbar = useCallback(
    (appId: AppId) => {
      setSettings((prev) => {
        const current =
          Array.isArray(prev.pinnedTaskbarApps) &&
          prev.pinnedTaskbarApps.length > 0
            ? prev.pinnedTaskbarApps
            : defaultPinnedTaskbarApps;
        const exists = current.includes(appId);
        const nextPinned = exists
          ? current.filter((id) => id !== appId)
          : [...current, appId];
        return {
          ...prev,
          pinnedTaskbarApps: nextPinned,
        };
      });
    },
    [defaultPinnedTaskbarApps]
  );

  // Taskbar Hover Preview, Jump List (Right-Click), and Drag-and-Drop Reorder State
  const [hoveredTaskbarApp, setHoveredTaskbarApp] = useState<{
    appId: AppId;
    rectLeft: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const [taskbarJumpList, setTaskbarJumpList] = useState<{
    appId: AppId;
    x: number;
    y: number;
  } | null>(null);

  const [taskbarEmptyMenu, setTaskbarEmptyMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [draggedTaskbarAppId, setDraggedTaskbarAppId] = useState<AppId | null>(
    null
  );
  const [dragOverTaskbarAppId, setDragOverTaskbarAppId] =
    useState<AppId | null>(null);

  // Live Media Status for Taskbar Hover Preview (Spotify & Media Player)
  const [liveMediaState, setLiveMediaState] = useState<
    Record<
      string,
      {
        isPlaying: boolean;
        title: string;
        artist: string;
        coverUrl: string;
        currentTime: number;
        duration: number;
      }
    >
  >({
    spotify: {
      isPlaying: false,
      title: spotifyTracks[0]?.title || 'Blinding Lights (Synth)',
      artist: spotifyTracks[0]?.artist || 'The Weeknd',
      coverUrl: spotifyTracks[0]?.coverUrl || '',
      currentTime: 0,
      duration: spotifyTracks[0]?.duration || 180,
    },
    mediaplayer: {
      isPlaying: false,
      title: 'Midnight Horizon (Synthwave)',
      artist: 'Windows 11 Audio Lab',
      coverUrl: '',
      currentTime: 0,
      duration: 120,
    },
  });

  useEffect(() => {
    const onMediaStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.appId) return;
      setLiveMediaState((prev) => ({
        ...prev,
        [detail.appId]: {
          isPlaying: Boolean(detail.isPlaying),
          title: detail.title || 'Playing Media',
          artist: detail.artist || 'Windows Media',
          coverUrl: detail.coverUrl || '',
          currentTime: Number(detail.currentTime || 0),
          duration: Number(detail.duration || 120),
        },
      }));
    };
    window.addEventListener('win11-media-status', onMediaStatus);
    return () => window.removeEventListener('win11-media-status', onMediaStatus);
  }, []);

  // Listen for key '0' Studio Preview toggle & safe link navigation forwarded from embedded iframes
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'WIN11_TOGGLE_PREVIEW_ZERO') {
        setIsPreviewMode((prev) => !prev);
      } else if (e.data.type === 'WIN11_OPEN_EXTERNAL_URL' && e.data.url) {
        try {
          window.open(e.data.url, '_blank', 'noopener,noreferrer');
        } catch (_) {}
      } else if (e.data.type === 'WIN11_OPEN_RELATIVE_FILE' && e.data.fileName) {
        const cleanName = String(e.data.fileName).replace(/^[./]+/, '').toLowerCase();
        const found = filesRef.current.find(
          (f) => f.name.toLowerCase() === cleanName && f.parentId !== 'recyclebin'
        );
        if (found) {
          openFileSystemItem(found);
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [openFileSystemItem]);

  const sendTaskbarMediaCommand = useCallback(
    (
      appId: 'spotify' | 'mediaplayer',
      action: 'toggle' | 'next' | 'prev' | 'play' | 'pause' | 'seek' | 'volume' | 'toggleLike',
      extra?: { time?: number; volume?: number; trackId?: string }
    ) => {
      if ((action === 'toggle' || action === 'play') && appId === 'spotify') {
        const isSpotifyRunning = windows.some((w) => w.appId === 'spotify' && w.isOpen);
        if (!isSpotifyRunning) {
          launchApp('spotify', { isMinimized: true, keepFlyoutOpen: true });
        }
      }
      window.dispatchEvent(
        new CustomEvent('win11-media-command', {
          detail: { appId, action, ...(extra || {}) },
        })
      );
    },
    [windows, launchApp]
  );

  const reorderTaskbarApps = useCallback(
    (sourceAppId: AppId, targetAppId: AppId) => {
      if (sourceAppId === targetAppId) return;
      setSettings((prev) => {
        const currentPinned =
          Array.isArray(prev.pinnedTaskbarApps) &&
          prev.pinnedTaskbarApps.length > 0
            ? [...prev.pinnedTaskbarApps]
            : [...defaultPinnedTaskbarApps];

        // Ensure both are in the orderable list (if dragging an active unpinned app into pinned area, pin it in that spot)
        if (!currentPinned.includes(sourceAppId)) {
          currentPinned.push(sourceAppId);
        }
        if (!currentPinned.includes(targetAppId)) {
          currentPinned.push(targetAppId);
        }

        const fromIdx = currentPinned.indexOf(sourceAppId);
        const toIdx = currentPinned.indexOf(targetAppId);
        if (fromIdx === -1 || toIdx === -1) return prev;

        const updated = [...currentPinned];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);

        return {
          ...prev,
          pinnedTaskbarApps: updated,
        };
      });
    },
    [defaultPinnedTaskbarApps]
  );

  // Recent files helper for Taskbar Jump Lists
  const getJumpListRecentFiles = useCallback(
    (appId: AppId): FileSystemItem[] => {
      const validFiles = dedupeFilesList(files).filter((f) => f.parentId !== 'recyclebin');
      switch (appId) {
        case 'edge':
          return validFiles
            .filter((f) => f.type === 'html' || f.type === 'exe')
            .slice(-5)
            .reverse();
        case 'vscode':
          return validFiles
            .filter(
              (f) => f.type === 'code' || f.type === 'html' || f.type === 'folder'
            )
            .slice(-5)
            .reverse();
        case 'notepad':
          return validFiles
            .filter((f) => f.type === 'text' || f.type === 'code')
            .slice(-5)
            .reverse();
        case 'photos':
          return validFiles
            .filter((f) => f.type === 'image')
            .slice(-5)
            .reverse();
        case 'mediaplayer':
        case 'spotify':
          return validFiles
            .filter((f) => f.type === 'audio' || f.type === 'video')
            .slice(-5)
            .reverse();
        case 'pdfreader':
          return validFiles
            .filter((f) => f.type === 'pdf')
            .slice(-5)
            .reverse();
        case 'thispc':
          return validFiles
            .filter((f) => f.type === 'folder')
            .slice(0, 5);
        default:
          return [];
      }
    },
    [files]
  );

  const backgroundStyle = settings.customWallpaperUrl
    ? `url("${settings.customWallpaperUrl}")`
    : settings.customWallpaperCss
    ? settings.customWallpaperCss
    : `url("${currentWallpaper.url}")`;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none font-sans"
      style={{
        fontFamily:
          '"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, sans-serif',
        filter: `brightness(${settings.brightness}%)${
          nightLight ? ' sepia(18%) saturate(90%)' : ''
        }`,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Hidden input for importing real computer files from Desktop Context Menu */}
      <input
        ref={desktopFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImportExternalFilesToDesktop(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Official Windows 11 Wallpaper Layer */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center transition-all duration-500"
        style={{
          backgroundImage: backgroundStyle,
        }}
      />

      {/* GPU-Accelerated Live Wallpaper Engine (Pauses automatically when a window is maximized or PC is off) */}
      <LiveWallpaperCanvas
        liveWallpaperId={settings.liveWallpaperId}
        accentColor={settings.accentColor}
        isPaused={
          powerState !== 'on' ||
          (!isSystemLocked &&
            windows.some((w) => w.isOpen && !w.isMinimized && w.isMaximized))
        }
      />

      {/* ====================================================================
       * 0A. AUTHENTIC WINDOWS 11 POWER STATES (SHUT DOWN, RESTART, BOOT, SLEEP)
       * ================================================================== */}
      {powerState === 'sleeping' && (
        <div
          onClick={() => {
            setPowerState('on');
            setSignInSelectedAccId(activeAccount.id);
            setLockStage('cover');
            setIsSystemLocked(true);
            playSoundIfEnabled('startup');
          }}
          className="fixed inset-0 z-[999999] bg-black flex flex-col items-center justify-center gap-4 cursor-pointer text-neutral-400 select-none"
        >
          <Moon size={32} className="text-[#60cdff] opacity-80 animate-pulse" />
          <div className="text-sm font-medium text-white/80">
            Windows 11 is in Low-Power Sleep Mode
          </div>
          <div className="text-xs text-neutral-500">
            All your open apps and files are saved — Click anywhere to wake up PC
          </div>
        </div>
      )}

      {(powerState === 'shutting_down' || powerState === 'restarting') && (
        <div className="fixed inset-0 z-[999999] bg-black flex flex-col items-center justify-center gap-8 text-white select-none">
          {/* Authentic Windows 11 24H2 Fluent Bezier Circular Progress Ring */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-14 h-14 animate-spin" viewBox="0 0 50 50">
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="4"
              />
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="#60cdff"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="80 120"
              />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <div className="text-[22px] font-light tracking-wide text-white">
              {powerStatusText}
            </div>
            <div className="text-xs text-[#60cdff] font-mono">
              Saving Windows 11 Storage ({powerProgress}% complete)
            </div>
            <div className="text-xs text-white/50 pt-1">
              Please keep your computer on while state is saved
            </div>
          </div>
        </div>
      )}

      {powerState === 'booting' && (
        <div className="fixed inset-0 z-[999999] bg-black flex flex-col items-center justify-between py-[20vh] text-white select-none">
          <div className="flex flex-col items-center gap-5">
            <div className="p-4 rounded-2xl bg-[#0078d4]/10 shadow-[0_0_60px_rgba(0,120,212,0.45)]">
              <WindowsStartIcon size={88} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <svg className="w-9 h-9 animate-spin" viewBox="0 0 50 50">
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="70 130"
              />
            </svg>
            <span className="text-xs text-white/60 tracking-wider">
              Starting Windows 11 Pro (24H2)...
            </span>
          </div>
        </div>
      )}

      {powerState === 'powered_off' && (
        <div className="fixed inset-0 z-[999999] bg-[#040404] flex flex-col items-center justify-center gap-6 text-white select-none">
          <div className="p-5 rounded-full bg-white/[0.03] border border-white/[0.08]">
            <WindowsStartIcon size={54} />
          </div>
          <div className="text-center space-y-1">
            <div className="text-sm font-semibold text-neutral-200">
              System Powered Off Safely
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All files, settings, and VS Code projects are saved in persistent storage</span>
            </div>
          </div>
          <button
            onClick={() => {
              setPowerState('booting');
              setTimeout(() => {
                playSoundIfEnabled('startup');
                setPowerState('on');
                setSignInSelectedAccId(activeAccount.id);
                setLockStage('cover');
                setIsSystemLocked(true);
              }, 2100);
            }}
            className="flex items-center gap-3 px-8 py-3.5 rounded-full bg-[#0078d4] hover:bg-[#106ebe] border border-[#60cdff]/40 text-xs font-semibold text-white shadow-[0_0_40px_rgba(0,120,212,0.5)] transition-all cursor-pointer"
          >
            <Power size={16} />
            <span>Power On Windows 11 Pro</span>
          </button>
        </div>
      )}

      {/* ====================================================================
       * 0B. AUTHENTIC WINDOWS 11 LOCK & MULTI-ACCOUNT SIGN-IN SCREEN
       * ================================================================== */}
      {isSystemLocked && powerState === 'on' && (
        <div
          className="fixed inset-0 z-[999990] overflow-hidden select-none text-white"
          onClick={() => {
            setIsLockPowerMenuOpen(false);
            if (lockStage === 'cover') {
              setSignInSelectedAccId(activeAccount.id);
              setLockStage('signin');
            }
          }}
        >
          {/* Lock Screen Wallpaper with smooth zoom + Gaussian blur on Sign-In */}
          <div
            className={`absolute inset-0 bg-cover bg-center transition-all duration-500 ${
              lockStage === 'signin'
                ? 'scale-105 blur-2xl brightness-[0.48]'
                : 'scale-100 brightness-[0.86]'
            }`}
            style={{ backgroundImage: backgroundStyle }}
          />

          {lockStage === 'cover' ? (
            /* STAGE 1: Authentic Windows 11 Lock Screen Clock & Date */
            <div className="relative z-10 h-full flex flex-col items-center justify-between pt-[13vh] pb-10 px-8">
              {/* Top Clock & Date */}
              <div className="text-center">
                <div
                  className="text-[92px] sm:text-[104px] font-semibold tracking-tight leading-none text-white"
                  style={{ textShadow: '0 4px 24px rgba(0,0,0,0.45)' }}
                >
                  {currentTime
                    .toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                    .replace(/\s?[AP]M/i, '')}
                </div>
                <div
                  className="text-[20px] font-normal text-white/95 mt-3"
                  style={{ textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}
                >
                  {currentTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>

              {/* Subtle Unlock Hint */}
              <div className="text-xs text-white/80 tracking-wide">
                Click or press Space to sign in
              </div>
            </div>
          ) : (
            /* STAGE 2: Authentic Windows 11 Multi-Account Sign-In Screen */
            (() => {
              const selectedAcc =
                accountsList.find((a) => a.id === signInSelectedAccId) ||
                activeAccount;
              const requiredPass =
                selectedAcc.password ??
                (selectedAcc.id === activeAccount.id ? settings.password : undefined);

              return (
                <div
                  className="relative z-10 h-full flex flex-col items-center justify-center px-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!requiredPass || lockPasswordInput === requiredPass) {
                        setSettings((prev) => ({
                          ...prev,
                          activeAccountId: selectedAcc.id,
                          password: selectedAcc.password,
                        }));
                        setIsSystemLocked(false);
                        setLockStage('cover');
                        setLockPasswordInput('');
                        setLockError('');
                        playSoundIfEnabled('unlock');
                        pushNotification(
                          `Welcome back, ${selectedAcc.name}`,
                          `Signed in to ${selectedAcc.email} (${selectedAcc.role}). All saved files restored.`,
                          'settings'
                        );
                      } else {
                        playSoundIfEnabled('error');
                        setLockError('The PIN or password is incorrect. Try again.');
                      }
                    }}
                    className="flex flex-col items-center w-full max-w-[320px]"
                  >
                    {/* Windows 11 Frosted User Avatar Circle */}
                    <div
                      className="w-[112px] h-[112px] rounded-full backdrop-blur-md border-2 border-white/[0.32] flex items-center justify-center shadow-[0_16px_42px_rgba(0,0,0,0.6)] text-4xl font-semibold text-white"
                      style={{ backgroundColor: selectedAcc.avatarColor }}
                    >
                      {selectedAcc.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Selected User Display Name & Role */}
                    <div className="mt-4 text-[23px] font-semibold text-white tracking-tight text-center">
                      {selectedAcc.name}
                    </div>
                    <div className="text-xs text-white/75 mt-0.5">
                      {selectedAcc.email} · {selectedAcc.role}
                    </div>

                    {isSettingPinOnLock ? (
                      <div className="w-full mt-5 p-3.5 rounded-lg bg-black/55 backdrop-blur-xl border border-white/20 space-y-2.5">
                        <div className="text-xs font-semibold text-[#60cdff]">
                          Set or Update PIN / Password for {selectedAcc.name}:
                        </div>
                        <input
                          type="text"
                          autoFocus
                          value={newPinValue}
                          onChange={(e) => setNewPinValue(e.target.value)}
                          placeholder="Leave empty to remove password..."
                          className="w-full px-3 py-1.5 rounded bg-[#141414] border border-white/20 text-xs text-white focus:outline-none focus:border-[#60cdff]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const cleanPin = newPinValue.trim();
                              setSettings((prev) => ({
                                ...prev,
                                password:
                                  selectedAcc.id === prev.activeAccountId
                                    ? cleanPin
                                    : prev.password,
                                accounts: (prev.accounts || []).map((a) =>
                                  a.id === selectedAcc.id
                                    ? { ...a, password: cleanPin || undefined }
                                    : a
                                ),
                              }));
                              setIsSettingPinOnLock(false);
                              setNewPinValue('');
                              setLockError('');
                            }}
                            className="flex-1 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white"
                          >
                            Save PIN
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsSettingPinOnLock(false)}
                            className="px-3 py-1.5 rounded bg-white/10 text-xs text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : requiredPass ? (
                      <div className="w-full mt-5 space-y-2.5">
                        {/* Authentic Windows 11 Password Input with Show/Hide & Right Arrow */}
                        <div className="w-full h-[38px] bg-[#1a1a1a]/90 backdrop-blur-md border border-white/25 border-b-2 border-b-[#60cdff] rounded-[4px] flex items-center overflow-hidden">
                          <input
                            type={showLockPassword ? 'text' : 'password'}
                            autoFocus
                            value={lockPasswordInput}
                            onChange={(e) => setLockPasswordInput(e.target.value)}
                            placeholder="PIN or Password"
                            className="flex-1 bg-transparent px-3 text-xs text-white placeholder-white/60 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowLockPassword((s) => !s)}
                            className="px-2 text-[10px] text-white/60 hover:text-white"
                          >
                            {showLockPassword ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="submit"
                            className="w-9 h-full flex items-center justify-center bg-[#0078d4] hover:bg-[#106ebe] text-white transition-colors"
                            title="Sign in"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>

                        {lockError && (
                          <div className="text-xs text-rose-300 text-center">
                            {lockError}
                          </div>
                        )}

                        <div className="pt-1 flex items-center justify-center gap-4 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setNewPinValue(requiredPass);
                              setIsSettingPinOnLock(true);
                            }}
                            className="text-white/75 hover:text-white underline"
                          >
                            Change / Reset PIN
                          </button>
                          <button
                            type="button"
                            onClick={() => setLockStage('cover')}
                            className="text-white/75 hover:text-white"
                          >
                            Back to Lock Screen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 flex flex-col items-center gap-2.5">
                        <button
                          type="submit"
                          autoFocus
                          className="w-[170px] h-[38px] rounded-[4px] bg-[#0078d4] hover:bg-[#106ebe] border border-[#60cdff]/40 backdrop-blur-md text-xs font-semibold text-white shadow-lg transition-all cursor-pointer"
                        >
                          Sign in
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewPinValue('');
                            setIsSettingPinOnLock(true);
                          }}
                          className="text-[11px] text-white/70 hover:text-white underline"
                        >
                          Sign-in options (Set PIN / Password)
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Authentic Bottom-Left Windows 11 Multi-Account Switcher + Quick Add Account */}
                  <div className="absolute bottom-5 left-6 z-20 flex flex-col gap-1.5 w-64">
                    <div className="flex items-center justify-between px-2 mb-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-white/65">
                        Accounts on this PC ({accountsList.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingAccountOnLock((v) => !v)}
                        className="text-[11px] text-[#60cdff] hover:underline font-medium"
                      >
                        {isAddingAccountOnLock ? 'Cancel' : '+ Add Account'}
                      </button>
                    </div>

                    {isAddingAccountOnLock && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const cleanName = newLockAccName.trim();
                          if (!cleanName) return;
                          const colors = ['#0078d4', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];
                          const newAcc: UserAccount = {
                            id: `acc-${Date.now()}`,
                            name: cleanName,
                            email: `${cleanName.toLowerCase().replace(/\s+/g, '.')}@windows11.local`,
                            role: 'Administrator',
                            password: newLockAccPin.trim() || undefined,
                            avatarColor: colors[accountsList.length % colors.length],
                          };
                          setSettings((prev) => ({
                            ...prev,
                            accounts: [...(prev.accounts || []), newAcc],
                            activeAccountId: newAcc.id,
                          }));
                          setSignInSelectedAccId(newAcc.id);
                          setNewLockAccName('');
                          setNewLockAccPin('');
                          setIsAddingAccountOnLock(false);
                        }}
                        className="p-2.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/20 space-y-2 mb-1"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={newLockAccName}
                          onChange={(e) => setNewLockAccName(e.target.value)}
                          placeholder="New Account Name..."
                          className="w-full px-2.5 py-1 rounded bg-[#141414] border border-white/20 text-xs text-white focus:outline-none"
                        />
                        <input
                          type="password"
                          value={newLockAccPin}
                          onChange={(e) => setNewLockAccPin(e.target.value)}
                          placeholder="Optional PIN / Password..."
                          className="w-full px-2.5 py-1 rounded bg-[#141414] border border-white/20 text-xs text-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="w-full py-1 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white"
                        >
                          Create &amp; Select Account
                        </button>
                      </form>
                    )}

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {accountsList.map((acc) => {
                        const isSel = acc.id === selectedAcc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setSignInSelectedAccId(acc.id);
                              setLockPasswordInput('');
                              setLockError('');
                              setIsSettingPinOnLock(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-left transition-all cursor-pointer ${
                              isSel
                                ? 'bg-white/[0.22] border border-white/[0.35] shadow-lg'
                                : 'bg-black/30 hover:bg-white/[0.12] border border-transparent'
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                              style={{ backgroundColor: acc.avatarColor }}
                            >
                              {acc.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-white truncate">
                                {acc.name}
                              </div>
                              <div className="text-[10px] text-white/70 truncate">
                                {acc.role} {acc.password ? '· PIN Protected' : ''}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* Bottom-Right Windows 11 Lock Screen System Tray (Language, Network, Battery, Power) */}
          <div
            className="absolute bottom-5 right-6 z-20 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() =>
                setKeyboardLang((prev) => (prev === 'ENG' ? 'ARA' : 'ENG'))
              }
              className="px-2.5 py-1.5 rounded-[4px] hover:bg-white/[0.12] text-xs font-medium text-white/90"
            >
              {keyboardLang}
            </button>
            <div className="p-2 rounded-[4px] hover:bg-white/[0.12] text-white/90">
              <Wifi size={16} />
            </div>
            <div className="p-2 rounded-[4px] hover:bg-white/[0.12] text-white/90">
              <BatteryCharging size={17} />
            </div>

            {/* Lock Screen Power Button + Popup Menu */}
            <div className="relative">
              <button
                onClick={() => setIsLockPowerMenuOpen((v) => !v)}
                className="p-2 rounded-[4px] hover:bg-white/[0.12] text-white/90"
                title="Power"
              >
                <Power size={16} />
              </button>

              {isLockPowerMenuOpen && (
                <div className="absolute right-0 bottom-11 w-40 rounded-[8px] bg-[#242424]/95 backdrop-blur-2xl border border-white/[0.14] shadow-2xl p-1.5 text-xs text-white space-y-0.5">
                  <button
                    onClick={triggerSleep}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] hover:bg-white/[0.08] text-left"
                  >
                    <Moon size={14} className="text-neutral-300" />
                    <span>Sleep</span>
                  </button>
                  <button
                    onClick={triggerShutDown}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] hover:bg-white/[0.08] text-left"
                  >
                    <Power size={14} className="text-neutral-300" />
                    <span>Shut down</span>
                  </button>
                  <button
                    onClick={triggerRestart}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] hover:bg-white/[0.08] text-left"
                  >
                    <RefreshCw size={14} className="text-neutral-300" />
                    <span>Restart</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
       * 1. WINDOWS 11 DESKTOP CANVAS (EXPANDS TO 100VH IN PREVIEW MODE)
       * ================================================================== */}
      <div
        ref={desktopRef}
        className={`relative z-[10] w-full ${
          isPreviewMode ||
          settings.taskbarStyle === 'glass-center' ||
          settings.taskbarStyle === 'floating'
            ? 'h-screen'
            : 'h-[calc(100vh-48px)]'
        } overflow-hidden`}
        onMouseDown={(e) => {
          const targetEl = e.target as HTMLElement;
          if (
            (targetEl === desktopRef.current ||
              targetEl.dataset.desktopBg === 'true') &&
            e.button === 0
          ) {
            setIsStartOpen(false);
            setIsTaskViewOpen(false);
            setIsQuickSettingsOpen(false);
            setIsCalendarOpen(false);
            setIsKeyboardFlyoutOpen(false);
            setIsCopilotFlyoutOpen(false);
            setContextMenu(null);
            setTaskbarJumpList(null);
            setTaskbarEmptyMenu(null);
            setHoveredTaskbarApp(null);
            setSelectedDesktopIds([]);
            if (renamingDesktopId) {
              renameFileSystemItem(renamingDesktopId, renameDesktopValue);
              setRenamingDesktopId(null);
            }
            if (desktopRef.current) {
              const rect = desktopRef.current.getBoundingClientRect();
              const startX = e.clientX - rect.left;
              const startY = e.clientY - rect.top;
              const initialBox = {
                startX,
                startY,
                currentX: startX,
                currentY: startY,
              };
              marqueeRef.current = initialBox;
              setMarquee(initialBox);
            }
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          const targetEl = e.target as HTMLElement;
          if (
            targetEl === desktopRef.current ||
            targetEl.dataset.desktopBg === 'true'
          ) {
            setIsStartOpen(false);
            setIsQuickSettingsOpen(false);
            setIsCalendarOpen(false);
            setTaskbarJumpList(null);
            setTaskbarEmptyMenu(null);
            setHoveredTaskbarApp(null);
            setContextMenu({
              x: Math.min(e.clientX, window.innerWidth - 260),
              y: Math.min(e.clientY, window.innerHeight - 380),
            });
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOverFolderId(null);

          const rect = desktopRef.current?.getBoundingClientRect();
          const dropCol = rect
            ? Math.max(
                0,
                Math.floor(
                  (e.clientX - rect.left - GRID_PADDING_X) / GRID_CELL_W
                )
              )
            : 0;
          const dropRow = rect
            ? Math.max(
                0,
                Math.floor(
                  (e.clientY - rect.top - GRID_PADDING_Y) / GRID_CELL_H
                )
              )
            : 0;

          // 1. Real files dragged from the user's computer onto the Desktop
          if (
            e.dataTransfer.files &&
            e.dataTransfer.files.length > 0 &&
            !e.dataTransfer.getData('application/win11-desktop-ids') &&
            !e.dataTransfer.getData('application/win11-item-ids')
          ) {
            await handleImportExternalFilesToDesktop(
              e.dataTransfer.files,
              dropCol,
              dropRow
            );
            return;
          }

          // 2. Repositioning Desktop icons on the grid
          const rawIds =
            e.dataTransfer.getData('application/win11-desktop-ids') ||
            e.dataTransfer.getData('application/win11-item-ids');
          if (!rawIds) return;
          try {
            const draggedIds: string[] = JSON.parse(rawIds);
            setFiles((prev) =>
              prev.map((item) => {
                const idx = draggedIds.indexOf(item.id);
                if (idx === -1) return item;
                return {
                  ...item,
                  parentId: 'desktop',
                  gridCol: dropCol,
                  gridRow: dropRow + idx,
                };
              })
            );
          } catch {
            // ignore
          }
        }}
      >
        {/* Desktop Icons Grid */}
        {desktopItems.map((item) => {
          const isSelected = selectedDesktopIds.includes(item.id);
          const isCut =
            osClipboard?.mode === 'cut' && osClipboard.ids.includes(item.id);
          const isFolderTarget = dragOverFolderId === item.id;
          const left = GRID_PADDING_X + (item.gridCol ?? 0) * GRID_CELL_W;
          const top = GRID_PADDING_Y + (item.gridRow ?? 0) * GRID_CELL_H;

          return (
            <div
              key={item.id}
              draggable={renamingDesktopId !== item.id}
              onDragStart={(e) => {
                const ids = isSelected ? selectedDesktopIds : [item.id];
                if (!isSelected) setSelectedDesktopIds([item.id]);
                e.dataTransfer.setData(
                  'application/win11-desktop-ids',
                  JSON.stringify(ids)
                );
              }}
              onDragOver={(e) => {
                if (item.type === 'folder' || item.appId === 'recyclebin') {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(item.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverFolderId === item.id) setDragOverFolderId(null);
              }}
              onDrop={(e) => {
                if (item.type === 'folder' || item.appId === 'recyclebin') {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(null);
                  const raw = e.dataTransfer.getData(
                    'application/win11-desktop-ids'
                  );
                  if (!raw) return;
                  try {
                    const draggedIds: string[] = JSON.parse(raw);
                    const valid = draggedIds.filter((id) => id !== item.id);
                    if (valid.length === 0) return;
                    if (item.appId === 'recyclebin') {
                      deleteFileSystemItems(valid);
                    } else {
                      moveFileSystemItems(valid, item.id);
                    }
                  } catch {
                    // ignore
                  }
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu(null);
                setIsStartOpen(false);
                if (e.ctrlKey || e.metaKey) {
                  setSelectedDesktopIds((prev) =>
                    prev.includes(item.id)
                      ? prev.filter((id) => id !== item.id)
                      : [...prev, item.id]
                  );
                } else {
                  setSelectedDesktopIds([item.id]);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openFileSystemItem(item);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!selectedDesktopIds.includes(item.id)) {
                  setSelectedDesktopIds([item.id]);
                }
                setContextMenu({
                  x: Math.min(e.clientX, window.innerWidth - 260),
                  y: Math.min(e.clientY, window.innerHeight - 340),
                  targetItemId: item.id,
                });
              }}
              style={{ left, top, width: 80 }}
              className={`absolute z-[15] flex flex-col items-center p-1.5 rounded-[4px] cursor-default transition-colors ${
                isFolderTarget
                  ? 'bg-[#0078d4]/40 ring-1 ring-[#60cdff]'
                  : isSelected
                  ? 'bg-white/[0.18] ring-1 ring-white/[0.28]'
                  : 'hover:bg-white/[0.08]'
              } ${isCut ? 'opacity-50' : ''}`}
            >
              <div className="w-11 h-11 flex items-center justify-center pointer-events-none">
                <FileItemIconRenderer
                  type={item.type}
                  appId={item.appId}
                  name={item.name}
                  exePreset={item.exePreset}
                  customIconUrl={item.customIconUrl}
                  size={42}
                  recycleHasItems={recycleBinHasItems}
                />
              </div>

              {renamingDesktopId === item.id ? (
                <input
                  type="text"
                  autoFocus
                  value={renameDesktopValue}
                  onChange={(e) => setRenameDesktopValue(e.target.value)}
                  onBlur={() => {
                    renameFileSystemItem(item.id, renameDesktopValue);
                    setRenamingDesktopId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      renameFileSystemItem(item.id, renameDesktopValue);
                      setRenamingDesktopId(null);
                    } else if (e.key === 'Escape') {
                      setRenamingDesktopId(null);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 w-full bg-[#191919] text-white text-[11px] text-center px-1 py-0.5 rounded border border-[#60cdff] focus:outline-none"
                />
              ) : (
                <span
                  className="mt-1 text-[11.5px] leading-[14px] text-white text-center line-clamp-2 break-words w-full pointer-events-none"
                  style={{
                    textShadow:
                      '0 1px 3px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {item.name}
                </span>
              )}
            </div>
          );
        })}

        {/* Windows 11 Translucent Blue Selection Marquee */}
        {marquee && (
          <div
            className="absolute pointer-events-none bg-[#0078d4]/25 border border-[#60cdff] z-[70]"
            style={{
              left: Math.min(marquee.startX, marquee.currentX),
              top: Math.min(marquee.startY, marquee.currentY),
              width: Math.abs(marquee.currentX - marquee.startX),
              height: Math.abs(marquee.currentY - marquee.startY),
            }}
          />
        )}

        {/* ==================================================================
         * 2. WINDOWS 11 APPLICATION WINDOWS (ISOLATED Z-[20] LAYER SO START MENU & TASKBAR ARE ALWAYS ON TOP)
         * ================================================================ */}
        <div className="absolute inset-0 pointer-events-none z-[20]">
        {windows.map((win) => {
          if (!win.isOpen) return null;
          const isFocused = activeWindowId === win.id && !win.isMinimized;
          const tbStyle = settings.taskbarStyle || 'default';
          const reservedBottomPx =
            tbStyle === 'glass-center' || tbStyle === 'floating'
              ? 58
              : tbStyle === 'compact'
              ? 40
              : 48;
          const canvasHeightCss = isPreviewMode
            ? '100vh'
            : `calc(100vh - ${reservedBottomPx}px)`;
          const halfHeightCss = isPreviewMode
            ? '50vh'
            : `calc((100vh - ${reservedBottomPx}px) / 2)`;

          let winPositionStyle: React.CSSProperties;
          if (win.isMaximized) {
            winPositionStyle = {
              left: 0,
              top: 0,
              width: '100%',
              height: canvasHeightCss,
              zIndex: Math.min(win.zIndex, 400),
            };
          } else if (win.snapPosition === 'left') {
            winPositionStyle = {
              left: 0,
              top: 0,
              width: '50%',
              height: canvasHeightCss,
              zIndex: Math.min(win.zIndex, 400),
            };
          } else if (win.snapPosition === 'right') {
            winPositionStyle = {
              left: '50%',
              top: 0,
              width: '50%',
              height: canvasHeightCss,
              zIndex: Math.min(win.zIndex, 400),
            };
          } else if (win.snapPosition === 'top-left') {
            winPositionStyle = {
              left: 0,
              top: 0,
              width: '50%',
              height: halfHeightCss,
              zIndex: Math.min(win.zIndex, 400),
            };
          } else if (win.snapPosition === 'top-right') {
            winPositionStyle = {
              left: '50%',
              top: 0,
              width: '50%',
              height: halfHeightCss,
              zIndex: Math.min(win.zIndex, 400),
            };
          } else if (win.snapPosition === 'bottom-left') {
            winPositionStyle = {
              left: 0,
              top: halfHeightCss,
              width: '50%',
              height: halfHeightCss,
              zIndex: Math.min(win.zIndex, 400),
            };
          } else if (win.snapPosition === 'bottom-right') {
            winPositionStyle = {
              left: '50%',
              top: halfHeightCss,
              width: '50%',
              height: halfHeightCss,
              zIndex: Math.min(win.zIndex, 400),
            };
          } else {
            winPositionStyle = {
              left: win.position.x,
              top: win.position.y,
              width: win.size.width,
              height: win.size.height,
              zIndex: Math.min(win.zIndex, 400),
            };
          }

          const startWindowResize = (
            e: React.MouseEvent,
            dir: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
          ) => {
            e.preventDefault();
            e.stopPropagation();
            focusWindow(win.id);
            const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
            const startW = win.isMaximized || win.snapPosition ? (rect?.width || win.size.width) : win.size.width;
            const startH = win.isMaximized || win.snapPosition ? (rect?.height || win.size.height) : win.size.height;
            const startLeft = win.isMaximized || win.snapPosition ? (rect?.left || win.position.x) : win.position.x;
            const startTop = win.isMaximized || win.snapPosition ? (rect?.top || win.position.y) : win.position.y;

            resizingWinRef.current = {
              winId: win.id,
              dir,
              startX: e.clientX,
              startY: e.clientY,
              origX: startLeft,
              origY: startTop,
              origW: startW,
              origH: startH,
            };
          };

          return (
            <div
              key={win.id}
              onMouseDown={() => {
                focusWindow(win.id);
                setIsStartOpen(false);
                setIsQuickSettingsOpen(false);
                setIsCalendarOpen(false);
                setIsKeyboardFlyoutOpen(false);
              }}
              style={winPositionStyle}
              className={`absolute pointer-events-auto flex-col overflow-hidden text-white transition-all duration-200 ${
                win.isMinimized ? 'hidden' : 'flex'
              } ${
                tbStyle === 'glass-center'
                  ? 'bg-gradient-to-br from-white/[0.16] via-white/[0.08] to-white/[0.13] backdrop-blur-3xl backdrop-saturate-[190%]'
                  : tbStyle === 'acrylic' || tbStyle === 'transparent'
                  ? 'bg-gradient-to-br from-cyan-500/[0.14] via-slate-900/[0.55] to-indigo-950/[0.55] backdrop-blur-3xl'
                  : tbStyle === 'floating'
                  ? 'bg-[#1b1b22]/88 backdrop-blur-2xl'
                  : tbStyle === 'compact' || tbStyle === 'solid'
                  ? 'bg-[#0f0f0f]'
                  : 'bg-[#1f1f1f]'
              } ${
                win.isMaximized || win.snapPosition
                  ? 'rounded-none border border-white/[0.1]'
                  : tbStyle === 'glass-center'
                  ? `rounded-[20px] border ${
                      isFocused
                        ? 'border-white/[0.42] shadow-[0_24px_64px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.52)]'
                        : 'border-white/[0.24] shadow-[0_14px_38px_rgba(0,0,0,0.32)] opacity-95'
                    }`
                  : tbStyle === 'floating'
                  ? `rounded-[14px] border ${
                      isFocused
                        ? 'border-white/[0.22] shadow-[0_26px_65px_rgba(0,0,0,0.8)]'
                        : 'border-white/[0.1] shadow-[0_14px_34px_rgba(0,0,0,0.55)] opacity-95'
                    }`
                  : tbStyle === 'acrylic' || tbStyle === 'transparent'
                  ? `rounded-[10px] border ${
                      isFocused
                        ? 'border-cyan-300/30 shadow-[0_24px_60px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.2)]'
                        : 'border-white/[0.12] shadow-[0_12px_32px_rgba(0,0,0,0.5)] opacity-95'
                    }`
                  : tbStyle === 'compact' || tbStyle === 'solid'
                  ? `rounded-[4px] border ${
                      isFocused
                        ? 'border-[#60cdff]/45 shadow-[0_18px_45px_rgba(0,0,0,0.9)]'
                        : 'border-white/[0.12] shadow-[0_10px_25px_rgba(0,0,0,0.65)] opacity-95'
                    }`
                  : `rounded-[8px] border ${
                      isFocused
                        ? 'border-white/[0.16] shadow-[0_24px_60px_rgba(0,0,0,0.75)]'
                        : 'border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.5)] opacity-95'
                    }`
              }`}
            >
              {/* 8-Direction Interactive Window Resize Handles (Active on all floating / snapped windows) */}
              {!win.isMaximized && (
                <>
                  {/* Top Edge */}
                  <div
                    onMouseDown={(e) => startWindowResize(e, 'n')}
                    className="absolute top-0 left-2 right-2 h-1.5 cursor-ns-resize z-[60]"
                  />
                  {/* Bottom Edge */}
                  <div
                    onMouseDown={(e) => startWindowResize(e, 's')}
                    className="absolute bottom-0 left-2 right-2 h-1.5 cursor-ns-resize z-[60]"
                  />
                  {/* Left Edge */}
                  <div
                    onMouseDown={(e) => startWindowResize(e, 'w')}
                    className="absolute left-0 top-2 bottom-2 w-1.5 cursor-ew-resize z-[60]"
                  />
                  {/* Right Edge */}
                  <div
                    onMouseDown={(e) => startWindowResize(e, 'e')}
                    className="absolute right-0 top-2 bottom-2 w-1.5 cursor-ew-resize z-[60]"
                  />
                  {/* Top-Left Corner */}
                  <div
                    onMouseDown={(e) => startWindowResize(e, 'nw')}
                    className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-[65]"
                  />
                  {/* Top-Right Corner */}
                  <div
                    onMouseDown={(e) => startWindowResize(e, 'ne')}
                    className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-[65]"
                  />
                  {/* Bottom-Left Corner */}
                  <div
                    onMouseDown={(e) => startWindowResize(e, 'sw')}
                    className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-[65]"
                  />
                  {/* Bottom-Right Corner */}
                  <div
                    onMouseDown={(e) => startWindowResize(e, 'se')}
                    className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-[65]"
                  />
                </>
              )}
              {/* Authentic Windows 11 32px Title Bar (Hidden in Preview Mode so app content fills screen cleanly) */}
              {!isPreviewMode && (
                <div
                  onMouseDown={(e) => {
                    if (win.isMaximized) return;
                    draggingWinRef.current = {
                      winId: win.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      origX: win.position.x,
                      origY: win.position.y,
                    };
                  }}
                  onDoubleClick={() => {
                    setWindows((ws) =>
                      ws.map((w) =>
                        w.id === win.id
                          ? { ...w, isMaximized: !w.isMaximized, snapPosition: undefined }
                          : w
                      )
                    );
                  }}
                  className={`${
                    tbStyle === 'compact' || tbStyle === 'solid'
                      ? 'h-7'
                      : tbStyle === 'glass-center'
                      ? 'h-9'
                      : 'h-8'
                  } flex items-center justify-between pl-3.5 select-none shrink-0 relative transition-colors ${
                    tbStyle === 'glass-center'
                      ? isFocused
                        ? 'bg-gradient-to-r from-white/[0.22] via-white/[0.14] to-white/[0.20] backdrop-blur-3xl border-b border-white/[0.32] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.48)]'
                        : 'bg-white/[0.10] backdrop-blur-2xl border-b border-white/[0.18]'
                      : tbStyle === 'acrylic' || tbStyle === 'transparent'
                      ? isFocused
                        ? 'bg-cyan-500/[0.16] backdrop-blur-3xl border-b border-cyan-300/30'
                        : 'bg-white/[0.08] backdrop-blur-xl border-b border-white/[0.12]'
                      : tbStyle === 'floating'
                      ? isFocused
                        ? 'bg-[#25252b]/95 border-b border-white/[0.1]'
                        : 'bg-[#1b1b20]/90 border-b border-white/[0.05]'
                      : tbStyle === 'compact' || tbStyle === 'solid'
                      ? isFocused
                        ? 'bg-[#141414] border-b border-[#60cdff]/30'
                        : 'bg-[#0c0c0c] border-b border-white/[0.08]'
                      : isFocused
                      ? 'bg-[#202020] border-b border-white/[0.06]'
                      : 'bg-[#1a1a1a] border-b border-white/[0.06]'
                  }`}
                  style={
                    settings.systemAppMods?.[win.appId]?.headerBgColor
                      ? {
                          backgroundColor:
                            settings.systemAppMods[win.appId]?.headerBgColor,
                          borderBottomColor:
                            settings.systemAppMods[win.appId]?.accentColor ||
                            undefined,
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AppIconRenderer appId={win.appId} size={16} />
                    <span className="text-xs font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] truncate">
                      {settings.systemAppMods?.[win.appId]?.customTitle || win.title}
                    </span>
                    {tbStyle === 'glass-center' && (
                      <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full bg-white/[0.16] border border-white/[0.28] text-[9px] text-white/90">
                        Glass
                      </span>
                    )}
                  </div>

                  {/* Window Caption Buttons (Themed per Taskbar Style) + Snap Layouts Flyout */}
                  <div
                    className={`flex items-center h-full relative ${
                      tbStyle === 'glass-center' || tbStyle === 'floating'
                        ? 'pr-1.5 gap-1'
                        : ''
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setWindows((ws) =>
                          ws.map((w) =>
                            w.id === win.id ? { ...w, isMinimized: true } : w
                          )
                        )
                      }
                      className={`${
                        tbStyle === 'glass-center' || tbStyle === 'floating'
                          ? 'w-7 h-6 rounded-full hover:bg-white/[0.16]'
                          : tbStyle === 'compact' || tbStyle === 'solid'
                          ? 'w-10 h-7 hover:bg-white/[0.12]'
                          : 'w-[46px] h-8 hover:bg-white/[0.08]'
                      } flex items-center justify-center text-neutral-300 transition-colors`}
                      title="Minimize"
                    >
                      <Minus size={14} strokeWidth={1.5} />
                    </button>

                    {/* Maximize / Restore Button with Windows 11 Snap Layouts Hover Flyout */}
                    <div
                      className="relative h-full flex items-center"
                      onMouseEnter={() => setSnapHoverWinId(win.id)}
                      onMouseLeave={() =>
                        setSnapHoverWinId((curr) => (curr === win.id ? null : curr))
                      }
                    >
                      <button
                        onClick={() =>
                          setWindows((ws) =>
                            ws.map((w) =>
                              w.id === win.id
                                ? {
                                    ...w,
                                    isMaximized: !w.isMaximized,
                                    snapPosition: undefined,
                                  }
                                : w
                            )
                          )
                        }
                        className={`${
                          tbStyle === 'glass-center' || tbStyle === 'floating'
                            ? 'w-7 h-6 rounded-full hover:bg-white/[0.16]'
                            : tbStyle === 'compact' || tbStyle === 'solid'
                            ? 'w-10 h-7 hover:bg-white/[0.12]'
                            : 'w-[46px] h-8 hover:bg-white/[0.08]'
                        } flex items-center justify-center text-neutral-300 transition-colors`}
                        title={
                          win.isMaximized || win.snapPosition
                            ? 'Restore Window'
                            : 'Maximize or Hover for Split Screen Snap Layouts'
                        }
                      >
                        <Square size={11} strokeWidth={1.5} />
                      </button>

                      {/* Windows 11 Snap Layouts Popup */}
                      {snapHoverWinId === win.id && (
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute right-0 top-8 z-[150] w-52 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.65)] ${
                            tbStyle === 'glass-center'
                              ? 'rounded-2xl bg-gradient-to-br from-white/[0.24] via-sky-300/[0.16] to-indigo-500/[0.20] backdrop-blur-3xl border border-white/[0.38]'
                              : tbStyle === 'floating'
                              ? 'rounded-xl bg-[#222228]/95 backdrop-blur-2xl border border-white/[0.18]'
                              : 'rounded-[8px] bg-[#262626]/98 backdrop-blur-2xl border border-white/[0.16]'
                          }`}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            {/* Layout 1: 50 / 50 Split Screen */}
                            <div className="h-12 p-1 rounded bg-[#1a1a1a] border border-white/[0.1] grid grid-cols-2 gap-1">
                              <button
                                onClick={() => snapWindowById(win.id, 'left')}
                                className={`rounded-[3px] border transition-colors ${
                                  win.snapPosition === 'left'
                                    ? 'bg-[#0078d4] border-[#60cdff]'
                                    : 'bg-white/[0.08] hover:bg-[#0078d4]/70 border-white/[0.12]'
                                }`}
                                title="Snap Left"
                              />
                              <button
                                onClick={() => snapWindowById(win.id, 'right')}
                                className={`rounded-[3px] border transition-colors ${
                                  win.snapPosition === 'right'
                                    ? 'bg-[#0078d4] border-[#60cdff]'
                                    : 'bg-white/[0.08] hover:bg-[#0078d4]/70 border-white/[0.12]'
                                }`}
                                title="Snap Right"
                              />
                            </div>

                            {/* Layout 2: 4 Quadrants Split Screen */}
                            <div className="h-12 p-1 rounded bg-[#1a1a1a] border border-white/[0.1] grid grid-cols-2 grid-rows-2 gap-1">
                              <button
                                onClick={() => snapWindowById(win.id, 'top-left')}
                                className={`rounded-[2px] border transition-colors ${
                                  win.snapPosition === 'top-left'
                                    ? 'bg-[#0078d4] border-[#60cdff]'
                                    : 'bg-white/[0.08] hover:bg-[#0078d4]/70 border-white/[0.12]'
                                }`}
                                title="Snap Top-Left"
                              />
                              <button
                                onClick={() => snapWindowById(win.id, 'top-right')}
                                className={`rounded-[2px] border transition-colors ${
                                  win.snapPosition === 'top-right'
                                    ? 'bg-[#0078d4] border-[#60cdff]'
                                    : 'bg-white/[0.08] hover:bg-[#0078d4]/70 border-white/[0.12]'
                                }`}
                                title="Snap Top-Right"
                              />
                              <button
                                onClick={() => snapWindowById(win.id, 'bottom-left')}
                                className={`rounded-[2px] border transition-colors ${
                                  win.snapPosition === 'bottom-left'
                                    ? 'bg-[#0078d4] border-[#60cdff]'
                                    : 'bg-white/[0.08] hover:bg-[#0078d4]/70 border-white/[0.12]'
                                }`}
                                title="Snap Bottom-Left"
                              />
                              <button
                                onClick={() => snapWindowById(win.id, 'bottom-right')}
                                className={`rounded-[2px] border transition-colors ${
                                  win.snapPosition === 'bottom-right'
                                    ? 'bg-[#0078d4] border-[#60cdff]'
                                    : 'bg-white/[0.08] hover:bg-[#0078d4]/70 border-white/[0.12]'
                                }`}
                                title="Snap Bottom-Right"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setWindows((ws) => ws.filter((w) => w.id !== win.id))
                      }
                      className={`${
                        tbStyle === 'glass-center' || tbStyle === 'floating'
                          ? 'w-7 h-6 rounded-full hover:bg-[#c42b1c] hover:text-white'
                          : tbStyle === 'compact' || tbStyle === 'solid'
                          ? 'w-10 h-7 hover:bg-[#c42b1c] hover:text-white'
                          : 'w-[46px] h-8 hover:bg-[#c42b1c] hover:text-white'
                      } flex items-center justify-center text-neutral-300 transition-colors`}
                      title="Close"
                    >
                      <X size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* Window Body (with Live Copilot AI App Customization & Full Override Support) */}
              <div
                className={`flex-1 flex flex-col overflow-hidden ${
                  tbStyle === 'glass-center'
                    ? 'bg-white/[0.06] backdrop-blur-3xl win11-glass-window-body'
                    : tbStyle === 'acrylic' || tbStyle === 'transparent'
                    ? 'bg-slate-900/50 backdrop-blur-2xl win11-acrylic-window-body'
                    : tbStyle === 'compact' || tbStyle === 'solid'
                    ? 'bg-[#121212]'
                    : 'bg-[#191919]'
                }`}
              >
                {/* If Copilot AI injected a Custom Toolbar/Widget into this Windows App */}
                {settings.systemAppMods?.[win.appId]?.customWidgetHtml &&
                  !settings.systemAppMods?.[win.appId]?.useFullOverride && (
                    <div className="shrink-0">
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            settings.systemAppMods[win.appId]?.customWidgetHtml || '',
                        }}
                      />
                    </div>
                  )}

                {/* If Copilot AI replaced this app with a Full Custom HTML/CSS/JS Override */}
                {settings.systemAppMods?.[win.appId]?.useFullOverride &&
                settings.systemAppMods?.[win.appId]?.fullOverrideHtml ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-3 py-1.5 bg-[#141414] border-b border-white/[0.08] flex items-center justify-between text-xs">
                      <span className="text-sky-400 font-medium">
                        Running Copilot AI Custom App Version ({settings.systemAppMods[win.appId]?.customTitle || win.title})
                      </span>
                      <button
                        onClick={() => {
                          const existing = settings.systemAppMods?.[win.appId];
                          if (!existing) return;
                          setSettings((prev) => ({
                            ...prev,
                            systemAppMods: {
                              ...(prev.systemAppMods || {}),
                              [win.appId]: { ...existing, useFullOverride: false },
                            },
                          }));
                        }}
                        className="px-2.5 py-0.5 rounded bg-white/[0.08] hover:bg-white/[0.15] text-[11px] text-white"
                      >
                        Switch Back to Native App
                      </button>
                    </div>
                    <iframe
                      title={`ai-override-${win.id}`}
                      srcDoc={injectWin11KernelBridge(
                        settings.systemAppMods[win.appId]?.fullOverrideHtml || '',
                        win.appId
                      )}
                      sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"
                      className="flex-1 w-full border-0 bg-[#141414]"
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-hidden">
                {win.appId === 'thispc' && (
                  <ThisPCApp
                    files={files}
                    initialFolderId={win.folderId}
                    osClipboard={osClipboard}
                    onSetClipboard={setOsClipboard}
                    onPasteToFolder={pasteToFolder}
                    onOpenItem={openFileSystemItem}
                    onPreviewFolderInBrowser={(folder) =>
                      launchApp('edge', {
                        fileId: folder.id,
                        folderId: folder.id,
                        customTitle: `${folder.name} - Microsoft Edge`,
                      })
                    }
                    onOpenFolderInVSCode={(folderId) => {
                      const fObj = filesRef.current.find((f) => f.id === folderId);
                      launchApp('vscode', {
                        folderId,
                        customTitle: `${fObj?.name || 'Project'} - Visual Studio Code`,
                      });
                    }}
                    onLaunchApp={(id) => launchApp(id)}
                    onCreateItem={createFileSystemItem}
                    onRenameItem={renameFileSystemItem}
                    onDeleteItems={deleteFileSystemItems}
                    onRestoreItems={restoreFileSystemItems}
                    onMoveItems={moveFileSystemItems}
                    onAddSpotifyTrack={(track) =>
                      setSpotifyTracks((prev) => [
                        { ...track, id: `sp-${Date.now()}` },
                        ...prev,
                      ])
                    }
                  />
                )}

                {win.appId === 'vscode' && (
                  <VSCodeApp
                    files={files}
                    initialFolderId={win.folderId}
                    initialFileId={win.fileId}
                    onCreateItem={createFileSystemItem}
                    onUpdateItem={updateFileSystemItem}
                    onRenameItem={renameFileSystemItem}
                    onDeleteItems={deleteFileSystemItems}
                    onPreviewFolderInBrowser={(folderId) => {
                      const folderObj = filesRef.current.find((f) => f.id === folderId);
                      launchApp('edge', {
                        folderId,
                        fileId: folderId,
                        customTitle: `${folderObj?.name || 'Project'} — Google Browser`,
                      });
                    }}
                  />
                )}

                {win.appId === 'store' && (
                  <MicrosoftStoreApp
                    files={files}
                    onCreateItem={createFileSystemItem}
                    onOpenItem={openFileSystemItem}
                    onEditItemContent={editItemContent}
                    onLaunchApp={(id, opts) => launchApp(id, opts)}
                    onNotify={(title, msg) =>
                      pushNotification(title, msg, 'store')
                    }
                  />
                )}

                {win.appId === 'spotify' && (
                  <SpotifyApp
                    tracks={spotifyTracks}
                    systemVolume={settings.volume}
                    systemMuted={settings.isMuted}
                    onSystemVolumeChange={(vol, muted) =>
                      setSettings((prev) => ({
                        ...prev,
                        volume: vol,
                        isMuted: muted ?? prev.isMuted,
                      }))
                    }
                    onAddTrack={(track) => {
                      const created: SpotifyTrack = {
                        ...track,
                        id: `sp-${Date.now()}`,
                        addedAt: new Date().toISOString().slice(0, 10),
                      };
                      setSpotifyTracks((prev) => [created, ...prev]);
                      return created;
                    }}
                    onDeleteTrack={(id) =>
                      setSpotifyTracks((prev) =>
                        prev.filter((t) => t.id !== id)
                      )
                    }
                    onToggleLike={(id) =>
                      setSpotifyTracks((prev) =>
                        prev.map((t) =>
                          t.id === id ? { ...t, isLiked: !t.isLiked } : t
                        )
                      )
                    }
                    onSaveTrackToDesktop={(track) => {
                      createFileSystemItem(
                        `${track.title}.mp3`,
                        'audio',
                        'desktop',
                        {
                          mediaUrl: track.audioUrl,
                          audioUrl: track.audioUrl,
                          audioArtist: track.artist,
                          size: 3400000,
                        }
                      );
                    }}
                  />
                )}

                {win.appId === 'notepad' && (
                  <NotepadApp
                    files={files}
                    initialFileId={win.fileId}
                    onSaveFile={(fileId, name, content, type) => {
                      if (fileId) {
                        editItemContent(fileId, content, name);
                        const existing = filesRef.current.find(
                          (f) => f.id === fileId
                        );
                        if (existing) {
                          return { ...existing, name, content };
                        }
                      }
                      return createFileSystemItem(name, type, 'desktop', {
                        content,
                      });
                    }}
                    onRunHtmlFile={(file) =>
                      launchApp('edge', {
                        fileId: file.id,
                        customTitle: file.name,
                      })
                    }
                  />
                )}

                {win.appId === 'edge' && (
                  <BrowserApp
                    files={files}
                    initialFileId={win.fileId}
                    initialFolderId={win.folderId}
                    isPreviewMode={isPreviewMode}
                    onEditInNotepad={(fileId) =>
                      launchApp('notepad', { fileId })
                    }
                    onOpenInVSCode={(folderId, fileId) =>
                      launchApp('vscode', {
                        folderId,
                        fileId,
                        customTitle: 'Visual Studio Code',
                      })
                    }
                    onUpdateItem={updateFileSystemItem}
                  />
                )}

                {win.appId === 'copilot' && (
                  <CopilotApp
                    files={files}
                    windows={windows}
                    settings={settings}
                    spotifyTracks={spotifyTracks}
                    onCreateItem={createFileSystemItem}
                    onEditItemContent={editItemContent}
                    onOpenItem={openFileSystemItem}
                    onLaunchApp={(id, opts) => launchApp(id, opts)}
                    onCloseWindowByAppOrAll={(appIdOrAll) => {
                      if (appIdOrAll === 'ALL') {
                        setWindows([]);
                      } else {
                        setWindows((ws) =>
                          ws.filter((w) => w.appId !== appIdOrAll)
                        );
                      }
                    }}
                    onRenameItem={renameFileSystemItem}
                    onDeleteItems={deleteFileSystemItems}
                    onRestoreItems={restoreFileSystemItems}
                    onCopyItem={copySingleItem}
                    onMoveItems={moveFileSystemItems}
                    onUpdateSettings={(partial) => {
                      if (typeof partial.wifiEnabled === 'boolean') setWifiEnabled(partial.wifiEnabled);
                      if (typeof partial.bluetoothEnabled === 'boolean') setBtEnabled(partial.bluetoothEnabled);
                      if (typeof partial.nightLight === 'boolean') setNightLight(partial.nightLight);
                      if (typeof partial.airplaneMode === 'boolean' && partial.airplaneMode) {
                        setWifiEnabled(false);
                        setBtEnabled(false);
                      }
                      setSettings((prev) => ({ ...prev, ...partial }));
                    }}
                    onToggleFullScreen={handleToggleFullScreen}
                    onArrangeDesktop={arrangeDesktopIcons}
                    onPlayAndAddSpotifySearch={handlePlayAndAddSpotifySearch}
                    onSnapWindow={snapWindowByAppId}
                    onWindowAction={(windowId, action) => {
                      if (action === 'minimize') {
                        setWindows((ws) =>
                          ws.map((w) => (w.id === windowId ? { ...w, isMinimized: true } : w))
                        );
                      } else if (action === 'maximize') {
                        setWindows((ws) =>
                          ws.map((w) =>
                            w.id === windowId
                              ? { ...w, isMaximized: !w.isMaximized, snapPosition: undefined }
                              : w
                          )
                        );
                      }
                    }}
                    onTogglePreviewMode={() => setIsPreviewMode((prev) => !prev)}
                    onPowerAction={(mode) => {
                      if (mode === 'lock') triggerLockScreen();
                      else if (mode === 'restart') triggerRestart();
                      else if (mode === 'shutdown') triggerShutDown();
                    }}
                    onNotify={(title, msg) =>
                      pushNotification(title, msg, 'copilot')
                    }
                    onBusyChange={setIsCopilotWindowBusy}
                  />
                )}

                {win.appId === 'installer' && (
                  <AppInstallerApp
                    files={files}
                    onCreateItem={createFileSystemItem}
                    onOpenItem={openFileSystemItem}
                    onUpdateItem={updateFileSystemItem}
                    onDeleteItem={(id) => deleteFileSystemItems([id])}
                    onOpenInVSCode={(fileId, folderId) =>
                      launchApp('vscode', {
                        fileId,
                        folderId,
                        customTitle: 'Visual Studio Code',
                      })
                    }
                    onLaunchApp={(id, opts) => launchApp(id, opts)}
                  />
                )}

                {win.appId === 'pdfreader' && (
                  <PdfReaderApp
                    files={files}
                    initialFileId={win.fileId}
                    onUpdateFile={(id, content, extra) => {
                      updateFileSystemItem(id, {
                        content,
                        ...(extra || {}),
                      });
                    }}
                    onCreateFile={(name, content, parentId, extra) =>
                      createFileSystemItem(name, 'pdf', parentId || 'documents', {
                        content,
                        ...(extra || {}),
                      })
                    }
                  />
                )}

                {win.appId === 'mediaplayer' && (
                  <MediaPlayerApp
                    files={files}
                    initialFileId={win.fileId}
                    onCreateItem={createFileSystemItem}
                  />
                )}

                {win.appId === 'terminal' && (
                  <TerminalApp
                    files={files}
                    onOpenItem={openFileSystemItem}
                    onLaunchApp={(id) => launchApp(id)}
                    onCreateItem={(name, type, parentId, content) =>
                      createFileSystemItem(name, type, parentId || 'desktop', {
                        content,
                      })
                    }
                    onRenameItem={renameFileSystemItem}
                    onDeleteItem={(id) => deleteFileSystemItems([id])}
                  />
                )}

                {win.appId === 'paint' && (
                  <PaintApp
                    onSaveImageToDesktop={(name, dataUrl) => {
                      createFileSystemItem(name, 'image', 'desktop', {
                        mediaUrl: dataUrl,
                        imageUrl: dataUrl,
                        size: 185000,
                      });
                    }}
                  />
                )}

                {win.appId === 'calculator' && <CalculatorApp />}

                {win.appId === 'photos' && (
                  <PhotosApp files={files} initialFileId={win.fileId} />
                )}

                {win.appId === 'taskmanager' && (
                  <TaskManagerApp
                    windows={windows}
                    accounts={accountsList}
                    activeAccountId={activeAccount.id}
                    onCloseWindow={(id) =>
                      setWindows((ws) => ws.filter((w) => w.id !== id))
                    }
                    onFocusWindow={focusWindow}
                    onLaunchApp={(appId) => launchApp(appId)}
                    onSwitchAccount={(accId) =>
                      setSettings((prev) => ({
                        ...prev,
                        activeAccountId: accId,
                      }))
                    }
                  />
                )}

                {win.appId === 'settings' && (
                  <SettingsApp
                    settings={settings}
                    isFullScreen={isFullScreen}
                    onToggleFullScreen={() => handleToggleFullScreen()}
                    isPreviewMode={isPreviewMode}
                    onTogglePreviewMode={() => setIsPreviewMode((prev) => !prev)}
                    onUpdateSettings={(partial) =>
                      setSettings((prev) => ({ ...prev, ...partial }))
                    }
                    fileSystem={files}
                    onSyncCloudNow={async () => {
                      const accId = settings.activeAccountId || 'acc-admin';
                      const syncedAt = await saveAccountProfileSnapshot(accId, {
                        accountId: accId,
                        files: filesRef.current,
                        wallpaperId: settings.wallpaperId,
                        liveWallpaperId: settings.liveWallpaperId,
                        accentColor: settings.accentColor,
                        taskbarStyle: settings.taskbarStyle,
                        taskbarAlignment: settings.taskbarAlignment,
                        theme: settings.theme,
                        updatedAt: new Date().toISOString(),
                      });
                      if (syncedAt) {
                        setSettings((prev) => ({
                          ...prev,
                          lastCloudSyncAt: new Date(syncedAt).toLocaleTimeString(),
                        }));
                      }
                    }}
                    onExportSystemBackup={() => {
                      const payload = {
                        version: '24H2-Win11-Pro-Backup',
                        exportedAt: new Date().toISOString(),
                        settings,
                        files: filesRef.current,
                      };
                      const blob = new Blob([JSON.stringify(payload, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Windows11_Backup_${activeAccount.name.replace(/\s+/g, '_')}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    onImportSystemBackup={(file: File) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const parsed = JSON.parse(String(reader.result || '{}'));
                          if (Array.isArray(parsed.files)) {
                            const cleaned = normalizeCleanDesktopLayout(parsed.files);
                            filesRef.current = cleaned;
                            setFiles(cleaned);
                          }
                          if (parsed.settings && typeof parsed.settings === 'object') {
                            setSettings((prev) => ({
                              ...prev,
                              ...parsed.settings,
                            }));
                          }
                        } catch {
                          // ignore invalid backup JSON
                        }
                      };
                      reader.readAsText(file);
                    }}
                    onResetFileSystem={() => {
                      void clearAllWindowsPersistence();
                      filesRef.current = INITIAL_FILE_SYSTEM;
                      setFiles(INITIAL_FILE_SYSTEM);
                    }}
                    onFactoryReset={(keepUserFiles: boolean) => {
                      if (!keepUserFiles) {
                        void clearAllWindowsPersistence();
                        try {
                          localStorage.removeItem('win11_copilot_pro_sessions_v3');
                          localStorage.removeItem('win11_copilot_ai_memory_v3');
                        } catch {
                          // ignore
                        }
                        const cleanInitial = normalizeCleanDesktopLayout(
                          INITIAL_FILE_SYSTEM,
                          true
                        );
                        filesRef.current = cleanInitial;
                        setFiles(cleanInitial);
                        setSpotifyTracks(INITIAL_SPOTIFY_TRACKS);
                      }
                      setSettings({
                        theme: 'dark',
                        wallpaperId: 'bloom-dark',
                        liveWallpaperId: 'none',
                        accentColor: '#0078d4',
                        taskbarAlignment: 'center',
                        taskbarStyle: 'default',
                        pinnedTaskbarApps: undefined,
                        customAppIcons: {},
                        systemAppMods: {},
                        volume: 80,
                        isMuted: false,
                        brightness: 100,
                        password: '',
                        requirePasswordOnSettings: false,
                        systemSounds: true,
                        activeAccountId: 'acc-admin',
                        accounts: [
                          {
                            id: 'acc-admin',
                            name: 'Administrator',
                            email: 'admin@windows11.local',
                            role: 'Administrator',
                            avatarColor: '#0078d4',
                          },
                          {
                            id: 'acc-guest',
                            name: 'Workspace User',
                            email: 'user@windows11.local',
                            role: 'Standard User',
                            avatarColor: '#10b981',
                          },
                        ],
                      });
                      pushNotification(
                        keepUserFiles
                          ? 'Factory Reset Complete (Files Kept)'
                          : 'Full Factory Reset Complete',
                        keepUserFiles
                          ? 'All Windows 11 settings, themes, and software configurations have been restored to factory defaults.'
                          : 'Windows 11 has been completely wiped and restored to factory original state.',
                        'settings'
                      );
                    }}
                    onAutoArrangeDesktop={arrangeDesktopIcons}
                    onLockSystem={() => triggerLockScreen()}
                  />
                )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>

        {/* ==================================================================
         * 3. WINDOWS 11 RIGHT-CLICK ACRYLIC CONTEXT MENU
         * ================================================================ */}
        {contextMenu && (
          <div
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
            className={`fixed z-[9700] w-64 p-1.5 text-xs text-neutral-100 ${
              settings.taskbarStyle === 'glass-center'
                ? 'rounded-[18px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_20px_50px_rgba(0,0,0,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.48)]'
                : settings.taskbarStyle === 'floating'
                ? 'rounded-[14px] bg-[#1e1e24]/94 backdrop-blur-3xl border border-white/[0.18] shadow-[0_18px_42px_rgba(0,0,0,0.75)]'
                : settings.taskbarStyle === 'acrylic' ||
                  settings.taskbarStyle === 'transparent'
                ? 'rounded-[12px] bg-cyan-950/55 backdrop-blur-3xl border border-cyan-300/30 shadow-[0_18px_42px_rgba(0,0,0,0.7)]'
                : settings.taskbarStyle === 'compact' ||
                  settings.taskbarStyle === 'solid'
                ? 'rounded-[4px] bg-[#111111] border border-white/[0.18] shadow-[0_16px_36px_rgba(0,0,0,0.9)]'
                : 'rounded-[8px] bg-[#252525]/95 backdrop-blur-2xl border border-white/[0.12] shadow-[0_16px_36px_rgba(0,0,0,0.65)]'
            }`}
          >
            {contextMenu.targetItemId ? (
              (() => {
                const target = files.find(
                  (f) => f.id === contextMenu.targetItemId
                );
                if (!target) return null;
                return (
                  <div className="space-y-0.5">
                    {/* Windows 11 Top Quick Action Row (Cut, Copy, Rename, Delete) */}
                    <div className="flex items-center justify-around pb-1.5 mb-1 border-b border-white/[0.08]">
                      <button
                        onClick={() => {
                          setOsClipboard({
                            ids: selectedDesktopIds,
                            mode: 'cut',
                          });
                          setContextMenu(null);
                        }}
                        className="p-2 rounded hover:bg-white/[0.08] text-neutral-200"
                        title="Cut (Ctrl+X)"
                      >
                        <Scissors size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setOsClipboard({
                            ids: selectedDesktopIds,
                            mode: 'copy',
                          });
                          setContextMenu(null);
                        }}
                        className="p-2 rounded hover:bg-white/[0.08] text-neutral-200"
                        title="Copy (Ctrl+C)"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setRenamingDesktopId(target.id);
                          setRenameDesktopValue(target.name);
                          setContextMenu(null);
                        }}
                        className="p-2 rounded hover:bg-white/[0.08] text-neutral-200"
                        title="Rename (F2)"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          deleteFileSystemItems(selectedDesktopIds);
                          setContextMenu(null);
                        }}
                        className="p-2 rounded hover:bg-white/[0.08] text-red-400"
                        title="Delete (Del)"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        openFileSystemItem(target);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08] font-medium"
                    >
                      <span className="flex items-center gap-2.5">
                        <ExternalLink size={14} className="text-[#60cdff]" />
                        <span>Open</span>
                      </span>
                      <span className="text-[10px] text-neutral-400">Enter</span>
                    </button>

                    {target.type === 'pdf' && (
                      <button
                        onClick={() => {
                          launchApp('pdfreader', {
                            fileId: target.id,
                            customTitle: `${target.name} - PDF Reader Studio`,
                          });
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                      >
                        <span className="flex items-center gap-2.5">
                          <AppIconRenderer appId="pdfreader" size={14} />
                          <span>Open in PDF Reader Studio</span>
                        </span>
                      </button>
                    )}

                    {(target.type === 'video' || target.type === 'audio') && (
                      <button
                        onClick={() => {
                          launchApp('mediaplayer', {
                            fileId: target.id,
                            customTitle: `${target.name} - Media Player`,
                          });
                          setContextMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                      >
                        <span className="flex items-center gap-2.5">
                          <AppIconRenderer appId="mediaplayer" size={14} />
                          <span>Open in Media Player Pro</span>
                        </span>
                      </button>
                    )}

                    {target.type === 'folder' && (
                      <>
                        <button
                          onClick={() => {
                            launchApp('vscode', {
                              folderId: target.id,
                              customTitle: `${target.name} - Visual Studio Code`,
                            });
                            setContextMenu(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                        >
                          <span className="flex items-center gap-2.5">
                            <AppIconRenderer appId="vscode" size={14} />
                            <span>Open in Visual Studio Code</span>
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            launchApp('edge', {
                              fileId: target.id,
                              folderId: target.id,
                              customTitle: `${target.name} - Microsoft Edge`,
                            });
                            setContextMenu(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                        >
                          <span className="flex items-center gap-2.5">
                            <AppIconRenderer appId="edge" size={14} />
                            <span>Preview in Microsoft Edge</span>
                          </span>
                        </button>
                      </>
                    )}

                    {target.type === 'app' && (
                      <>
                        {target.appId && (
                          <button
                            onClick={() => {
                              togglePinAppToTaskbar(target.appId!);
                              setContextMenu(null);
                            }}
                            className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                          >
                            <span className="flex items-center gap-2.5">
                              {isAppPinnedToTaskbar(target.appId) ? (
                                <>
                                  <PinOff size={14} className="text-amber-400" />
                                  <span>Unpin from taskbar</span>
                                </>
                              ) : (
                                <>
                                  <Pin size={14} className="text-[#60cdff]" />
                                  <span>Pin to taskbar</span>
                                </>
                              )}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            launchApp('settings');
                            setContextMenu(null);
                          }}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                        >
                          <span className="flex items-center gap-2.5">
                            <Monitor size={14} className="text-[#60cdff]" />
                            <span>Change App Icon...</span>
                          </span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        setRenamingDesktopId(target.id);
                        setRenameDesktopValue(target.name);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                    >
                      <span className="flex items-center gap-2.5">
                        <Edit3 size={14} className="text-neutral-300" />
                        <span>Rename</span>
                      </span>
                      <span className="text-[10px] text-neutral-400">F2</span>
                    </button>

                    <button
                      onClick={() => {
                        copySingleItem(target, 'desktop');
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                    >
                      <span className="flex items-center gap-2.5">
                        <Copy size={14} className="text-neutral-300" />
                        <span>Duplicate</span>
                      </span>
                    </button>

                    <div className="my-1 border-t border-white/[0.08]" />

                    <button
                      onClick={() => {
                        deleteFileSystemItems(selectedDesktopIds);
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08] text-red-400"
                    >
                      <span className="flex items-center gap-2.5">
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </span>
                      <span className="text-[10px] text-neutral-400">Del</span>
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    arrangeDesktopIcons();
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <ArrowUpDown size={14} className="text-neutral-300" />
                    <span>Sort by</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setFiles((prev) => {
                      const cleaned = normalizeCleanDesktopLayout(prev, true);
                      filesRef.current = cleaned;
                      return cleaned;
                    });
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <RefreshCw size={14} className="text-neutral-300" />
                    <span>Refresh</span>
                  </span>
                </button>

                <div className="my-1 border-t border-white/[0.08]" />

                {osClipboard && (
                  <button
                    onClick={() => {
                      pasteToFolder('desktop');
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                  >
                    <span className="flex items-center gap-2.5">
                      <Clipboard size={14} className="text-[#60cdff]" />
                      <span>Paste</span>
                    </span>
                    <span className="text-[10px] text-neutral-400">Ctrl+V</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const f = createFileSystemItem(
                      'New folder',
                      'folder',
                      'desktop'
                    );
                    setRenamingDesktopId(f.id);
                    setRenameDesktopValue(f.name);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <FolderPlus size={14} className="text-[#f59e0b]" />
                    <span>New Folder</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    const f = createFileSystemItem(
                      'New Text Document.txt',
                      'text',
                      'desktop',
                      { content: '' }
                    );
                    setRenamingDesktopId(f.id);
                    setRenameDesktopValue(f.name);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <FilePlus size={14} className="text-[#60cdff]" />
                    <span>New Text Document</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setContextMenu(null);
                    desktopFileInputRef.current?.click();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <Upload size={14} className="text-[#60cdff]" />
                    <span>Import file from PC...</span>
                  </span>
                </button>

                <div className="my-1 border-t border-white/[0.08]" />

                <button
                  onClick={() => {
                    launchApp('terminal');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <AppIconRenderer appId="terminal" size={14} />
                    <span>Open in Terminal</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    launchApp('settings');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <Monitor size={14} className="text-neutral-300" />
                    <span>Display settings</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    launchApp('settings');
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded hover:bg-white/[0.08]"
                >
                  <span className="flex items-center gap-2.5">
                    <AppIconRenderer appId="settings" size={14} />
                    <span>Personalize</span>
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================
         * 4. WINDOWS 11 START MENU (23H2 MICA FLYOUT)
         * ================================================================ */}
        {isStartOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`fixed bottom-[64px] z-[9500] w-[620px] max-w-[95vw] h-[610px] max-h-[82vh] flex flex-col overflow-hidden text-white transition-all duration-200 ${
              settings.taskbarStyle === 'glass-center'
                ? 'rounded-[24px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_24px_65px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                : settings.taskbarStyle === 'floating'
                ? 'rounded-[16px] bg-[#1e1e24]/94 backdrop-blur-3xl border border-white/[0.18] shadow-[0_26px_65px_rgba(0,0,0,0.85)]'
                : settings.taskbarStyle === 'acrylic' ||
                  settings.taskbarStyle === 'transparent'
                ? 'rounded-[14px] bg-gradient-to-br from-cyan-500/[0.16] via-slate-900/[0.62] to-indigo-950/[0.62] backdrop-blur-3xl border border-cyan-300/35 shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
                : settings.taskbarStyle === 'compact' ||
                  settings.taskbarStyle === 'solid'
                ? 'rounded-[4px] bg-[#111111] border border-white/[0.16] shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
                : 'rounded-[8px] bg-[#202020]/96 backdrop-blur-3xl border border-white/[0.14] shadow-[0_24px_60px_rgba(0,0,0,0.85)]'
            } ${
              settings.taskbarAlignment === 'center' ||
              settings.taskbarStyle === 'glass-center'
                ? 'left-1/2 -translate-x-1/2'
                : 'left-3'
            }`}
          >
            {/* Top Search Bar + Quick Full Screen Button */}
            <div className="px-8 pt-6 pb-3 flex items-center gap-2.5">
              <div
                className={`flex-1 flex items-center gap-3 rounded-full px-4 py-2 border ${
                  settings.taskbarStyle === 'glass-center'
                    ? 'bg-white/[0.14] border-white/[0.32] shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.38)]'
                    : settings.taskbarStyle === 'acrylic' ||
                      settings.taskbarStyle === 'transparent'
                    ? 'bg-white/[0.10] border-cyan-300/30'
                    : 'bg-[#171717] border-white/[0.1] border-b-2 border-b-[#60cdff]'
                }`}
              >
                <Search
                  size={15}
                  className={
                    settings.taskbarStyle === 'glass-center'
                      ? 'text-white/90'
                      : 'text-neutral-400'
                  }
                />
                <input
                  type="text"
                  autoFocus
                  value={startSearch}
                  onChange={(e) => setStartSearch(e.target.value)}
                  placeholder="Search for apps, settings, and documents"
                  className="w-full bg-transparent text-xs text-white placeholder:text-white/65 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  handleToggleFullScreen();
                  setIsStartOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  isFullScreen
                    ? settings.taskbarStyle === 'glass-center'
                      ? 'bg-white/[0.28] border-white/[0.5] text-white shadow-[0_4px_16px_rgba(255,255,255,0.2)]'
                      : 'bg-[#0078d4] border-[#60cdff]/50 text-white shadow-[0_0_16px_rgba(0,120,212,0.45)]'
                    : settings.taskbarStyle === 'glass-center'
                    ? 'bg-white/[0.14] hover:bg-white/[0.24] border-white/[0.32] text-white'
                    : 'bg-[#171717] hover:bg-white/[0.1] border-white/[0.12] text-neutral-200'
                }`}
                title={isFullScreen ? 'Exit Full Screen (خروج من ملء الشاشة)' : 'Full Screen (ملء الشاشة)'}
              >
                {isFullScreen ? <Minimize2 size={14} className="text-white" /> : <Maximize2 size={14} className="text-[#60cdff]" />}
                <span>{isFullScreen ? 'Exit Full Screen' : 'Full Screen'}</span>
              </button>
            </div>

            {/* Pinned Apps / All Apps / Search Results */}
            <div className="flex-1 overflow-y-auto px-8 py-2 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-xs font-semibold text-white">
                    {startSearch.trim()
                      ? 'Search results'
                      : showAllStartApps
                      ? 'All'
                      : 'Pinned'}
                  </span>
                  {!startSearch.trim() && (
                    <button
                      onClick={() => setShowAllStartApps((v) => !v)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-neutral-200 transition-colors"
                    >
                      <span>{showAllStartApps ? 'Back' : 'All'}</span>
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>

                {showAllStartApps && !startSearch.trim() ? (
                  <div className="space-y-1 px-1 max-h-[380px] overflow-y-auto pr-1">
                    {[...APP_DEFINITIONS]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((app) => {
                        const pinned = isAppPinnedToTaskbar(app.id);
                        return (
                          <div
                            key={app.id}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setTaskbarJumpList({
                                appId: app.id,
                                x: Math.min(e.clientX, window.innerWidth - 260),
                                y: Math.max(60, e.clientY - 120),
                              });
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-[6px] hover:bg-white/[0.07] transition-colors group"
                          >
                            <button
                              onClick={() => launchApp(app.id)}
                              className="flex-1 flex items-center gap-3 min-w-0 text-left"
                            >
                              <AppIconRenderer
                                appId={app.id}
                                size={24}
                                recycleHasItems={recycleBinHasItems}
                              />
                              <span className="text-xs text-white truncate">
                                {app.name}
                              </span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinAppToTaskbar(app.id);
                              }}
                              title={
                                pinned
                                  ? 'Unpin from taskbar (إلغاء التثبيت من شريط المهام)'
                                  : 'Pin to taskbar (تثبيت في شريط المهام)'
                              }
                              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-all ${
                                pinned
                                  ? 'bg-[#0078d4]/25 text-[#60cdff] border border-[#60cdff]/30'
                                  : 'opacity-0 group-hover:opacity-100 bg-white/[0.08] hover:bg-white/[0.15] text-neutral-300'
                              }`}
                            >
                              {pinned ? <PinOff size={11} /> : <Pin size={11} />}
                              <span>{pinned ? 'Unpin' : 'Pin to taskbar'}</span>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-y-3 gap-x-1">
                    {APP_DEFINITIONS.filter((app) =>
                      startSearch.trim()
                        ? app.name
                            .toLowerCase()
                            .includes(startSearch.toLowerCase()) ||
                          app.description
                            .toLowerCase()
                            .includes(startSearch.toLowerCase())
                        : [
                            'edge',
                            'thispc',
                            'store',
                            'settings',
                            'vscode',
                            'copilot',
                            'spotify',
                            'notepad',
                            'terminal',
                            'calculator',
                            'paint',
                            'photos',
                          ].includes(app.id)
                    ).map((app) => {
                      const pinned = isAppPinnedToTaskbar(app.id);
                      return (
                        <div
                          key={app.id}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTaskbarJumpList({
                              appId: app.id,
                              x: Math.min(e.clientX, window.innerWidth - 260),
                              y: Math.max(60, e.clientY - 120),
                            });
                          }}
                          className="relative group flex flex-col items-center justify-center p-2.5 rounded-[6px] hover:bg-white/[0.07] transition-all"
                        >
                          <button
                            onClick={() => launchApp(app.id)}
                            className="flex flex-col items-center justify-center w-full active:scale-95 transition-transform"
                          >
                            <AppIconRenderer
                              appId={app.id}
                              size={32}
                              recycleHasItems={recycleBinHasItems}
                            />
                            <span className="mt-1.5 text-[11px] text-neutral-200 text-center line-clamp-1 w-full">
                              {app.name}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinAppToTaskbar(app.id);
                            }}
                            title={
                              pinned
                                ? 'Unpin from taskbar (إلغاء التثبيت من شريط المهام)'
                                : 'Pin to taskbar (تثبيت في شريط المهام)'
                            }
                            className={`absolute top-1 right-1 p-1 rounded-full transition-all ${
                              pinned
                                ? 'bg-[#0078d4]/80 text-white opacity-0 group-hover:opacity-100'
                                : 'bg-black/60 hover:bg-[#0078d4] text-neutral-200 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {pinned ? <PinOff size={10} /> : <Pin size={10} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recommended Section */}
              {!showAllStartApps && !startSearch.trim() && (
                <div>
                  <div className="flex items-center justify-between mb-2.5 px-2">
                    <span className="text-xs font-semibold text-white">
                      Recommended
                    </span>
                    <button
                      onClick={() => {
                        setIsStartOpen(false);
                        launchApp('thispc');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-neutral-200 transition-colors"
                    >
                      <span>More</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 px-1">
                    {dedupeFilesList(files)
                      .filter(
                        (f) => f.type !== 'app' && f.parentId !== 'recyclebin'
                      )
                      .slice(0, 4)
                      .map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            setIsStartOpen(false);
                            openFileSystemItem(f);
                          }}
                          className="flex items-center gap-3 p-2.5 rounded-[6px] hover:bg-white/[0.06] text-left transition-colors"
                        >
                          <FileItemIconRenderer
                            type={f.type}
                            name={f.name}
                            customIconUrl={f.customIconUrl}
                            size={26}
                          />
                          <div className="min-w-0">
                            <div className="text-xs text-white truncate">
                              {f.name}
                            </div>
                            <div className="text-[10px] text-neutral-400">
                              {f.parentId === 'desktop' ? 'Recently added' : 'Documents'}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Start Menu Footer */}
            <div
              className={`relative h-14 px-8 border-t flex items-center justify-between ${
                settings.taskbarStyle === 'glass-center'
                  ? 'bg-white/[0.12] border-white/[0.24]'
                  : settings.taskbarStyle === 'acrylic' ||
                    settings.taskbarStyle === 'transparent'
                  ? 'bg-black/30 border-cyan-300/20'
                  : 'bg-[#181818]/90 border-white/[0.06]'
              }`}
            >
              <div
                onClick={() => launchApp('settings')}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded hover:bg-white/[0.06] cursor-pointer"
                title="Account Settings"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: activeAccount.avatarColor }}
                >
                  {activeAccount.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs font-medium text-neutral-200">
                  {activeAccount.name}
                </div>
              </div>

              <div className="flex items-center gap-1.5 relative">
                {/* Full Screen Toggle Button in Start Menu Footer */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFullScreen();
                    setIsStartOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer text-xs font-medium ${
                    isFullScreen
                      ? 'bg-[#0078d4] text-white'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200'
                  }`}
                  title={isFullScreen ? 'Exit Full Screen (خروج من ملء الشاشة)' : 'Full Screen (ملء الشاشة)'}
                >
                  {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} className="text-[#60cdff]" />}
                  <span>{isFullScreen ? 'Exit Full Screen' : 'ملء الشاشة'}</span>
                </button>

                {/* Authentic Windows 11 Power Button & Flyout Menu (Full Screen, Lock, Sleep, Shut down, Restart) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPowerMenuOpen((v) => !v);
                  }}
                  className={`p-2 rounded transition-colors ${
                    isPowerMenuOpen
                      ? 'bg-white/[0.14] text-white'
                      : 'hover:bg-white/[0.08] text-neutral-300'
                  }`}
                  title="Power"
                >
                  <Power size={15} />
                </button>

                {isPowerMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 bottom-11 w-48 rounded-[8px] bg-[#262626]/98 backdrop-blur-2xl border border-white/[0.14] shadow-[0_16px_40px_rgba(0,0,0,0.8)] p-1.5 text-xs text-white space-y-0.5 z-50"
                  >
                    <button
                      onClick={() => {
                        handleToggleFullScreen();
                        setIsPowerMenuOpen(false);
                        setIsStartOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] hover:bg-white/[0.08] text-left transition-colors text-[#60cdff] font-medium"
                    >
                      {isFullScreen ? (
                        <Minimize2 size={14} className="text-[#60cdff]" />
                      ) : (
                        <Maximize2 size={14} className="text-[#60cdff]" />
                      )}
                      <span>{isFullScreen ? 'Exit Full screen' : 'Full screen (ملء الشاشة)'}</span>
                    </button>
                    <div className="my-1 border-t border-white/[0.08]" />
                    <button
                      onClick={triggerLockScreen}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <Lock size={14} className="text-neutral-300" />
                      <span>Lock</span>
                    </button>
                    <button
                      onClick={triggerSleep}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <Moon size={14} className="text-neutral-300" />
                      <span>Sleep</span>
                    </button>
                    <button
                      onClick={triggerShutDown}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <Power size={14} className="text-neutral-300" />
                      <span>Shut down</span>
                    </button>
                    <button
                      onClick={triggerRestart}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[4px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <RefreshCw size={14} className="text-neutral-300" />
                      <span>Restart</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
         * 5. TASK VIEW OVERLAY (MULTITASKING)
         * ================================================================ */}
        {isTaskViewOpen && (
          <div
            onClick={() => setIsTaskViewOpen(false)}
            className="fixed inset-0 bottom-12 z-[9000] bg-black/65 backdrop-blur-xl p-10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-white">
                  Active Windows ({windows.filter((w) => w.isOpen).length})
                </h2>
                <button
                  onClick={() => setIsTaskViewOpen(false)}
                  className="px-3 py-1 rounded bg-white/[0.1] hover:bg-white/[0.18] text-xs text-white"
                >
                  Close Task View
                </button>
              </div>

              {windows.filter((w) => w.isOpen).length === 0 ? (
                <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
                  No open windows. Launch an application from the Desktop or Start Menu.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {windows
                    .filter((w) => w.isOpen)
                    .map((w) => (
                      <div
                        key={w.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTaskViewOpen(false);
                          focusWindow(w.id);
                        }}
                        className="group rounded-[8px] bg-[#202020] border border-white/[0.12] hover:border-[#60cdff] p-4 cursor-pointer transition-all shadow-xl"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <AppIconRenderer appId={w.appId} size={20} />
                            <span className="text-xs font-medium text-white truncate">
                              {w.title}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setWindows((ws) =>
                                ws.filter((item) => item.id !== w.id)
                              );
                            }}
                            className="p-1 rounded hover:bg-[#c42b1c] text-neutral-400 hover:text-white"
                          >
                            <X size={13} />
                          </button>
                        </div>
                        <div className="h-28 rounded bg-[#141414] border border-white/[0.06] flex items-center justify-center">
                          <AppIconRenderer appId={w.appId} size={42} />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <div className="px-4 py-2 rounded-md bg-white/[0.12] border border-[#60cdff] text-xs text-white font-medium">
                Desktop 1
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
         * 6. WINDOWS 11 QUICK SETTINGS FLYOUT (ANCHORED DIRECTLY ABOVE BUTTON IN GLASS DOCK & STYLED WITH REAL FROSTED GLASS)
         * ================================================================ */}
        {isQuickSettingsOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={
              settings.taskbarStyle === 'glass-center' && flyoutAnchorX
                ? {
                    left: Math.max(
                      16,
                      Math.min(flyoutAnchorX - 180, window.innerWidth - 376)
                    ),
                  }
                : undefined
            }
            className={`fixed bottom-[64px] z-[9500] w-[360px] p-5 text-white space-y-5 transition-all duration-200 ${
              settings.taskbarStyle === 'glass-center'
                ? 'rounded-[24px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_24px_60px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                : settings.taskbarStyle === 'floating'
                ? 'right-3 rounded-[16px] bg-[#1e1e24]/95 backdrop-blur-3xl border border-white/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
                : settings.taskbarStyle === 'acrylic' ||
                  settings.taskbarStyle === 'transparent'
                ? 'right-3 rounded-[14px] bg-gradient-to-br from-cyan-500/[0.16] via-slate-900/[0.62] to-indigo-950/[0.62] backdrop-blur-3xl border border-cyan-300/35 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                : settings.taskbarStyle === 'compact' ||
                  settings.taskbarStyle === 'solid'
                ? 'right-3 rounded-[4px] bg-[#111111] border border-white/[0.16] shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
                : 'right-3 rounded-[8px] bg-[#202020]/96 backdrop-blur-3xl border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
            } ${
              settings.taskbarStyle === 'glass-center' && !flyoutAnchorX
                ? 'left-1/2 -translate-x-1/2'
                : ''
            }`}
          >
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => setWifiEnabled((v) => !v)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full h-12 ${
                    settings.taskbarStyle === 'glass-center'
                      ? 'rounded-[14px]'
                      : settings.taskbarStyle === 'floating'
                      ? 'rounded-[10px]'
                      : 'rounded-[4px]'
                  } flex items-center justify-center border transition-all ${
                    wifiEnabled
                      ? settings.taskbarStyle === 'glass-center'
                        ? 'bg-white/[0.28] border-white/[0.52] text-white shadow-[0_4px_16px_rgba(255,255,255,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.55)]'
                        : 'bg-[#0078d4] border-[#60cdff]/40 text-white'
                      : settings.taskbarStyle === 'glass-center'
                      ? 'bg-white/[0.10] hover:bg-white/[0.18] border-white/[0.24] text-white/85'
                      : 'bg-white/[0.06] border-white/[0.08] text-neutral-300'
                  }`}
                >
                  <Wifi size={16} />
                </div>
                <span className="text-[11px] text-neutral-100">Wi-Fi</span>
              </button>

              <button
                onClick={() => setBtEnabled((v) => !v)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full h-12 ${
                    settings.taskbarStyle === 'glass-center'
                      ? 'rounded-[14px]'
                      : settings.taskbarStyle === 'floating'
                      ? 'rounded-[10px]'
                      : 'rounded-[4px]'
                  } flex items-center justify-center border transition-all ${
                    btEnabled
                      ? settings.taskbarStyle === 'glass-center'
                        ? 'bg-white/[0.28] border-white/[0.52] text-white shadow-[0_4px_16px_rgba(255,255,255,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.55)]'
                        : 'bg-[#0078d4] border-[#60cdff]/40 text-white'
                      : settings.taskbarStyle === 'glass-center'
                      ? 'bg-white/[0.10] hover:bg-white/[0.18] border-white/[0.24] text-white/85'
                      : 'bg-white/[0.06] border-white/[0.08] text-neutral-300'
                  }`}
                >
                  <Bluetooth size={16} />
                </div>
                <span className="text-[11px] text-neutral-100">Bluetooth</span>
              </button>

              <button
                onClick={() => handleToggleFullScreen()}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full h-12 ${
                    settings.taskbarStyle === 'glass-center'
                      ? 'rounded-[14px]'
                      : settings.taskbarStyle === 'floating'
                      ? 'rounded-[10px]'
                      : 'rounded-[4px]'
                  } flex items-center justify-center border transition-all ${
                    isFullScreen
                      ? settings.taskbarStyle === 'glass-center'
                        ? 'bg-white/[0.28] border-white/[0.52] text-white shadow-[0_4px_16px_rgba(255,255,255,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.55)]'
                        : 'bg-[#0078d4] border-[#60cdff]/40 text-white'
                      : settings.taskbarStyle === 'glass-center'
                      ? 'bg-white/[0.10] hover:bg-white/[0.18] border-white/[0.24] text-white/85'
                      : 'bg-white/[0.06] border-white/[0.08] text-neutral-300'
                  }`}
                >
                  <Maximize2 size={16} />
                </div>
                <span className="text-[11px] text-neutral-100">Full screen</span>
              </button>

              <button
                onClick={() => setNightLight((v) => !v)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full h-12 ${
                    settings.taskbarStyle === 'glass-center'
                      ? 'rounded-[14px]'
                      : settings.taskbarStyle === 'floating'
                      ? 'rounded-[10px]'
                      : 'rounded-[4px]'
                  } flex items-center justify-center border transition-all ${
                    nightLight
                      ? settings.taskbarStyle === 'glass-center'
                        ? 'bg-white/[0.28] border-white/[0.52] text-white shadow-[0_4px_16px_rgba(255,255,255,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.55)]'
                        : 'bg-[#0078d4] border-[#60cdff]/40 text-white'
                      : settings.taskbarStyle === 'glass-center'
                      ? 'bg-white/[0.10] hover:bg-white/[0.18] border-white/[0.24] text-white/85'
                      : 'bg-white/[0.06] border-white/[0.08] text-neutral-300'
                  }`}
                >
                  <Sun size={16} />
                </div>
                <span className="text-[11px] text-neutral-100">Night light</span>
              </button>

              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    theme: prev.theme === 'dark' ? 'light' : 'dark',
                    wallpaperId:
                      prev.theme === 'dark' ? 'bloom-light' : 'bloom-dark',
                  }))
                }
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full h-12 ${
                    settings.taskbarStyle === 'glass-center'
                      ? 'rounded-[14px]'
                      : settings.taskbarStyle === 'floating'
                      ? 'rounded-[10px]'
                      : 'rounded-[4px]'
                  } flex items-center justify-center border transition-all ${
                    !isLightMode
                      ? settings.taskbarStyle === 'glass-center'
                        ? 'bg-white/[0.28] border-white/[0.52] text-white shadow-[0_4px_16px_rgba(255,255,255,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.55)]'
                        : 'bg-[#0078d4] border-[#60cdff]/40 text-white'
                      : settings.taskbarStyle === 'glass-center'
                      ? 'bg-white/[0.10] hover:bg-white/[0.18] border-white/[0.24] text-white/85'
                      : 'bg-white/[0.06] border-white/[0.08] text-neutral-300'
                  }`}
                >
                  <Moon size={16} />
                </div>
                <span className="text-[11px] text-neutral-100">Dark theme</span>
              </button>

              <button
                onClick={() => {
                  setIsQuickSettingsOpen(false);
                  setIsSystemLocked(true);
                }}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`w-full h-12 ${
                    settings.taskbarStyle === 'glass-center'
                      ? 'rounded-[14px] bg-white/[0.10] hover:bg-white/[0.22] border-white/[0.24]'
                      : settings.taskbarStyle === 'floating'
                      ? 'rounded-[10px] bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08]'
                      : 'rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] border-white/[0.08]'
                  } flex items-center justify-center border text-neutral-100 transition-colors`}
                >
                  <Lock size={16} />
                </div>
                <span className="text-[11px] text-neutral-100">Lock screen</span>
              </button>
            </div>

            {/* Brightness & Volume Sliders */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <Sun size={16} className="text-neutral-200 shrink-0" />
                <input
                  type="range"
                  min={50}
                  max={120}
                  value={settings.brightness}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      brightness: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-[#60cdff] h-1 cursor-pointer"
                />
                <span className="text-[11px] text-neutral-200 w-8 text-right">
                  {settings.brightness}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const nextMuted = !settings.isMuted;
                    setSettings((prev) => ({ ...prev, isMuted: nextMuted }));
                    if (!nextMuted && settings.volume > 0) {
                      playVolumeTestPing(settings.volume);
                    }
                  }}
                  className="text-neutral-200 hover:text-white shrink-0"
                  title={settings.isMuted ? 'Unmute system audio' : 'Mute system audio'}
                >
                  {settings.isMuted || settings.volume === 0 ? (
                    <VolumeX size={16} />
                  ) : (
                    <Volume2 size={16} />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.isMuted ? 0 : settings.volume}
                  onChange={(e) => {
                    const newVol = Number(e.target.value);
                    setSettings((prev) => ({
                      ...prev,
                      volume: newVol,
                      isMuted: newVol === 0,
                    }));
                  }}
                  onMouseUp={() => {
                    if (!settings.isMuted && settings.volume > 0) {
                      playVolumeTestPing(settings.volume);
                    }
                  }}
                  className="w-full accent-[#60cdff] h-1 cursor-pointer"
                />
                <span className="text-[11px] text-neutral-200 w-8 text-right">
                  {settings.isMuted ? 0 : settings.volume}%
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.16] flex items-center justify-between text-xs text-neutral-200">
              <div className="flex items-center gap-2">
                <BatteryCharging size={15} className="text-[#60cdff]" />
                <span>98%</span>
              </div>
              <button
                onClick={() => launchApp('settings')}
                className={`px-3 py-1 rounded-lg ${
                  settings.taskbarStyle === 'glass-center'
                    ? 'bg-white/[0.16] hover:bg-white/[0.26] border border-white/[0.28]'
                    : 'bg-white/[0.06] hover:bg-white/[0.12]'
                } text-xs text-white transition-colors`}
              >
                All settings
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================
         * 7. WINDOWS 11 NOTIFICATION CENTER & CALENDAR FLYOUT (ANCHORED ABOVE CLOCK IN GLASS DOCK & FROSTED GLASS)
         * ================================================================ */}
        {isCalendarOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={
              settings.taskbarStyle === 'glass-center' && flyoutAnchorX
                ? {
                    left: Math.max(
                      16,
                      Math.min(flyoutAnchorX - 180, window.innerWidth - 376)
                    ),
                  }
                : undefined
            }
            className={`fixed bottom-[64px] z-[9500] w-[360px] max-h-[82vh] flex flex-col gap-2.5 select-none ${
              settings.taskbarStyle === 'glass-center'
                ? !flyoutAnchorX
                  ? 'left-1/2 -translate-x-1/2'
                  : ''
                : 'right-3'
            }`}
          >
            {/* 1. Windows 11 Notification Center Media Control Pop-Up Card */}
            {(() => {
              const activeMedia = liveMediaState['spotify'] || liveMediaState['mediaplayer'];
              const fallbackTrack = spotifyTracks[0];
              const isPlaying = Boolean(activeMedia?.isPlaying);
              const trackTitle = activeMedia?.title || fallbackTrack?.title || 'نور العين (Nour El Ain)';
              const trackArtist = activeMedia?.artist || fallbackTrack?.artist || 'عمرو دياب (Amr Diab)';
              const coverUrl =
                activeMedia?.coverUrl ||
                fallbackTrack?.coverUrl ||
                'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80';
              const curTime = activeMedia?.currentTime ?? 0;
              const dur = activeMedia?.duration || fallbackTrack?.duration || 179;
              const isLiked = Boolean(fallbackTrack?.isLiked);

              const formatSecs = (sec: number) => {
                const s = Math.floor(sec || 0);
                const m = Math.floor(s / 60);
                const rem = s % 60;
                return `${m}:${rem < 10 ? '0' : ''}${rem}`;
              };

              return (
                <div
                  className={`p-3.5 text-white flex flex-col gap-2.5 transition-all select-none ${
                    settings.taskbarStyle === 'glass-center'
                      ? 'rounded-[22px] bg-gradient-to-br from-white/[0.22] via-white/[0.12] to-white/[0.17] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.42] shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                      : settings.taskbarStyle === 'floating'
                      ? 'rounded-[16px] bg-[#1e1e24]/95 backdrop-blur-3xl border border-white/[0.18] shadow-[0_16px_40px_rgba(0,0,0,0.7)]'
                      : settings.taskbarStyle === 'acrylic' ||
                        settings.taskbarStyle === 'transparent'
                      ? 'rounded-[14px] bg-gradient-to-br from-emerald-500/[0.18] via-slate-900/[0.7] to-teal-950/[0.7] backdrop-blur-3xl border border-emerald-400/40 shadow-[0_16px_40px_rgba(0,0,0,0.7)]'
                      : settings.taskbarStyle === 'compact' ||
                        settings.taskbarStyle === 'solid'
                      ? 'rounded-[4px] bg-[#141414] border border-white/[0.18] shadow-[0_16px_40px_rgba(0,0,0,0.85)]'
                      : 'rounded-[12px] bg-[#222222]/95 backdrop-blur-3xl border border-white/[0.14] shadow-[0_16px_40px_rgba(0,0,0,0.7)]'
                  }`}
                >
                  {/* Card Header: App Badge & Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#1ed760] flex items-center justify-center shadow-sm">
                        <Music size={11} className="text-black stroke-[2.5]" />
                      </div>
                      <span className="text-[11px] font-semibold tracking-wide text-white">
                        Spotify
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                          isPlaying
                            ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                            : 'bg-white/10 text-neutral-300'
                        }`}
                      >
                        {isPlaying ? 'مشغل الآن 🔊' : 'جاهز للتشغيل'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setMiniChatInput('اعمل قائمة تشغيل لأغاني حلوة حقيقية');
                          setIsCopilotFlyoutOpen(true);
                        }}
                        className="px-2 py-0.5 rounded-md bg-white/[0.12] hover:bg-white/[0.22] text-[10px] text-white flex items-center gap-1 transition-colors cursor-pointer"
                        title="إنشاء قائمة بـ Copilot"
                      >
                        <Sparkles size={10} className="text-[#60cdff]" />
                        <span>قائمة Copilot</span>
                      </button>
                      <button
                        onClick={() => launchApp('spotify')}
                        className="p-1 rounded hover:bg-white/[0.16] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        title="فتح Spotify بالكامل"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Track Info & Artwork */}
                  <div className="flex items-center gap-3">
                    <img
                      src={coverUrl}
                      alt={trackTitle}
                      className="w-12 h-12 rounded-[10px] object-cover shrink-0 shadow-md border border-white/15 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => launchApp('spotify')}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        onClick={() => launchApp('spotify')}
                        className="text-xs font-semibold text-white truncate drop-shadow-sm cursor-pointer hover:underline"
                      >
                        {trackTitle}
                      </div>
                      <div className="text-[11px] text-neutral-300 truncate mt-0.5">
                        {trackArtist}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        sendTaskbarMediaCommand('spotify', 'toggleLike')
                      }
                      className="p-1.5 rounded-full hover:bg-white/[0.12] text-neutral-300 transition-colors shrink-0 cursor-pointer"
                      title={isLiked ? 'إزالة من المفضلة' : 'إعجاب'}
                    >
                      <Heart
                        size={15}
                        className={
                          isLiked ? 'text-[#1ed760] fill-current' : ''
                        }
                      />
                    </button>
                  </div>

                  {/* Timeline Scrub Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-300/80 font-mono w-7 text-right">
                        {formatSecs(curTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={dur > 0 ? dur : 180}
                        step={0.5}
                        value={Math.min(curTime, dur > 0 ? dur : 180)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          sendTaskbarMediaCommand('spotify', 'seek', {
                            time: val,
                          });
                        }}
                        className="flex-1 accent-[#1ed760] h-1 bg-white/[0.22] hover:bg-white/[0.35] rounded-lg cursor-pointer transition-all"
                      />
                      <span className="text-[10px] text-neutral-300/80 font-mono w-7">
                        {formatSecs(dur)}
                      </span>
                    </div>
                  </div>

                  {/* Transport Controls */}
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          sendTaskbarMediaCommand('spotify', 'volume', {
                            volume: settings.isMuted ? 0.8 : 0,
                          })
                        }
                        className="p-1 rounded text-neutral-300 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                        title={settings.isMuted ? 'إلغاء الكتم' : 'كتم'}
                      >
                        {settings.isMuted || settings.volume === 0 ? (
                          <VolumeX size={13} className="text-rose-400" />
                        ) : (
                          <Volume2 size={13} />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={settings.isMuted ? 0 : settings.volume}
                        onChange={(e) => {
                          const vol = parseInt(e.target.value, 10);
                          setSettings((prev) => ({
                            ...prev,
                            volume: vol,
                            isMuted: vol === 0,
                          }));
                          sendTaskbarMediaCommand('spotify', 'volume', {
                            volume: vol / 100,
                          });
                        }}
                        className="w-16 accent-[#1ed760] h-1 bg-white/[0.22] rounded-lg cursor-pointer"
                        title={`مستوى الصوت: ${settings.volume}%`}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          sendTaskbarMediaCommand('spotify', 'prev')
                        }
                        className="p-1.5 rounded-full hover:bg-white/[0.15] text-neutral-200 hover:text-white transition-colors cursor-pointer"
                        title="السابق"
                      >
                        <SkipBack size={15} />
                      </button>
                      <button
                        onClick={() =>
                          sendTaskbarMediaCommand('spotify', 'toggle')
                        }
                        className="p-2 rounded-full bg-[#1ed760] hover:bg-[#1db954] text-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                      >
                        {isPlaying ? (
                          <Pause size={16} className="fill-current" />
                        ) : (
                          <Play size={16} className="fill-current ml-0.5" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          sendTaskbarMediaCommand('spotify', 'next')
                        }
                        className="p-1.5 rounded-full hover:bg-white/[0.15] text-neutral-200 hover:text-white transition-colors cursor-pointer"
                        title="التالي"
                      >
                        <SkipForward size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Top Panel: Windows 11 Notification Center */}
            <div
              className={`p-4 text-white flex flex-col max-h-[310px] ${
                settings.taskbarStyle === 'glass-center'
                  ? 'rounded-[24px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_24px_60px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                  : settings.taskbarStyle === 'floating'
                  ? 'rounded-[16px] bg-[#1e1e24]/95 backdrop-blur-3xl border border-white/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                  : settings.taskbarStyle === 'acrylic' ||
                    settings.taskbarStyle === 'transparent'
                  ? 'rounded-[14px] bg-gradient-to-br from-cyan-500/[0.16] via-slate-900/[0.62] to-indigo-950/[0.62] backdrop-blur-3xl border border-cyan-300/35 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                  : settings.taskbarStyle === 'compact' ||
                    settings.taskbarStyle === 'solid'
                  ? 'rounded-[4px] bg-[#111111] border border-white/[0.16] shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
                  : 'rounded-[8px] bg-[#202020]/95 backdrop-blur-3xl border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.75)]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white">
                  Notifications
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => setNotifications([])}
                    className="px-2 py-1 rounded bg-white/[0.12] hover:bg-white/[0.2] text-[10px] text-neutral-100"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-200/80">
                  No new notifications
                </div>
              ) : (
                <div className="overflow-y-auto space-y-2 pr-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 flex items-start justify-between gap-2.5 border ${
                        settings.taskbarStyle === 'glass-center'
                          ? 'rounded-[14px] bg-white/[0.12] border-white/[0.26]'
                          : 'rounded-[6px] bg-[#2a2a2a]/90 border-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {n.appId ? (
                          <AppIconRenderer appId={n.appId} size={18} />
                        ) : (
                          <Bell size={15} className="text-[#60cdff] mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-neutral-200 leading-snug mt-0.5">
                            {n.message}
                          </div>
                          <div className="text-[10px] text-neutral-300/80 mt-1">
                            {n.timestamp}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.filter((item) => item.id !== n.id)
                          )
                        }
                        className="p-1 rounded hover:bg-white/[0.15] text-neutral-200 hover:text-white shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Panel: Windows 11 Date & Time Calendar */}
            <div
              className={`p-4 text-white space-y-3 ${
                settings.taskbarStyle === 'glass-center'
                  ? 'rounded-[24px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_24px_60px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                  : settings.taskbarStyle === 'floating'
                  ? 'rounded-[16px] bg-[#1e1e24]/95 backdrop-blur-3xl border border-white/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                  : settings.taskbarStyle === 'acrylic' ||
                    settings.taskbarStyle === 'transparent'
                  ? 'rounded-[14px] bg-gradient-to-br from-cyan-500/[0.16] via-slate-900/[0.62] to-indigo-950/[0.62] backdrop-blur-3xl border border-cyan-300/35 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                  : settings.taskbarStyle === 'compact' ||
                    settings.taskbarStyle === 'solid'
                  ? 'rounded-[4px] bg-[#111111] border border-white/[0.16] shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
                  : 'rounded-[8px] bg-[#202020]/95 backdrop-blur-3xl border border-white/[0.12] shadow-[0_20px_50px_rgba(0,0,0,0.75)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/85 font-medium">
                    {currentTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-2xl font-semibold text-white mt-0.5">
                    {currentTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-right text-[11px] text-neutral-200">
                  {currentTime.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Mini Monthly Days Grid */}
              <div className="pt-2 border-t border-white/[0.16]">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-neutral-200 mb-1.5">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                    const isToday = day === currentTime.getDate();
                    return (
                      <div
                        key={day}
                        className={`h-7 rounded-full flex items-center justify-center transition-colors ${
                          isToday
                            ? settings.taskbarStyle === 'glass-center'
                              ? 'bg-white/[0.32] border border-white/[0.6] text-white font-semibold shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                              : 'bg-[#0078d4] text-white font-semibold'
                            : 'text-neutral-100 hover:bg-white/[0.14]'
                        }`}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================
         * 7A. AUTHENTIC WINDOWS 11 KEYBOARD LAYOUT FLYOUT (ANCHORED ABOVE BUTTON IN GLASS DOCK)
         * ================================================================ */}
        {isKeyboardFlyoutOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={
              settings.taskbarStyle === 'glass-center' && flyoutAnchorX
                ? {
                    left: Math.max(
                      16,
                      Math.min(flyoutAnchorX - 130, window.innerWidth - 276)
                    ),
                  }
                : undefined
            }
            className={`fixed bottom-[64px] z-[9500] w-[260px] p-1.5 text-white space-y-1 select-none ${
              settings.taskbarStyle === 'glass-center'
                ? 'rounded-[20px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_24px_55px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                : settings.taskbarStyle === 'floating'
                ? 'right-16 rounded-[14px] bg-[#1e1e24]/95 backdrop-blur-3xl border border-white/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
                : settings.taskbarStyle === 'acrylic' ||
                  settings.taskbarStyle === 'transparent'
                ? 'right-16 rounded-[12px] bg-gradient-to-br from-cyan-500/[0.16] via-slate-900/[0.62] to-indigo-950/[0.62] backdrop-blur-3xl border border-cyan-300/35 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                : settings.taskbarStyle === 'compact' ||
                  settings.taskbarStyle === 'solid'
                ? 'right-16 rounded-[4px] bg-[#111111] border border-white/[0.16] shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
                : 'right-16 rounded-[8px] bg-[#202020]/96 backdrop-blur-3xl border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
            } ${
              settings.taskbarStyle === 'glass-center' && !flyoutAnchorX
                ? 'left-1/2 -translate-x-1/2'
                : ''
            }`}
          >
            <button
              onClick={() => {
                setKeyboardLang('ENG');
                setKeyboardInfo((prev) => ({
                  ...prev,
                  detectedScript: 'English (US) QWERTY',
                }));
                setIsKeyboardFlyoutOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors ${
                keyboardLang === 'ENG'
                  ? 'bg-white/[0.18] text-white'
                  : 'text-neutral-200 hover:bg-white/[0.1]'
              }`}
            >
              <span className="text-xs font-semibold w-8 text-sky-200">ENG</span>
              <div>
                <div className="text-xs font-medium">English (United States)</div>
                <div className="text-[10px] text-neutral-300">US QWERTY</div>
              </div>
            </button>

            <button
              onClick={() => {
                setKeyboardLang('ARA');
                setKeyboardInfo((prev) => ({
                  ...prev,
                  detectedScript: 'العربية (Arabic 101)',
                }));
                setIsKeyboardFlyoutOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left transition-colors ${
                keyboardLang === 'ARA'
                  ? 'bg-white/[0.18] text-white'
                  : 'text-neutral-200 hover:bg-white/[0.1]'
              }`}
            >
              <span className="text-xs font-semibold w-8 text-sky-200">ARA</span>
              <div>
                <div className="text-xs font-medium">العربية (مصر)</div>
                <div className="text-[10px] text-neutral-300">Arabic (101)</div>
              </div>
            </button>

            <div className="pt-1 mt-1 border-t border-white/[0.16] px-3 py-1.5 flex items-center justify-between text-[10px] text-neutral-200">
              <span>Switch input methods</span>
              <span className="font-mono">Alt + Shift</span>
            </div>
          </div>
        )}

        {/* ==================================================================
         * 7A-2. COMPACT COPILOT MINI-CHAT FLYOUT (OPENS LIKE CALENDAR ABOVE TASKBAR BUTTON)
         * ================================================================ */}
        {isCopilotFlyoutOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={
              settings.taskbarStyle === 'glass-center' && flyoutAnchorX
                ? {
                    left: Math.max(
                      16,
                      Math.min(flyoutAnchorX - 175, window.innerWidth - 366)
                    ),
                  }
                : undefined
            }
            className={`fixed bottom-[64px] z-[9500] w-[350px] h-[435px] max-h-[78vh] flex flex-col overflow-hidden text-white select-none transition-all duration-200 ${
              settings.taskbarStyle === 'glass-center'
                ? 'rounded-[24px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_24px_60px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                : settings.taskbarStyle === 'floating'
                ? 'right-3 rounded-[16px] bg-[#1e1e24]/95 backdrop-blur-3xl border border-white/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
                : settings.taskbarStyle === 'acrylic' ||
                  settings.taskbarStyle === 'transparent'
                ? 'right-3 rounded-[14px] bg-gradient-to-br from-cyan-500/[0.16] via-slate-900/[0.62] to-indigo-950/[0.62] backdrop-blur-3xl border border-cyan-300/35 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                : settings.taskbarStyle === 'compact' ||
                  settings.taskbarStyle === 'solid'
                ? 'right-3 rounded-[4px] bg-[#111111] border border-white/[0.16] shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
                : 'right-3 rounded-[10px] bg-[#202020]/96 backdrop-blur-3xl border border-white/[0.14] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
            } ${
              settings.taskbarStyle === 'glass-center' && !flyoutAnchorX
                ? 'left-1/2 -translate-x-1/2'
                : ''
            }`}
          >
            {/* Mini Chat Header */}
            {miniCopilotView === 'settings' ? (
              <div className="px-4 py-3 border-b border-white/[0.16] flex items-center justify-between shrink-0 bg-white/[0.04]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMiniCopilotView('chat')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.14] hover:bg-white/[0.24] text-white text-xs font-semibold cursor-pointer transition-colors"
                    title="العودة للمحادثة"
                  >
                    <ArrowLeft size={14} />
                    <span>العودة للشات</span>
                  </button>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Settings size={14} className="text-[#60cdff]" />
                    <span>إعدادات Copilot الشاملة</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCopilotFlyoutOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.16] text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border-b border-white/[0.16] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <AppIconRenderer appId="copilot" size={18} />
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>Copilot Quick Chat</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border transition-colors ${
                          settings.copilotConfig?.aiMode === 'plan'
                            ? 'bg-violet-500/25 border-violet-400/50 text-violet-200'
                            : 'bg-blue-500/25 border-blue-400/50 text-blue-200'
                        }`}
                      >
                        {settings.copilotConfig?.aiMode === 'plan' ? 'Plan' : 'Default'}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/70">
                      مساعد سريع مصغّر لنظام Windows 11
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {miniChatMessages.length > 0 && (
                    <button
                      onClick={() => {
                        const allText = miniChatMessages
                          .map((m) => `${m.role === 'user' ? 'أنت' : 'Copilot'}: ${m.text}`)
                          .join('\n\n');
                        handleCopyMiniChatText(allText, 'mini-copy-all');
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/[0.16] text-white/80 hover:text-white transition-colors cursor-pointer"
                      title="نسخ المحادثة بالكامل"
                    >
                      {miniChatCopiedId === 'mini-copy-all' ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setMiniCopilotView('settings')}
                    className="p-1.5 rounded-lg hover:bg-white/[0.16] text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="فتح إعدادات Copilot ووضع التخطيط ومسار الملفات"
                  >
                    <Settings size={14} className="text-white hover:text-[#60cdff]" />
                  </button>
                  <button
                    onClick={() => {
                      setIsCopilotFlyoutOpen(false);
                      launchApp('copilot');
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.16] text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="فتح تطبيق Copilot الكامل"
                  >
                    <ExternalLink size={13} />
                  </button>
                  <button
                    onClick={() => setIsCopilotFlyoutOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.16] text-white/80 hover:text-white transition-colors cursor-pointer"
                    title="إغلاق"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* View Switch: Full Settings Screen OR Chat Screen */}
            {miniCopilotView === 'settings' ? (
              <div
                dir="rtl"
                className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-white no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* 1. Operation Modes (Plan Mode vs Default Mode) */}
                <div className="p-3 rounded-xl bg-white/[0.08] border border-white/[0.14] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-[12px]">
                    <Layers size={14} className="text-[#60cdff]" />
                    <span>أوضاع التشغيل (Operation Modes)</span>
                  </div>
                  <p className="text-[10.5px] text-white/70 leading-relaxed">
                    حدد أسلوب استجابة Copilot عند طلب تعديل أي تطبيق أو بناء مشروع جديد:
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          copilotConfig: {
                            ...(prev.copilotConfig || {}),
                            assistantName: prev.copilotConfig?.assistantName || 'Windows Copilot',
                            subtitle: prev.copilotConfig?.subtitle || 'Windows 11 AI Assistant',
                            welcomeMessage: prev.copilotConfig?.welcomeMessage || '',
                            accentColor: prev.copilotConfig?.accentColor || '#0078d4',
                            chatBgColor: prev.copilotConfig?.chatBgColor || '#FFFFFF',
                            userBubbleColor: prev.copilotConfig?.userBubbleColor || '#0078d4',
                            aiBubbleColor: prev.copilotConfig?.aiBubbleColor || '#f8fafc',
                            fontScale: prev.copilotConfig?.fontScale || 'normal',
                            aiMode: 'default',
                          },
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-right transition-all cursor-pointer ${
                        settings.copilotConfig?.aiMode !== 'plan'
                          ? 'bg-[#0078d4]/35 border-[#60cdff] shadow-[0_0_12px_rgba(0,120,212,0.4)]'
                          : 'bg-white/[0.04] border-white/[0.1] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Hammer size={13} className="text-[#60cdff]" />
                        <span>Default Mode (الوضع الافتراضي)</span>
                      </div>
                      <div className="text-[10px] text-white/60 mt-1">تنفيذ فوري مباشر دون خطوات مسبقة</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          copilotConfig: {
                            ...(prev.copilotConfig || {}),
                            assistantName: prev.copilotConfig?.assistantName || 'Windows Copilot',
                            subtitle: prev.copilotConfig?.subtitle || 'Windows 11 AI Assistant',
                            welcomeMessage: prev.copilotConfig?.welcomeMessage || '',
                            accentColor: prev.copilotConfig?.accentColor || '#0078d4',
                            chatBgColor: prev.copilotConfig?.chatBgColor || '#FFFFFF',
                            userBubbleColor: prev.copilotConfig?.userBubbleColor || '#0078d4',
                            aiBubbleColor: prev.copilotConfig?.aiBubbleColor || '#f8fafc',
                            fontScale: prev.copilotConfig?.fontScale || 'normal',
                            aiMode: 'plan',
                          },
                        }))
                      }
                      className={`p-2.5 rounded-lg border text-right transition-all cursor-pointer ${
                        settings.copilotConfig?.aiMode === 'plan'
                          ? 'bg-violet-600/35 border-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                          : 'bg-white/[0.04] border-white/[0.1] hover:bg-white/[0.08]'
                      }`}
                    >
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <FileText size={13} className="text-violet-300" />
                        <span>Plan Mode (وضع التخطيط)</span>
                      </div>
                      <div className="text-[10px] text-white/60 mt-1">خطة عمل منظمة تتطلب موافقتك قبل التنفيذ</div>
                    </button>
                  </div>
                </div>

                {/* 2. Target File Storage Location (مسار حفظ الملفات) */}
                <div className="p-3 rounded-xl bg-white/[0.08] border border-white/[0.14] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-white text-[12px]">
                    <Folder size={14} className="text-[#60cdff]" />
                    <span>مكان حفظ الملفات والمشاريع المنشأة</span>
                  </div>
                  <p className="text-[10.5px] text-white/70 leading-relaxed">
                    اختر المكان الذي سيضع فيه Copilot الملفات والمشاريع المنشأة:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {[
                      { id: 'desktop', label: 'سطح المكتب (Desktop)', desc: 'Desktop' },
                      { id: 'documents', label: 'المستندات (Documents)', desc: 'Documents' },
                      { id: 'downloads', label: 'التنزيلات (Downloads)', desc: 'Downloads' },
                      { id: 'c-drive', label: 'محرك الأقراص C: (This PC)', desc: 'This PC' },
                    ].map((loc) => {
                      const isSelected =
                        (settings.copilotConfig?.outputDirectory || 'desktop') === loc.id;
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() =>
                            setSettings((prev) => ({
                              ...prev,
                              copilotConfig: {
                                ...(prev.copilotConfig || {}),
                                assistantName: prev.copilotConfig?.assistantName || 'Windows Copilot',
                                subtitle: prev.copilotConfig?.subtitle || 'Windows 11 AI Assistant',
                                welcomeMessage: prev.copilotConfig?.welcomeMessage || '',
                                accentColor: prev.copilotConfig?.accentColor || '#0078d4',
                                chatBgColor: prev.copilotConfig?.chatBgColor || '#FFFFFF',
                                userBubbleColor: prev.copilotConfig?.userBubbleColor || '#0078d4',
                                aiBubbleColor: prev.copilotConfig?.aiBubbleColor || '#f8fafc',
                                fontScale: prev.copilotConfig?.fontScale || 'normal',
                                outputDirectory: loc.id,
                              },
                            }))
                          }
                          className={`p-2 rounded-lg border text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/[0.22] border-white/50 text-white font-bold'
                              : 'bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="text-xs">{loc.label}</div>
                          <div className="text-[9px] text-white/50">{loc.desc}</div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Directory Input */}
                  <div className="pt-1.5">
                    <label className="text-[10.5px] text-white/70 block mb-1">
                      أو اكتب مساراً أو اسم مجلد مخصص:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={miniCustomFolder}
                        onChange={(e) => setMiniCustomFolder(e.target.value)}
                        placeholder="مثال: MyApps أو Projects..."
                        className="flex-1 bg-black/40 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#60cdff]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (miniCustomFolder.trim()) {
                            setSettings((prev) => ({
                              ...prev,
                              copilotConfig: {
                                ...(prev.copilotConfig || {}),
                                assistantName: prev.copilotConfig?.assistantName || 'Windows Copilot',
                                subtitle: prev.copilotConfig?.subtitle || 'Windows 11 AI Assistant',
                                welcomeMessage: prev.copilotConfig?.welcomeMessage || '',
                                accentColor: prev.copilotConfig?.accentColor || '#0078d4',
                                chatBgColor: prev.copilotConfig?.chatBgColor || '#FFFFFF',
                                userBubbleColor: prev.copilotConfig?.userBubbleColor || '#0078d4',
                                aiBubbleColor: prev.copilotConfig?.aiBubbleColor || '#f8fafc',
                                fontScale: prev.copilotConfig?.fontScale || 'normal',
                                outputDirectory: miniCustomFolder.trim(),
                              },
                            }));
                          }
                        }}
                        disabled={!miniCustomFolder.trim()}
                        className="px-3 py-1.5 rounded-lg bg-[#0078d4] hover:bg-[#0284c7] disabled:opacity-40 text-xs font-semibold text-white transition-colors cursor-pointer"
                      >
                        حفظ
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Generation Preferences */}
                <div className="p-3 rounded-xl bg-white/[0.08] border border-white/[0.14] space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-white text-[12px]">
                    <Sparkles size={14} className="text-violet-300" />
                    <span>تفضيلات الذكاء الاصطناعي</span>
                  </div>
                  <label className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] cursor-pointer">
                    <span className="text-[11px] text-white/90">
                      منع الإيموجيز والرموز في المواقع المنشأة
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.copilotConfig?.noEmojisInWebsites !== false}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          copilotConfig: {
                            ...(prev.copilotConfig || {}),
                            assistantName: prev.copilotConfig?.assistantName || 'Windows Copilot',
                            subtitle: prev.copilotConfig?.subtitle || 'Windows 11 AI Assistant',
                            welcomeMessage: prev.copilotConfig?.welcomeMessage || '',
                            accentColor: prev.copilotConfig?.accentColor || '#0078d4',
                            chatBgColor: prev.copilotConfig?.chatBgColor || '#FFFFFF',
                            userBubbleColor: prev.copilotConfig?.userBubbleColor || '#0078d4',
                            aiBubbleColor: prev.copilotConfig?.aiBubbleColor || '#f8fafc',
                            fontScale: prev.copilotConfig?.fontScale || 'normal',
                            noEmojisInWebsites: e.target.checked,
                          },
                        }))
                      }
                      className="rounded accent-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>

                {/* 4. Chat Session Management & Memory */}
                <div className="p-3 rounded-xl bg-white/[0.08] border border-white/[0.14] space-y-2.5">
                  <div className="flex items-center justify-between font-bold text-white text-[12px]">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={14} className="text-emerald-400" />
                      <span>إدارة المحادثة والذاكرة</span>
                    </div>
                    <span className="text-[10px] text-white/60 font-mono">1,000,000 سياق</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMiniChatMessages([
                        {
                          id: `welcome-${Date.now()}`,
                          role: 'assistant',
                          text: 'أهلاً بك! تم بدء محادثة جديدة وتصفير الجلسة السابقة بنجاح. كيف يمكنني مساعدتك الآن؟',
                        },
                      ]);
                      setMiniCopilotView('chat');
                    }}
                    className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <Plus size={14} />
                    <span>محادثة جديدة ومسح الرسائل الحالية</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Dynamic Smart Topic-Aware Prompt Suggestions */}
                <div className="px-3.5 py-2 border-b border-white/[0.10] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-violet-300 shrink-0 bg-violet-500/20 px-2 py-0.5 rounded-md border border-violet-400/30">
                    <Sparkles size={11} className="text-violet-300" />
                    <span>أفكار:</span>
                  </span>
                  {miniSmartSuggestions.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMiniCopilot(chip)}
                      className={`px-2.5 py-1 rounded-full text-[10px] whitespace-nowrap border transition-all cursor-pointer ${
                        settings.taskbarStyle === 'glass-center'
                          ? 'bg-white/[0.12] hover:bg-white/[0.24] border-white/[0.28] text-white'
                          : 'bg-white/[0.06] hover:bg-white/[0.14] border-white/[0.10] text-neutral-200'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleRefreshMiniSuggestions}
                    className="p-1 rounded-full bg-white/[0.08] hover:bg-white/[0.2] border border-white/[0.14] text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="توليد أفكار جديدة بالذكاء الاصطناعي"
                  >
                    <Sparkles size={11} />
                  </button>
                </div>

                {/* Scrollable Messages Area */}
                <div
                  ref={miniChatScrollRef}
                  className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs no-scrollbar"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {miniChatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[88%] px-3 py-2 leading-relaxed ${
                          msg.role === 'user'
                            ? settings.taskbarStyle === 'glass-center'
                              ? 'rounded-2xl rounded-br-sm bg-white/[0.28] border border-white/[0.45] text-white shadow-[0_4px_14px_rgba(255,255,255,0.14)]'
                              : 'rounded-2xl rounded-br-sm bg-[#0078d4] text-white'
                            : settings.taskbarStyle === 'glass-center'
                            ? 'rounded-2xl rounded-bl-sm bg-white/[0.12] border border-white/[0.24] text-white/95'
                            : 'rounded-2xl rounded-bl-sm bg-white/[0.08] border border-white/[0.10] text-neutral-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div dir="auto" className="flex-1 whitespace-pre-line">
                            {msg.text}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyMiniChatText(msg.text, `mini-msg-${msg.id}`)
                            }
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0 transition-all cursor-pointer border ${
                              miniChatCopiedId === `mini-msg-${msg.id}`
                                ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
                                : msg.role === 'user'
                                ? 'bg-black/20 hover:bg-black/35 border-white/25 text-white/90 hover:text-white'
                                : 'bg-white/[0.08] hover:bg-white/[0.18] border-white/[0.14] text-white/80 hover:text-white'
                            }`}
                            title="نسخ الرسالة"
                          >
                            {miniChatCopiedId === `mini-msg-${msg.id}` ? (
                              <>
                                <Check size={10} className="text-emerald-300" />
                                <span>تم</span>
                              </>
                            ) : (
                              <>
                                <Copy size={10} />
                                <span>نسخ</span>
                              </>
                            )}
                          </button>
                        </div>

                        {msg.imageUrl && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-white/20 bg-black/40">
                            <img
                              src={msg.imageUrl}
                              alt={msg.imageTitle || 'AI Generated'}
                              className="w-full aspect-video object-cover"
                            />
                            <div className="p-1.5 flex items-center justify-between gap-1 bg-black/60 text-[10px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setMiniChatInput(`عدل الصورة (${msg.imageTitle || 'السابقة'}): `)
                                }
                                className="px-2 py-0.5 rounded bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 cursor-pointer"
                              >
                                تعديل بالأوامر
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSettings((prev) => ({
                                    ...prev,
                                    customWallpaperUrl: msg.imageUrl,
                                    liveWallpaperId: 'none',
                                  }));
                                }}
                                className="px-2 py-0.5 rounded bg-[#0078d4] hover:bg-[#0284c7] text-white cursor-pointer"
                              >
                                تعيين كخلفية
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {msg.badge && (
                        <span className="mt-1 px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/35 text-[9px] text-emerald-200">
                          ✓ {msg.badge}
                        </span>
                      )}
                    </div>
                  ))}

                  {isMiniChatLoading && (
                    <div className="flex items-center gap-2 text-[11px] text-white/75 px-2 py-1">
                      <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                      <span>يفكر Copilot...</span>
                    </div>
                  )}
                </div>

                {/* Bottom Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMiniCopilot();
                  }}
                  className="p-2.5 border-t border-white/[0.14] flex items-center gap-1.5 shrink-0"
                >
                  <textarea
                    dir="auto"
                    rows={1}
                    value={miniChatInput}
                    onInput={(e) => {
                      const target = e.currentTarget;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
                    }}
                    onChange={(e) => {
                      setMiniChatInput(e.target.value);
                      const target = e.currentTarget;
                      target.style.height = 'auto';
                      target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (miniChatInput.trim() && !isMiniChatLoading) {
                          handleSendMiniCopilot();
                          e.currentTarget.style.height = 'auto';
                        }
                      }
                    }}
                    placeholder="اكتب طلبك أو اغنية تريدها لـ Copilot... (Enter للإرسال)"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    className={`flex-1 px-3.5 py-2 text-xs text-white placeholder:text-white/60 focus:outline-none border resize-none max-h-36 no-scrollbar leading-relaxed transition-[height] duration-75 ${
                      settings.taskbarStyle === 'glass-center'
                        ? 'rounded-2xl bg-white/[0.14] border-white/[0.32] focus:border-white/[0.55]'
                        : 'rounded-2xl bg-black/40 border-white/[0.14] focus:border-[#60cdff]'
                    }`}
                  />

                  {/* Gemini Studio Style Default & Plan Mode Switcher */}
                  <div className="inline-flex p-0.5 rounded-lg bg-black/40 border border-white/10 shrink-0 select-none">
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          copilotConfig: {
                            ...(prev.copilotConfig || {}),
                            assistantName: prev.copilotConfig?.assistantName || 'Windows Copilot',
                            subtitle: prev.copilotConfig?.subtitle || 'Windows 11 AI Assistant',
                            welcomeMessage: prev.copilotConfig?.welcomeMessage || '',
                            accentColor: prev.copilotConfig?.accentColor || '#0078d4',
                            chatBgColor: prev.copilotConfig?.chatBgColor || '#FFFFFF',
                            userBubbleColor: prev.copilotConfig?.userBubbleColor || '#0078d4',
                            aiBubbleColor: prev.copilotConfig?.aiBubbleColor || '#f8fafc',
                            fontScale: prev.copilotConfig?.fontScale || 'normal',
                            aiMode: 'default',
                          },
                        }))
                      }
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        settings.copilotConfig?.aiMode !== 'plan'
                          ? 'bg-[#0078d4] text-white shadow-xs'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="الوضع الافتراضي (Default Mode)"
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          copilotConfig: {
                            ...(prev.copilotConfig || {}),
                            assistantName: prev.copilotConfig?.assistantName || 'Windows Copilot',
                            subtitle: prev.copilotConfig?.subtitle || 'Windows 11 AI Assistant',
                            welcomeMessage: prev.copilotConfig?.welcomeMessage || '',
                            accentColor: prev.copilotConfig?.accentColor || '#0078d4',
                            chatBgColor: prev.copilotConfig?.chatBgColor || '#FFFFFF',
                            userBubbleColor: prev.copilotConfig?.userBubbleColor || '#0078d4',
                            aiBubbleColor: prev.copilotConfig?.aiBubbleColor || '#f8fafc',
                            fontScale: prev.copilotConfig?.fontScale || 'normal',
                            aiMode: 'plan',
                          },
                        }))
                      }
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        settings.copilotConfig?.aiMode === 'plan'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="وضع التخطيط (Plan Mode)"
                    >
                      Plan
                    </button>
                  </div>

                  {isMiniChatLoading ? (
                    <button
                      type="button"
                      onClick={handleCancelMiniCopilot}
                      className="px-3 h-8 rounded-full bg-rose-600 hover:bg-rose-500 border border-rose-300/60 text-white text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_12px_rgba(225,29,72,0.5)] shrink-0"
                      title="إلغاء الرد"
                    >
                      <Square size={10} className="fill-current" />
                      <span>إلغاء</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!miniChatInput.trim()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shrink-0 ${
                        settings.taskbarStyle === 'glass-center'
                          ? 'bg-white/[0.28] hover:bg-white/[0.4] border border-white/[0.45] text-white'
                          : 'bg-[#0078d4] hover:bg-[#106ebe] text-white'
                      }`}
                      title="إرسال"
                    >
                      <Send size={13} />
                    </button>
                  )}
                </form>
              </>
            )}
          </div>
        )}

        {/* ==================================================================
         * 7B. WINDOWS 11 POPUP TOAST NOTIFICATIONS (BOTTOM RIGHT)
         * ================================================================ */}
        {toastNotifications.length > 0 && (
          <div className="fixed right-3 bottom-[58px] z-[9600] flex flex-col gap-2 w-[340px] pointer-events-auto">
            {toastNotifications.map((toast) => (
              <div
                key={toast.id}
                className="p-3.5 rounded-[8px] bg-[#242424]/95 backdrop-blur-2xl border border-white/[0.15] shadow-[0_16px_40px_rgba(0,0,0,0.75)] text-white flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {toast.appId ? (
                    <AppIconRenderer appId={toast.appId} size={20} />
                  ) : (
                    <Bell size={16} className="text-[#60cdff] mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {toast.title}
                    </div>
                    <div className="text-[11px] text-neutral-300 mt-0.5 line-clamp-2">
                      {toast.message}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setToastNotifications((prev) =>
                      prev.filter((t) => t.id !== toast.id)
                    )
                  }
                  className="p-1 rounded hover:bg-white/[0.1] text-neutral-400 hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ====================================================================
       * 8A. WINDOWS 11 TASKBAR HOVER PREVIEW FLYOUT (WITH MULTI-WINDOW THUMBNAILS & LIVE MEDIA CONTROLS)
       * ================================================================== */}
      {hoveredTaskbarApp &&
        !taskbarJumpList &&
        !isPreviewMode &&
        !isSystemLocked &&
        powerState === 'on' &&
        (() => {
          const { appId, rectLeft } = hoveredTaskbarApp;
          const appDef = APP_DEFINITIONS.find((a) => a.id === appId);
          const appWindows = windows.filter(
            (w) => w.appId === appId && w.isOpen
          );
          if (appWindows.length === 0) return null;

          const isMediaApp = appId === 'spotify' || appId === 'mediaplayer';
          const mediaInfo = isMediaApp ? liveMediaState[appId] : null;
          const clampedLeft = Math.max(
            16,
            Math.min(
              rectLeft,
              window.innerWidth - (appWindows.length > 1 ? 380 : 230)
            )
          );

          return (
            <div
              onMouseEnter={() => {
                if (hoverTimeoutRef.current) {
                  window.clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
              }}
              onMouseLeave={() => {
                hoverTimeoutRef.current = window.setTimeout(() => {
                  setHoveredTaskbarApp(null);
                }, 180);
              }}
              style={{ left: clampedLeft }}
              className={`fixed bottom-[64px] z-[9900] -translate-x-1/2 p-2.5 text-white select-none transition-all duration-150 ${
                settings.taskbarStyle === 'glass-center'
                  ? 'rounded-[22px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_24px_60px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                  : settings.taskbarStyle === 'floating'
                  ? 'rounded-[14px] bg-[#1e1e24]/95 backdrop-blur-3xl border border-white/[0.18] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
                  : settings.taskbarStyle === 'acrylic' ||
                    settings.taskbarStyle === 'transparent'
                  ? 'rounded-[14px] bg-gradient-to-br from-cyan-500/[0.16] via-slate-900/[0.62] to-indigo-950/[0.62] backdrop-blur-3xl border border-cyan-300/35 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
                  : settings.taskbarStyle === 'compact' ||
                    settings.taskbarStyle === 'solid'
                  ? 'rounded-[4px] bg-[#111111] border border-white/[0.16] shadow-[0_20px_50px_rgba(0,0,0,0.9)]'
                  : 'rounded-[10px] bg-[#202020]/96 backdrop-blur-3xl border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
              }`}
            >
              {/* Multi-window or Single-window Live Thumbnail Cards */}
              <div className="flex items-stretch gap-2.5 max-w-[88vw] overflow-x-auto">
                {appWindows.map((win) => {
                  const isWinActive =
                    activeWindowId === win.id && !win.isMinimized;
                  const linkedFile = win.fileId
                    ? files.find((f) => f.id === win.fileId)
                    : undefined;

                  return (
                    <div
                      key={win.id}
                      onClick={() => {
                        focusWindow(win.id);
                        setHoveredTaskbarApp(null);
                      }}
                      className={`w-[215px] p-2 cursor-pointer transition-all border flex flex-col justify-between ${
                        settings.taskbarStyle === 'glass-center'
                          ? isWinActive
                            ? 'rounded-[14px] bg-white/[0.22] border-white/[0.48] shadow-[0_0_16px_rgba(255,255,255,0.2)]'
                            : 'rounded-[14px] bg-white/[0.10] hover:bg-white/[0.18] border-white/[0.24]'
                          : isWinActive
                          ? 'rounded-[7px] bg-white/[0.1] border-[#60cdff]/60 shadow-[0_0_16px_rgba(96,205,255,0.2)]'
                          : 'rounded-[7px] bg-[#181818]/90 hover:bg-white/[0.08] border-white/[0.08]'
                      }`}
                    >
                      {/* Thumbnail Header: App Icon, Window Title & Direct Close Button */}
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <AppIconRenderer appId={appId} size={14} />
                          <span className="text-[11px] font-medium text-neutral-100 truncate">
                            {win.title || appDef?.name}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWindows((ws) =>
                              ws.filter((w) => w.id !== win.id)
                            );
                            if (appWindows.length <= 1) {
                              setHoveredTaskbarApp(null);
                            }
                          }}
                          className="p-1 rounded hover:bg-[#c42b1c] text-neutral-300 hover:text-white transition-colors shrink-0"
                          title="Close window (إغلاق النافذة)"
                        >
                          <X size={11} />
                        </button>
                      </div>

                      {/* Thumbnail Live Content Miniature View */}
                      <div
                        className={`relative h-[108px] overflow-hidden flex flex-col justify-between p-2.5 border ${
                          settings.taskbarStyle === 'glass-center'
                            ? 'rounded-[10px] bg-white/[0.12] border-white/[0.22]'
                            : 'rounded-[5px] bg-[#121212] border-white/[0.07]'
                        }`}
                      >
                        {isMediaApp && mediaInfo ? (
                          <div className="flex items-center gap-2.5 h-full">
                            {mediaInfo.coverUrl &&
                            !mediaInfo.coverUrl.startsWith('linear-gradient') ? (
                              <img
                                src={mediaInfo.coverUrl}
                                alt={mediaInfo.title}
                                className="w-14 h-14 rounded-[6px] object-cover border border-white/10 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-[6px] bg-gradient-to-br from-emerald-500/30 to-sky-500/30 border border-white/10 flex items-center justify-center shrink-0">
                                <Music size={22} className="text-[#60cdff]" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-semibold text-white truncate">
                                {mediaInfo.title}
                              </div>
                              <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                                {mediaInfo.artist}
                              </div>
                              <div className="mt-2 flex items-center gap-1.5">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    mediaInfo.isPlaying
                                      ? 'bg-emerald-400 animate-pulse'
                                      : 'bg-neutral-500'
                                  }`}
                                />
                                <span className="text-[9px] text-neutral-300">
                                  {mediaInfo.isPlaying ? 'Playing now' : 'Paused'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : linkedFile && linkedFile.type === 'image' && linkedFile.imageUrl ? (
                          <img
                            src={linkedFile.imageUrl}
                            alt={linkedFile.name}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : linkedFile && linkedFile.content ? (
                          <div className="flex flex-col h-full justify-between">
                            <div className="text-[9px] font-mono text-neutral-400 line-clamp-4 leading-relaxed bg-black/40 p-1.5 rounded border border-white/[0.04]">
                              {linkedFile.content
                                .replace(/<[^>]+>/g, ' ')
                                .slice(0, 140) || linkedFile.name}
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-[#60cdff]">
                              <span className="truncate">{linkedFile.name}</span>
                              <span>Live</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center gap-1.5">
                            <AppIconRenderer
                              appId={appId}
                              size={34}
                              recycleHasItems={recycleBinHasItems}
                            />
                            <span className="text-[10px] text-neutral-400 truncate max-w-full">
                              {win.isMinimized
                                ? 'Minimized in background (في الخلفية)'
                                : isWinActive
                                ? 'Active Window (نشط الآن)'
                                : 'Open Window (مفتوح)'}
                            </span>
                          </div>
                        )}

                        {/* Status Badge in Corner */}
                        <div className="absolute top-1.5 right-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-medium ${
                              win.isMinimized
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isWinActive
                                ? 'bg-[#0078d4]/30 text-[#60cdff] border border-[#60cdff]/40'
                                : 'bg-white/[0.08] text-neutral-300'
                            }`}
                          >
                            {win.isMinimized
                              ? 'Minimized'
                              : isWinActive
                              ? 'Active'
                              : 'Open'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Interactive Media Transport Controls Bar (For Spotify & Media Player) */}
              {isMediaApp && mediaInfo && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 pt-2 border-t border-white/[0.1] flex items-center justify-between px-2"
                >
                  <span className="text-[10px] text-neutral-400 truncate max-w-[95px]">
                    {mediaInfo.isPlaying ? '🔊 Playing' : '⏸ Paused'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        sendTaskbarMediaCommand(
                          appId as 'spotify' | 'mediaplayer',
                          'prev'
                        )
                      }
                      className="p-1.5 rounded-full hover:bg-white/[0.12] text-neutral-200 hover:text-white transition-colors"
                      title="Previous track (السابق)"
                    >
                      <SkipBack size={13} />
                    </button>
                    <button
                      onClick={() =>
                        sendTaskbarMediaCommand(
                          appId as 'spotify' | 'mediaplayer',
                          'toggle'
                        )
                      }
                      className="p-1.5 rounded-full bg-[#0078d4] hover:bg-[#106ebe] text-white shadow transition-colors"
                      title={
                        mediaInfo.isPlaying
                          ? 'Pause (إيقاف مؤقت)'
                          : 'Play (تشغيل)'
                      }
                    >
                      {mediaInfo.isPlaying ? (
                        <Pause size={13} />
                      ) : (
                        <Play size={13} />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        sendTaskbarMediaCommand(
                          appId as 'spotify' | 'mediaplayer',
                          'next'
                        )
                      }
                      className="p-1.5 rounded-full hover:bg-white/[0.12] text-neutral-200 hover:text-white transition-colors"
                      title="Next track (تخطي)"
                    >
                      <SkipForward size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* ====================================================================
       * 8B. WINDOWS 11 TASKBAR JUMP LIST (RIGHT-CLICK MENU ON APP ICON)
       * ================================================================== */}
      {taskbarJumpList &&
        !isPreviewMode &&
        !isSystemLocked &&
        powerState === 'on' &&
        (() => {
          const { appId, x } = taskbarJumpList;
          const appDef = APP_DEFINITIONS.find((a) => a.id === appId);
          const appWindows = windows.filter(
            (w) => w.appId === appId && w.isOpen
          );
          const isPinned = isAppPinnedToTaskbar(appId);
          const recentFiles = getJumpListRecentFiles(appId);
          const isMediaApp = appId === 'spotify' || appId === 'mediaplayer';
          const clampedX = Math.max(
            12,
            Math.min(x - 115, window.innerWidth - 250)
          );

          return (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ left: clampedX }}
              className={`fixed bottom-[64px] z-[9950] w-[245px] p-1.5 text-xs text-neutral-100 select-none ${
                settings.taskbarStyle === 'glass-center'
                  ? 'rounded-[20px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_24px_60px_rgba(0,0,0,0.45),inset_0_1px_2px_rgba(255,255,255,0.5)]'
                  : settings.taskbarStyle === 'floating'
                  ? 'rounded-[14px] bg-[#1e1e24]/96 backdrop-blur-3xl border border-white/[0.18] shadow-[0_22px_55px_rgba(0,0,0,0.85)]'
                  : settings.taskbarStyle === 'acrylic' ||
                    settings.taskbarStyle === 'transparent'
                  ? 'rounded-[14px] bg-gradient-to-br from-cyan-500/[0.16] via-slate-900/[0.62] to-indigo-950/[0.62] backdrop-blur-3xl border border-cyan-300/35 shadow-[0_22px_55px_rgba(0,0,0,0.85)]'
                  : settings.taskbarStyle === 'compact' ||
                    settings.taskbarStyle === 'solid'
                  ? 'rounded-[4px] bg-[#111111] border border-white/[0.18] shadow-[0_22px_55px_rgba(0,0,0,0.95)]'
                  : 'rounded-[10px] bg-[#242424]/96 backdrop-blur-3xl border border-white/[0.15] shadow-[0_22px_55px_rgba(0,0,0,0.85)]'
              }`}
            >
              {/* App Header */}
              <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <AppIconRenderer appId={appId} size={16} />
                  <span className="font-semibold text-white truncate">
                    {appDef?.name || appId}
                  </span>
                </div>
                {appWindows.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[#0078d4]/25 text-[#60cdff] text-[10px] font-medium">
                    {appWindows.length} {appWindows.length > 1 ? 'Windows' : 'Open'}
                  </span>
                )}
              </div>

              {/* Recent Files Section (الملفات الأخيرة) */}
              {recentFiles.length > 0 && (
                <div className="py-1 border-b border-white/[0.08]">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Recent (الملفات الأخيرة)
                  </div>
                  {recentFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => {
                        openFileSystemItem(file);
                        setTaskbarJumpList(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <FileItemIconRenderer
                        type={file.type}
                        name={file.name}
                        customIconUrl={file.customIconUrl}
                        size={14}
                      />
                      <span className="truncate text-[11px] text-neutral-200">
                        {file.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick Tasks Section (اختصارات سريعة) */}
              <div className="py-1 border-b border-white/[0.08]">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Tasks (اختصارات سريعة)
                </div>

                {/* Open New Window (Multi-window support) */}
                <button
                  onClick={() => {
                    launchApp(appId, { forceNewWindow: true });
                    setTaskbarJumpList(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
                >
                  <Plus size={14} className="text-[#60cdff]" />
                  <span>Open new window (نافذة جديدة)</span>
                </button>

                {appId === 'edge' && (
                  <button
                    onClick={() => {
                      launchApp('edge', {
                        forceNewWindow: true,
                        customTitle: 'InPrivate Browsing - Microsoft Edge',
                      });
                      setTaskbarJumpList(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
                  >
                    <Shield size={14} className="text-purple-400" />
                    <span>New InPrivate window (تصفح خفي)</span>
                  </button>
                )}

                {appId === 'thispc' && (
                  <>
                    <button
                      onClick={() => {
                        launchApp('thispc', {
                          folderId: 'desktop',
                          customTitle: 'Desktop - File Explorer',
                          forceNewWindow: true,
                        });
                        setTaskbarJumpList(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <Monitor size={14} className="text-[#60cdff]" />
                      <span>Open Desktop Folder</span>
                    </button>
                    <button
                      onClick={() => {
                        launchApp('recyclebin');
                        setTaskbarJumpList(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <Trash2 size={14} className="text-neutral-300" />
                      <span>Open Recycle Bin</span>
                    </button>
                  </>
                )}

                {isMediaApp && (
                  <>
                    <button
                      onClick={() => {
                        sendTaskbarMediaCommand(
                          appId as 'spotify' | 'mediaplayer',
                          'toggle'
                        );
                        setTaskbarJumpList(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <Play size={14} className="text-emerald-400" />
                      <span>Play / Pause Media (تشغيل/إيقاف)</span>
                    </button>
                    <button
                      onClick={() => {
                        sendTaskbarMediaCommand(
                          appId as 'spotify' | 'mediaplayer',
                          'next'
                        );
                        setTaskbarJumpList(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
                    >
                      <SkipForward size={14} className="text-[#60cdff]" />
                      <span>Skip to Next Track (تخطي)</span>
                    </button>
                  </>
                )}
              </div>

              {/* Pin / Unpin & Close Actions */}
              <div className="pt-1 space-y-0.5">
                <button
                  onClick={() => {
                    togglePinAppToTaskbar(appId);
                    setTaskbarJumpList(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
                >
                  {isPinned ? (
                    <>
                      <PinOff size={14} className="text-amber-400" />
                      <span>Unpin from taskbar (إزالة التثبيت)</span>
                    </>
                  ) : (
                    <>
                      <Pin size={14} className="text-[#60cdff]" />
                      <span>Pin to taskbar (تثبيت في الشريط)</span>
                    </>
                  )}
                </button>

                {appWindows.length > 0 && (
                  <button
                    onClick={() => {
                      setWindows((ws) => ws.filter((w) => w.appId !== appId));
                      setTaskbarJumpList(null);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[5px] hover:bg-white/[0.08] text-rose-400 text-left transition-colors"
                  >
                    <X size={14} />
                    <span>
                      {appWindows.length > 1
                        ? `Close all windows (${appWindows.length})`
                        : 'Close window (إغلاق النافذة)'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

      {/* ====================================================================
       * 8C. TASKBAR EMPTY SPACE CONTEXT MENU (TASK MANAGER & TASKBAR SETTINGS)
       * ================================================================== */}
      {taskbarEmptyMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            left: Math.min(taskbarEmptyMenu.x, window.innerWidth - 210),
          }}
          className={`fixed bottom-[64px] z-[9950] w-[200px] p-1.5 text-xs text-neutral-100 select-none space-y-0.5 ${
            settings.taskbarStyle === 'glass-center'
              ? 'rounded-[18px] bg-gradient-to-br from-white/[0.18] via-white/[0.10] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[190%] border border-white/[0.38] shadow-[0_18px_45px_rgba(0,0,0,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.48)]'
              : settings.taskbarStyle === 'floating'
              ? 'rounded-[12px] bg-[#1e1e24]/96 backdrop-blur-3xl border border-white/[0.18] shadow-[0_18px_40px_rgba(0,0,0,0.85)]'
              : settings.taskbarStyle === 'compact' ||
                settings.taskbarStyle === 'solid'
              ? 'rounded-[4px] bg-[#111111] border border-white/[0.18] shadow-[0_18px_40px_rgba(0,0,0,0.95)]'
              : 'rounded-[8px] bg-[#242424]/96 backdrop-blur-3xl border border-white/[0.15] shadow-[0_18px_40px_rgba(0,0,0,0.85)]'
          }`}
        >
          <button
            onClick={() => {
              launchApp('taskmanager');
              setTaskbarEmptyMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
          >
            <Layers size={14} className="text-[#60cdff]" />
            <span>Task Manager (مدير المهام)</span>
          </button>
          <div className="border-t border-white/[0.08] my-1" />
          <button
            onClick={() => {
              launchApp('settings');
              setTaskbarEmptyMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] hover:bg-white/[0.08] text-left transition-colors"
          >
            <AppIconRenderer appId="settings" size={14} />
            <span>Taskbar settings (الإعدادات)</span>
          </button>
        </div>
      )}

      {/* ====================================================================
       * 8. AUTHENTIC WINDOWS 11 TASKBAR (EACH THEME HAS ITS OWN DISTINCT HEIGHT, WIDTH & ELEMENT STYLING)
       * ================================================================== */}
      <div
        className={`fixed z-[9800] items-center justify-between text-white transition-all duration-300 ${
          settings.taskbarStyle === 'glass-center'
            ? 'bottom-2 left-1/2 -translate-x-1/2 w-fit max-w-[96vw] h-12 px-2.5 gap-1.5 rounded-[18px] bg-gradient-to-r from-white/[0.15] via-white/[0.09] to-white/[0.15] backdrop-blur-3xl backdrop-saturate-[195%] border border-white/[0.34] shadow-[0_14px_40px_rgba(0,0,0,0.38),inset_0_1px_1.5px_rgba(255,255,255,0.52),inset_0_-1px_1px_rgba(255,255,255,0.16)]'
            : settings.taskbarStyle === 'floating'
            ? 'bottom-2 left-3 right-3 h-12 px-3.5 rounded-[14px] bg-[#1c1c22]/90 backdrop-blur-2xl border border-white/[0.16] shadow-[0_14px_36px_rgba(0,0,0,0.7)]'
            : settings.taskbarStyle === 'compact'
            ? 'bottom-0 left-0 right-0 h-10 px-2.5 bg-[#0d0d0d] border-t border-white/[0.14] shadow-[0_-6px_20px_rgba(0,0,0,0.85)]'
            : settings.taskbarStyle === 'acrylic' ||
              settings.taskbarStyle === 'transparent'
            ? 'bottom-0 left-0 right-0 h-12 px-3 bg-gradient-to-r from-[#0f172a]/55 via-[#1e1b4b]/45 to-[#0f172a]/55 backdrop-blur-3xl border-t border-cyan-300/[0.22] shadow-[0_-10px_35px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.2)]'
            : settings.taskbarStyle === 'solid'
            ? 'bottom-0 left-0 right-0 h-12 px-3 bg-[#121212] border-t border-white/[0.12]'
            : 'bottom-0 left-0 right-0 h-12 px-3 bg-[#1c1c1c]/92 backdrop-blur-2xl border-t border-white/[0.1]'
        } ${
          isPreviewMode || isSystemLocked || powerState !== 'on'
            ? 'hidden'
            : 'flex'
        }`}
        onClick={() => {
          setContextMenu(null);
          setTaskbarJumpList(null);
          setTaskbarEmptyMenu(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu(null);
          setTaskbarJumpList(null);
          setHoveredTaskbarApp(null);
          setTaskbarEmptyMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {/* Left: Windows 11 Weather Widget (Styled per Taskbar Theme; hidden in narrow Glass-Center Dock so it stays compact in width) */}
        {settings.taskbarStyle !== 'glass-center' && (
          <div className="flex items-center min-w-[140px]">
            {settings.taskbarAlignment === 'center' && (
              <button
                onClick={() => launchApp('edge')}
                className={`flex items-center gap-2.5 px-2.5 py-1 transition-all text-left ${
                  settings.taskbarStyle === 'floating'
                    ? 'rounded-[10px] bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06]'
                    : settings.taskbarStyle === 'acrylic' ||
                      settings.taskbarStyle === 'transparent'
                    ? 'rounded-[8px] bg-white/[0.06] hover:bg-white/[0.14] border border-cyan-300/15'
                    : settings.taskbarStyle === 'compact' ||
                      settings.taskbarStyle === 'solid'
                    ? 'rounded-[2px] hover:bg-white/[0.08]'
                    : 'rounded-[4px] hover:bg-white/[0.07]'
                }`}
                title="Weather & News"
              >
                <CloudSun
                  size={settings.taskbarStyle === 'compact' ? 17 : 20}
                  className="text-[#fbbf24]"
                />
                <div className="leading-tight">
                  <div className="text-[11px] font-medium text-white">26°C</div>
                  {settings.taskbarStyle !== 'compact' && (
                    <div className="text-[10px] text-neutral-300">
                      Mostly sunny
                    </div>
                  )}
                </div>
              </button>
            )}
          </div>
        )}

        {/* Center (or Left): Start Button, Search Pill, Task View, and Pinned/Active App Icons */}
        <div
          className={`flex items-center ${
            settings.taskbarStyle === 'glass-center'
              ? 'gap-1'
              : settings.taskbarStyle === 'floating'
              ? 'gap-1.5'
              : settings.taskbarStyle === 'compact'
              ? 'gap-0.5'
              : 'gap-1'
          } ${
            settings.taskbarAlignment === 'left' &&
            settings.taskbarStyle !== 'glass-center'
              ? 'mr-auto'
              : ''
          }`}
        >
          {/* Windows 11 Start Button (Themed per Taskbar Style) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsStartOpen((v) => !v);
              setIsTaskViewOpen(false);
              setIsQuickSettingsOpen(false);
              setIsCalendarOpen(false);
              setIsKeyboardFlyoutOpen(false);
              setTaskbarJumpList(null);
              setTaskbarEmptyMenu(null);
            }}
            className={`${
              settings.taskbarStyle === 'compact'
                ? 'w-8 h-8 rounded-[3px]'
                : settings.taskbarStyle === 'glass-center'
                ? 'w-10 h-10 rounded-[12px]'
                : settings.taskbarStyle === 'floating'
                ? 'w-10 h-10 rounded-[10px]'
                : settings.taskbarStyle === 'acrylic' ||
                  settings.taskbarStyle === 'transparent'
                ? 'w-10 h-10 rounded-[8px]'
                : 'w-10 h-10 rounded-[4px]'
            } flex items-center justify-center transition-all active:scale-90 ${
              isStartOpen
                ? settings.taskbarStyle === 'glass-center'
                  ? 'bg-white/[0.24] border border-white/[0.42] shadow-[0_4px_14px_rgba(255,255,255,0.2),inset_0_1px_1px_rgba(255,255,255,0.45)]'
                  : 'bg-white/[0.16]'
                : settings.taskbarStyle === 'glass-center'
                ? 'hover:bg-white/[0.16] border border-transparent hover:border-white/[0.26]'
                : 'hover:bg-white/[0.1]'
            }`}
            title="Start"
          >
            <WindowsStartIcon
              size={settings.taskbarStyle === 'compact' ? 19 : 24}
            />
          </button>

          {/* Unified Authentic Windows 11 Pro Taskbar Search Pill */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsStartOpen(true);
              setIsTaskViewOpen(false);
              setIsKeyboardFlyoutOpen(false);
              setTaskbarJumpList(null);
              setTaskbarEmptyMenu(null);
            }}
            className="group relative h-8 sm:h-8.5 w-[180px] sm:w-[220px] px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:bg-white/[0.18] border border-white/[0.14] hover:border-white/[0.25] shadow-[inset_0_1px_1px_rgba(255,255,255,0.14),0_2px_6px_rgba(0,0,0,0.18)] flex items-center gap-2.5 text-xs text-neutral-200 transition-all mx-1 cursor-pointer select-none"
            title="Search Windows (Win + S)"
          >
            <Search
              size={14}
              className="text-[#60cdff] group-hover:scale-110 transition-transform shrink-0"
            />
            <span className="text-[11.5px] font-medium text-neutral-300 group-hover:text-white truncate">
              Search
            </span>
            <span className="ml-auto text-[10px] text-white/40 font-mono hidden sm:inline group-hover:text-white/70">
              Win+S
            </span>
          </button>

          {/* Task View Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsTaskViewOpen((v) => !v);
              setIsStartOpen(false);
              setIsKeyboardFlyoutOpen(false);
              setTaskbarJumpList(null);
              setTaskbarEmptyMenu(null);
            }}
            className={`${
              settings.taskbarStyle === 'compact'
                ? 'w-8 h-8 rounded-[3px]'
                : settings.taskbarStyle === 'glass-center'
                ? 'w-10 h-10 rounded-[12px]'
                : settings.taskbarStyle === 'floating'
                ? 'w-10 h-10 rounded-[10px]'
                : settings.taskbarStyle === 'acrylic' ||
                  settings.taskbarStyle === 'transparent'
                ? 'w-10 h-10 rounded-[8px]'
                : 'w-10 h-10 rounded-[4px]'
            } flex items-center justify-center transition-all ${
              isTaskViewOpen
                ? settings.taskbarStyle === 'glass-center'
                  ? 'bg-white/[0.24] border border-white/[0.42] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)]'
                  : 'bg-white/[0.16]'
                : settings.taskbarStyle === 'glass-center'
                ? 'hover:bg-white/[0.16] border border-transparent hover:border-white/[0.26]'
                : 'hover:bg-white/[0.1]'
            }`}
            title="Task View"
          >
            <TaskViewIcon
              size={settings.taskbarStyle === 'compact' ? 16 : 20}
            />
          </button>

          {/* Pinned & Active Application Icons with Multi-Window Layers, Smart Indicators, Hover Previews, Jump Lists & Drag-and-Drop */}
          {taskbarAppIds.map((appId, index) => {
            const isPinned = pinnedTaskbarApps.includes(appId);
            const isFirstUnpinned =
              !isPinned &&
              index === pinnedTaskbarApps.length &&
              pinnedTaskbarApps.length > 0;

            const appDef = APP_DEFINITIONS.find((a) => a.id === appId);
            const appWindows = windows.filter(
              (w) => w.appId === appId && w.isOpen
            );
            const isOpen = appWindows.length > 0;
            const hasMultipleWindows = appWindows.length > 1;
            const isFocused = appWindows.some(
              (w) => activeWindowId === w.id && !w.isMinimized
            );
            const isDragTarget =
              dragOverTaskbarAppId === appId &&
              draggedTaskbarAppId !== appId;

            return (
              <React.Fragment key={appId}>
                {/* Subtle Divider between Pinned Apps and Active Unpinned Apps */}
                {isFirstUnpinned && (
                  <div
                    className={`h-6 w-[1px] mx-1 ${
                      settings.taskbarStyle === 'glass-center'
                        ? 'bg-white/[0.3]'
                        : 'bg-white/[0.14]'
                    }`}
                    title="Active running applications (تطبيقات نشطة)"
                  />
                )}

                <div className="relative flex items-center">
                  {/* Stacked Window Layer Effect when app has multiple windows open (تطبيق يفتح عدة نوافذ) */}
                  {hasMultipleWindows && (
                    <span
                      className={`pointer-events-none absolute inset-y-1 -right-[3px] w-2 border-r border-y ${
                        settings.taskbarStyle === 'glass-center'
                          ? 'rounded-r-[10px] bg-white/[0.16] border-white/[0.32]'
                          : settings.taskbarStyle === 'floating'
                          ? 'rounded-r-[8px] bg-white/[0.12] border-white/[0.22]'
                          : 'rounded-r-[4px] bg-white/[0.09] border-white/[0.18]'
                      }`}
                      aria-hidden="true"
                    />
                  )}

                  <button
                    draggable
                    onDragStart={(e) => {
                      setDraggedTaskbarAppId(appId);
                      setHoveredTaskbarApp(null);
                      setTaskbarJumpList(null);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (
                        draggedTaskbarAppId &&
                        draggedTaskbarAppId !== appId
                      ) {
                        setDragOverTaskbarAppId(appId);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverTaskbarAppId === appId) {
                        setDragOverTaskbarAppId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (
                        draggedTaskbarAppId &&
                        draggedTaskbarAppId !== appId
                      ) {
                        reorderTaskbarApps(draggedTaskbarAppId, appId);
                      }
                      setDraggedTaskbarAppId(null);
                      setDragOverTaskbarAppId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedTaskbarAppId(null);
                      setDragOverTaskbarAppId(null);
                    }}
                    onMouseEnter={(e) => {
                      if (hoverTimeoutRef.current) {
                        window.clearTimeout(hoverTimeoutRef.current);
                        hoverTimeoutRef.current = null;
                      }
                      if (isOpen && !taskbarJumpList) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredTaskbarApp({
                          appId,
                          rectLeft: rect.left + rect.width / 2,
                        });
                      } else {
                        setHoveredTaskbarApp(null);
                      }
                    }}
                    onMouseLeave={() => {
                      hoverTimeoutRef.current = window.setTimeout(() => {
                        setHoveredTaskbarApp(null);
                      }, 180);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredTaskbarApp(null);
                      setTaskbarEmptyMenu(null);
                      setContextMenu(null);
                      setTaskbarJumpList({
                        appId,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onAuxClick={(e) => {
                      // Middle-click opens a new window instance just like Windows 11
                      if (e.button === 1) {
                        e.preventDefault();
                        launchApp(appId, { forceNewWindow: true });
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsStartOpen(false);
                      setIsKeyboardFlyoutOpen(false);
                      setTaskbarJumpList(null);
                      setTaskbarEmptyMenu(null);

                      // Shift + Click opens a new window instance
                      if (e.shiftKey) {
                        launchApp(appId, { forceNewWindow: true });
                        return;
                      }

                      if (appWindows.length > 0) {
                        // Sort by highest zIndex to find top window of this app
                        const topWin = [...appWindows].sort(
                          (a, b) => b.zIndex - a.zIndex
                        )[0];
                        if (
                          activeWindowId === topWin.id &&
                          !topWin.isMinimized
                        ) {
                          // If multiple windows exist and hover preview isn't showing, minimize top window
                          setWindows((ws) =>
                            ws.map((w) =>
                              w.id === topWin.id
                                ? { ...w, isMinimized: true }
                                : w
                            )
                          );
                        } else {
                          focusWindow(topWin.id);
                        }
                      } else {
                        launchApp(appId);
                      }
                    }}
                    title={`${appDef?.name || appId}${
                      !isPinned ? ' (Active)' : ''
                    }${
                      hasMultipleWindows
                        ? ` · ${appWindows.length} windows`
                        : ''
                    }`}
                    className={`relative ${
                      settings.taskbarStyle === 'compact'
                        ? 'w-8 h-8 rounded-[3px]'
                        : settings.taskbarStyle === 'glass-center'
                        ? 'w-10 h-10 rounded-[12px]'
                        : settings.taskbarStyle === 'floating'
                        ? 'w-10 h-10 rounded-[10px]'
                        : settings.taskbarStyle === 'acrylic' ||
                          settings.taskbarStyle === 'transparent'
                        ? 'w-10 h-10 rounded-[8px]'
                        : 'w-10 h-10 rounded-[4px]'
                    } flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                      draggedTaskbarAppId === appId
                        ? 'opacity-40 scale-95'
                        : ''
                    } ${
                      isDragTarget
                        ? 'ring-2 ring-white/80 bg-white/25'
                        : isFocused
                        ? settings.taskbarStyle === 'glass-center'
                          ? 'bg-white/[0.24] border border-white/[0.44] shadow-[0_6px_16px_rgba(0,0,0,0.22),inset_0_1px_1.5px_rgba(255,255,255,0.5)]'
                          : settings.taskbarStyle === 'floating'
                          ? 'bg-white/[0.18] border border-white/[0.2] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : settings.taskbarStyle === 'acrylic' ||
                            settings.taskbarStyle === 'transparent'
                          ? 'bg-cyan-400/[0.18] border border-cyan-300/[0.3] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : settings.taskbarStyle === 'compact' ||
                            settings.taskbarStyle === 'solid'
                          ? 'bg-[#262626] border border-[#60cdff]/40'
                          : 'bg-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                        : isOpen
                        ? settings.taskbarStyle === 'glass-center'
                          ? 'bg-white/[0.12] hover:bg-white/[0.20] border border-white/[0.24]'
                          : 'bg-white/[0.06] hover:bg-white/[0.12]'
                        : settings.taskbarStyle === 'glass-center'
                        ? 'hover:bg-white/[0.16] border border-transparent hover:border-white/[0.24]'
                        : 'hover:bg-white/[0.1]'
                    }`}
                  >
                    <AppIconRenderer
                      appId={appId}
                      size={settings.taskbarStyle === 'compact' ? 19 : 24}
                      recycleHasItems={recycleBinHasItems}
                    />

                    {/* AI Status Circle Indicator on Copilot Taskbar Pin (Lit when AI is active, dimmed when idle) */}
                    {appId === 'copilot' && (
                      <span
                        className={`absolute top-1 right-1 w-2 h-2 rounded-full transition-all duration-300 ${
                          isAiCurrentlyWorking
                            ? 'bg-emerald-400 shadow-[0_0_8px_#34d399,0_0_14px_#10b981] ring-2 ring-emerald-300/50 animate-pulse'
                            : 'bg-neutral-400/35 border border-white/25'
                        }`}
                        title={
                          isAiCurrentlyWorking
                            ? 'الذكاء الاصطناعي يعمل الآن وينفذ طلباً...'
                            : 'الذكاء الاصطناعي في وضع الاستعداد (غير نشط حالياً)'
                        }
                      />
                    )}

                    {/* Multi-Window Count Badge when > 1 window is open */}
                    {hasMultipleWindows && (
                      <span
                        className={`absolute top-0.5 right-0.5 min-w-[13px] h-[13px] px-0.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center shadow ${
                          settings.taskbarStyle === 'glass-center'
                            ? 'bg-white/[0.34] border border-white/[0.5] backdrop-blur-md'
                            : 'bg-[#0078d4]'
                        }`}
                      >
                        {appWindows.length}
                      </span>
                    )}

                    {/* Windows 11 Smart Bottom Visual Indicator (Styled per Taskbar Theme) */}
                    {isOpen && (
                      <div className="absolute bottom-0.5 flex items-center gap-[2px]">
                        <span
                          className={`rounded-full transition-all duration-200 ${
                            isFocused
                              ? settings.taskbarStyle === 'glass-center'
                                ? 'w-5 h-[3.5px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)]'
                                : settings.taskbarStyle === 'compact'
                                ? 'w-4 h-[2.5px] bg-[#60cdff]'
                                : 'w-4 h-[3px] bg-[#60cdff] shadow-[0_0_6px_rgba(96,205,255,0.8)]'
                              : settings.taskbarStyle === 'glass-center'
                              ? 'w-1.5 h-[3px] bg-white/75'
                              : 'w-1.5 h-[3px] bg-neutral-300/85'
                          }`}
                          style={
                            isFocused &&
                            settings.accentColor &&
                            settings.taskbarStyle !== 'glass-center'
                              ? { backgroundColor: settings.accentColor }
                              : undefined
                          }
                        />
                        {hasMultipleWindows && (
                          <span className="w-1 h-[3px] rounded-full bg-white/85" />
                        )}
                      </div>
                    )}
                  </button>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Frosted Glass Divider before System Tray in Glass-Center Dock */}
        {settings.taskbarStyle === 'glass-center' && (
          <div className="h-6 w-[1px] bg-white/[0.30] mx-0.5" />
        )}

        {/* Right: Windows 11 System Tray (Harmonized with Glass Background + Quick Copilot Shortcut next to Date & Time) */}
        <div
          className={`flex items-center ${
            settings.taskbarStyle === 'glass-center'
              ? 'gap-1 bg-white/[0.11] border border-white/[0.26] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] rounded-[13px] px-1.5 py-0.5'
              : settings.taskbarStyle === 'floating'
              ? 'gap-1 bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-1.5 py-0.5'
              : settings.taskbarStyle === 'acrylic' ||
                settings.taskbarStyle === 'transparent'
              ? 'gap-0.5 bg-white/[0.05] border border-cyan-300/[0.14] rounded-[8px] px-1 py-0.5'
              : 'gap-0.5'
          }`}
        >
          <button
            onClick={() => launchApp('installer')}
            className={`${
              settings.taskbarStyle === 'glass-center'
                ? 'p-1.5 rounded-[9px] hover:bg-white/[0.20] text-white/95'
                : settings.taskbarStyle === 'floating'
                ? 'p-1.5 rounded-[8px] hover:bg-white/[0.12] text-neutral-200'
                : 'p-2 rounded-[4px] hover:bg-white/[0.07] text-neutral-200'
            } transition-colors`}
            title="Import Local File / Game"
          >
            <ChevronUp size={15} />
          </button>

          {/* Authentic Windows 11 Language Switcher */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setFlyoutAnchorX(rect.left + rect.width / 2);
              setIsKeyboardFlyoutOpen((v) => !v);
              setIsQuickSettingsOpen(false);
              setIsCalendarOpen(false);
              setIsCopilotFlyoutOpen(false);
              setIsStartOpen(false);
            }}
            className={`px-2 py-1 text-[11px] font-medium transition-colors ${
              settings.taskbarStyle === 'glass-center' ||
              settings.taskbarStyle === 'floating'
                ? 'rounded-[9px]'
                : 'rounded-[4px]'
            } ${
              isKeyboardFlyoutOpen
                ? 'bg-white/[0.24] text-white'
                : 'hover:bg-white/[0.16] text-white/95'
            }`}
            title={`Keyboard layout: ${keyboardInfo.detectedScript} (Click for Keyboard Inspector)`}
          >
            {keyboardLang}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setFlyoutAnchorX(rect.left + rect.width / 2);
              setIsQuickSettingsOpen((v) => !v);
              setIsCalendarOpen(false);
              setIsCopilotFlyoutOpen(false);
              setIsStartOpen(false);
              setIsKeyboardFlyoutOpen(false);
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 5 : -5;
              const nextVol = Math.max(0, Math.min(100, settings.volume + delta));
              setSettings((prev) => ({
                ...prev,
                volume: nextVol,
                isMuted: nextVol === 0,
              }));
              if (nextVol > 0) {
                playVolumeTestPing(nextVol);
              }
            }}
            className={`flex items-center gap-1.5 px-2 py-1.5 transition-colors ${
              settings.taskbarStyle === 'glass-center' ||
              settings.taskbarStyle === 'floating'
                ? 'rounded-[9px]'
                : 'rounded-[4px]'
            } ${
              isQuickSettingsOpen
                ? 'bg-white/[0.24]'
                : 'hover:bg-white/[0.16]'
            }`}
            title={`Speakers: ${settings.isMuted ? 'Muted' : `${settings.volume}%`} · Wi-Fi Connected`}
          >
            <Wifi size={14} className="text-white/95" />
            {settings.isMuted || settings.volume === 0 ? (
              <VolumeX size={14} className="text-rose-300" />
            ) : (
              <Volume2 size={14} className="text-white/95" />
            )}
            <BatteryCharging size={15} className="text-white/95" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setFlyoutAnchorX(rect.left + rect.width / 2);
              setIsCalendarOpen((v) => !v);
              setIsQuickSettingsOpen(false);
              setIsCopilotFlyoutOpen(false);
              setIsStartOpen(false);
              setIsKeyboardFlyoutOpen(false);
            }}
            className={`flex items-center gap-2 px-2 py-1 transition-colors leading-tight ${
              settings.taskbarStyle === 'glass-center' ||
              settings.taskbarStyle === 'floating'
                ? 'rounded-[9px]'
                : 'rounded-[4px]'
            } ${
              isCalendarOpen ? 'bg-white/[0.24]' : 'hover:bg-white/[0.16]'
            }`}
            title="Date, Time & Notifications"
          >
            <div className="flex flex-col items-end justify-center">
              <span className="text-[11px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {currentTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {settings.taskbarStyle !== 'glass-center' &&
                settings.taskbarStyle !== 'compact' && (
                  <span className="text-[10px] text-neutral-300">
                    {currentTime.toLocaleDateString()}
                  </span>
                )}
            </div>
            <div className="relative flex items-center justify-center">
              <Bell size={14} className="text-white/95" />
              {notifications.length > 0 && (
                <span className="-top-1 -right-1 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] absolute" />
              )}
            </div>
          </button>

          {/* Dedicated Windows 11 Copilot Mini-Chat Flyout Button next to Date & Time + Live AI Activity Circle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setFlyoutAnchorX(rect.left + rect.width / 2);
              setIsCopilotFlyoutOpen((v) => !v);
              setIsCalendarOpen(false);
              setIsQuickSettingsOpen(false);
              setIsStartOpen(false);
              setIsKeyboardFlyoutOpen(false);
              setTaskbarJumpList(null);
              setTaskbarEmptyMenu(null);
            }}
            className={`relative flex items-center gap-1.5 px-2 py-1.5 transition-all active:scale-95 cursor-pointer ${
              settings.taskbarStyle === 'glass-center'
                ? isCopilotFlyoutOpen
                  ? 'rounded-[10px] bg-white/[0.28] border border-white/[0.48] shadow-[0_4px_14px_rgba(255,255,255,0.22),inset_0_1px_1.5px_rgba(255,255,255,0.55)]'
                  : 'rounded-[10px] hover:bg-white/[0.20] border border-transparent hover:border-white/[0.28]'
                : settings.taskbarStyle === 'floating'
                ? isCopilotFlyoutOpen
                  ? 'rounded-[8px] bg-white/[0.22] border border-white/[0.28]'
                  : 'rounded-[8px] hover:bg-white/[0.14]'
                : isCopilotFlyoutOpen
                ? 'rounded-[6px] bg-white/[0.20]'
                : 'rounded-[6px] hover:bg-white/[0.12]'
            }`}
            title={
              isAiCurrentlyWorking
                ? 'Copilot يعمل الآن على تنفيذ طلبك... (اضغط لفتح الشات السريع)'
                : 'Copilot Quick Chat — مستعد (اضغط لفتح الشات السريع بجانب الساعة)'
            }
          >
            <AppIconRenderer
              appId="copilot"
              size={settings.taskbarStyle === 'compact' ? 16 : 19}
            />
            {/* Illuminated / Dimmed Status Circle next to AI Shortcut */}
            <span className="relative flex items-center justify-center">
              {isAiCurrentlyWorking && (
                <span className="absolute w-3 h-3 rounded-full bg-emerald-400/60 animate-ping" />
              )}
              <span
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isAiCurrentlyWorking
                    ? 'bg-emerald-400 shadow-[0_0_10px_#34d399,0_0_16px_#10b981] border border-white'
                    : 'bg-white/25 border border-white/40 opacity-50'
                }`}
              />
            </span>
            {isCopilotFlyoutOpen && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-[2.5px] rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.95)]" />
            )}
          </button>

          <button
            onClick={() =>
              setWindows((ws) =>
                ws.map((w) => ({ ...w, isMinimized: true }))
              )
            }
            className={`w-1.5 ${
              settings.taskbarStyle === 'compact' ? 'h-6' : 'h-7'
            } ml-0.5 border-l border-white/[0.25] hover:bg-white/[0.25] rounded-r`}
            title="Show desktop"
          />
        </div>
      </div>
    </div>
  );
}
