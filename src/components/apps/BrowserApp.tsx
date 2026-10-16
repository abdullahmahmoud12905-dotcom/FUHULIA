import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  RotateCw,
  Search,
  Globe,
  Code2,
  Edit3,
  ExternalLink,
  Cpu,
  Download,
  Link as LinkIcon,
  Play,
  Terminal,
  Folder,
  Gamepad2,
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Home,
  Star,
  BookOpen,
  Clock,
  Bookmark,
  Trash2,
  Monitor,
  Tablet,
  Smartphone,
  MousePointerClick,
  Sparkles,
  Palette,
} from 'lucide-react';
import { FileSystemItem } from '../../types/os';
import { STORE_APPS_CATALOG, StoreCatalogItem } from './MicrosoftStoreApp';
import { injectWin11KernelBridge } from '../../utils/kernelEngine';

interface BrowserAppProps {
  files: FileSystemItem[];
  initialFileId?: string;
  initialFolderId?: string;
  isPreviewMode?: boolean;
  onEditInNotepad: (fileId: string) => void;
  onOpenInVSCode?: (folderId?: string, fileId?: string) => void;
  onUpdateItem?: (id: string, partial: Partial<FileSystemItem>) => void;
}

interface WikiArticle {
  title: string;
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
}

interface EdgeTab {
  id: string;
  title: string;
  urlInput: string;
  mode: 'newtab' | 'search' | 'iframe' | 'file';
  fileId: string | null;
  iframeUrl: string;
  searchQuery: string;
  wikiResults: WikiArticle[];
  selectedArticle: WikiArticle | null;
  readerMode: boolean;
  history: string[];
  historyIndex: number;
}

interface EdgeBookmark {
  id: string;
  title: string;
  urlOrQuery: string;
  type: 'search' | 'url';
}

const DEFAULT_BOOKMARKS: EdgeBookmark[] = [
  { id: 'bm-win11', title: 'Windows 11 24H2', urlOrQuery: 'Windows 11', type: 'search' },
  { id: 'bm-ai', title: 'Artificial Intelligence', urlOrQuery: 'Artificial intelligence', type: 'search' },
  { id: 'bm-ts', title: 'TypeScript & Web Dev', urlOrQuery: 'TypeScript', type: 'search' },
  { id: 'bm-space', title: 'James Webb Telescope', urlOrQuery: 'James Webb Space Telescope', type: 'search' },
  { id: 'bm-egypt', title: 'تاريخ مصر والحضارة', urlOrQuery: 'مصر', type: 'search' },
];

// Bundles a Project Folder (HTML + CSS + JS + Images + Videos inside the folder) into a runnable HTML document for Microsoft Edge Live Preview
export function compileProjectFolderToHtml(
  targetItem: FileSystemItem,
  allFiles: FileSystemItem[]
): { html: string; displayUrl: string; folderId?: string } {
  const isFolder = targetItem.type === 'folder';
  const folderId = isFolder ? targetItem.id : targetItem.parentId;
  const folderObj = isFolder
    ? targetItem
    : allFiles.find((f) => f.id === targetItem.parentId && f.type === 'folder');
  const folderName = folderObj ? folderObj.name : 'Desktop';

  const siblings = allFiles.filter(
    (f) => f.parentId === folderId && f.parentId !== 'recyclebin'
  );

  const htmlFile =
    !isFolder && targetItem.type === 'html'
      ? targetItem
      : siblings.find(
          (f) => f.name.toLowerCase() === 'index.html' && f.type === 'html'
        ) || siblings.find((f) => f.type === 'html');

  let rawHtml = htmlFile?.content || '';

  if (!rawHtml.trim()) {
    const videos = siblings.filter((f) => f.type === 'video');
    const images = siblings.filter((f) => f.type === 'image');
    const codes = siblings.filter((f) => f.type === 'code' || f.type === 'text');

    rawHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${folderName} — Microsoft Edge Live Preview</title>
  <style>
    body { margin: 0; font-family: 'Segoe UI', system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 32px; }
    .box { max-width: 860px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
    h1 { color: #38bdf8; margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 20px; }
    .card { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 12px; }
    img, video { width: 100%; border-radius: 8px; max-height: 240px; object-fit: cover; }
    .label { font-size: 12px; color: #94a3b8; margin-top: 8px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="box">
    <h1>${folderName}</h1>
    <p>Live Folder Preview in Microsoft Edge (${siblings.length} files in folder)</p>
    <div class="grid">
      ${videos
        .map(
          (v) =>
            `<div class="card"><video src="${v.mediaUrl || ''}" controls></video><div class="label">${v.name}</div></div>`
        )
        .join('')}
      ${images
        .map(
          (img) =>
            `<div class="card"><img src="${img.imageUrl || img.mediaUrl || ''}" alt="${img.name}" /><div class="label">${img.name}</div></div>`
        )
        .join('')}
    </div>
    ${
      codes.length > 0
        ? `<div style="margin-top:20px;font-size:13px;color:#cbd5e1;">Files in folder: ${codes
            .map((c) => c.name)
            .join(', ')}</div>`
        : ''
    }
  </div>
</body>
</html>`;
  } else {
    const cssFiles = siblings.filter(
      (f) => f.name.toLowerCase().endsWith('.css') && f.content
    );
    cssFiles.forEach((cssFile) => {
      const escapedName = cssFile.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const linkRegex = new RegExp(
        `<link[^>]*href=["'](?:\\.?\\/)?${escapedName}["'][^>]*>`,
        'gi'
      );
      if (linkRegex.test(rawHtml)) {
        rawHtml = rawHtml.replace(
          linkRegex,
          `<style>\n${cssFile.content}\n</style>`
        );
      } else if (rawHtml.includes('</head>')) {
        rawHtml = rawHtml.replace(
          '</head>',
          `<style>\n${cssFile.content}\n</style>\n</head>`
        );
      } else {
        rawHtml = `<style>\n${cssFile.content}\n</style>\n` + rawHtml;
      }
    });

    const jsFiles = siblings.filter(
      (f) => f.name.toLowerCase().endsWith('.js') && f.content
    );
    jsFiles.forEach((jsFile) => {
      const escapedName = jsFile.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const scriptRegex = new RegExp(
        `<script[^>]*src=["'](?:\\.?\\/)?${escapedName}["'][^>]*>\\s*<\\/script>`,
        'gi'
      );
      if (scriptRegex.test(rawHtml)) {
        rawHtml = rawHtml.replace(
          scriptRegex,
          `<script>\n${jsFile.content}\n</script>`
        );
      } else if (rawHtml.includes('</body>')) {
        rawHtml = rawHtml.replace(
          '</body>',
          `<script>\n${jsFile.content}\n</script>\n</body>`
        );
      } else {
        rawHtml = rawHtml + `\n<script>\n${jsFile.content}\n</script>`;
      }
    });

    const mediaSiblings = siblings.filter(
      (f) =>
        (f.type === 'image' || f.type === 'video' || f.type === 'audio') &&
        (f.mediaUrl || f.imageUrl || f.audioUrl)
    );
    mediaSiblings.forEach((media) => {
      const realUrl = media.mediaUrl || media.imageUrl || media.audioUrl || '';
      if (!realUrl) return;
      const escapedName = media.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const srcRegex = new RegExp(
        `(\\b(?:src|href|poster)=["'])(?:\\.?\\/)?${escapedName}(["'])`,
        'gi'
      );
      rawHtml = rawHtml.replace(srcRegex, `$1${realUrl}$2`);
    });
  }

  const previewKeyBridge = `<script>
window.addEventListener('keydown', function(e) {
  var tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
  if (e.key === '0' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    window.parent.postMessage({ type: 'WIN11_TOGGLE_PREVIEW_ZERO' }, '*');
  }
});
</script>`;
  if (rawHtml.includes('</body>')) {
    rawHtml = rawHtml.replace('</body>', `${previewKeyBridge}\n</body>`);
  } else {
    rawHtml = rawHtml + '\n' + previewKeyBridge;
  }

  const entryName = htmlFile ? htmlFile.name : 'index.html';
  return {
    html: injectWin11KernelBridge(rawHtml, htmlFile?.id || targetItem.id),
    displayUrl: `http://localhost:5500/${encodeURIComponent(folderName)}/${entryName}`,
    folderId: folderObj?.id,
  };
}

export function matchCatalogAppForFile(
  file: FileSystemItem,
  engineIdOverride?: string
): StoreCatalogItem {
  if (engineIdOverride) {
    const byId = STORE_APPS_CATALOG.find((a) => a.id === engineIdOverride);
    if (byId) return byId;
  }

  const lower = file.name.toLowerCase();
  for (const app of STORE_APPS_CATALOG) {
    if (app.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return app;
    }
  }

  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash * 31 + lower.charCodeAt(i)) >>> 0;
  }
  return STORE_APPS_CATALOG[hash % STORE_APPS_CATALOG.length];
}

export function buildSmartWin32AppRuntimeHtml(
  file: FileSystemItem,
  engineIdOverride?: string
): string {
  if (file.content && file.content.trim().startsWith('<')) {
    return injectWin11KernelBridge(file.content, file.id);
  }
  const matched = matchCatalogAppForFile(file, engineIdOverride);
  return injectWin11KernelBridge(matched.htmlContent, file.id);
}

export const BrowserApp: React.FC<BrowserAppProps> = ({
  files,
  initialFileId,
  initialFolderId,
  isPreviewMode = false,
  onEditInNotepad,
  onOpenInVSCode,
  onUpdateItem,
}) => {
  const createInitialTab = (fileOrFolderId?: string | null): EdgeTab => {
    const targetFile = fileOrFolderId
      ? files.find((f) => f.id === fileOrFolderId) || null
      : null;
    if (targetFile) {
      return {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: targetFile.name,
        urlInput: `edge://app/${targetFile.name}`,
        mode: 'file',
        fileId: targetFile.id,
        iframeUrl: '',
        searchQuery: '',
        wikiResults: [],
        selectedArticle: null,
        readerMode: false,
        history: [`edge://app/${targetFile.name}`],
        historyIndex: 0,
      };
    }
    return {
      id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: 'New Tab',
      urlInput: 'edge://newtab',
      mode: 'newtab',
      fileId: null,
      iframeUrl: '',
      searchQuery: '',
      wikiResults: [],
      selectedArticle: null,
      readerMode: false,
      history: ['edge://newtab'],
      historyIndex: 0,
    };
  };

  const [tabs, setTabs] = useState<EdgeTab[]>(() => [
    createInitialTab(initialFileId || initialFolderId || null),
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);

  const [bookmarks, setBookmarks] = useState<EdgeBookmark[]>(() => {
    try {
      const saved = localStorage.getItem('win11_edge_bookmarks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_BOOKMARKS;
  });

  const [browsingHistory, setBrowsingHistory] = useState<
    Array<{ query: string; timestamp: string }>
  >(() => {
    try {
      const saved = localStorage.getItem('win11_edge_history_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [exeTab, setExeTab] = useState<'run' | 'inspect' | 'web'>('run');
  const [selectedEngineId, setSelectedEngineId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [customWebUrlInput, setCustomWebUrlInput] = useState<string>('');

  // Multi-Device Responsive Preview & Live AI Element Inspector State
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [aiPickerActive, setAiPickerActive] = useState<boolean>(false);
  const [selectedElementInfo, setSelectedElementInfo] = useState<{
    selectorLabel: string;
    outerHtml: string;
  } | null>(null);
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  const [isAiModifying, setIsAiModifying] = useState<boolean>(false);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const activeFile = useMemo(
    () =>
      activeTab?.mode === 'file' && activeTab.fileId
        ? files.find((f) => f.id === activeTab.fileId) || null
        : null,
    [files, activeTab]
  );

  useEffect(() => {
    try {
      localStorage.setItem('win11_edge_bookmarks_v2', JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'win11_edge_history_v2',
        JSON.stringify(browsingHistory.slice(0, 40))
      );
    } catch {
      // ignore
    }
  }, [browsingHistory]);

  // Open incoming file/folder in a new or existing tab
  useEffect(() => {
    const incomingId = initialFileId || initialFolderId;
    if (!incomingId) return;
    const fObj = files.find((f) => f.id === incomingId);
    if (!fObj) return;

    setTabs((prev) => {
      const existing = prev.find((t) => t.fileId === incomingId);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }
      const nextTab = createInitialTab(incomingId);
      setActiveTabId(nextTab.id);
      return [...prev, nextTab];
    });
    setExeTab('run');
  }, [initialFileId, initialFolderId]);

  useEffect(() => {
    if (activeFile && activeFile.type === 'exe') {
      const matched = matchCatalogAppForFile(activeFile);
      setSelectedEngineId(matched.id);
    }
  }, [activeFile?.id]);

  const updateTab = (tabId: string, patch: Partial<EdgeTab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, ...patch } : t))
    );
  };

  const compiledProject = useMemo(() => {
    if (!activeFile) return null;
    if (activeFile.type === 'folder' || activeFile.type === 'html') {
      return compileProjectFolderToHtml(activeFile, files);
    }
    return null;
  }, [activeFile, files, refreshKey]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'WIN11_AI_ELEMENT_SELECTED') {
        setAiPickerActive(false);
        setSelectedElementInfo({
          selectorLabel: String(e.data.selectorLabel || 'Element'),
          outerHtml: String(e.data.outerHtml || ''),
        });
      } else if (e.data.type === 'WIN11_OPEN_RELATIVE_FILE' && e.data.fileName) {
        const cleanName = String(e.data.fileName).replace(/^[./]+/, '').toLowerCase();
        const parentId = activeFile
          ? activeFile.type === 'folder'
            ? activeFile.id
            : activeFile.parentId
          : undefined;
        const found = files.find(
          (f) =>
            (parentId ? f.parentId === parentId : true) &&
            f.name.toLowerCase() === cleanName &&
            f.parentId !== 'recyclebin'
        );
        if (found) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTabId
                ? {
                    ...t,
                    title: found.name,
                    urlInput: `edge://app/${found.name}`,
                    mode: 'file' as const,
                    fileId: found.id,
                  }
                : t
            )
          );
        }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [activeFile, files, activeTabId]);

  const handleToggleElementPicker = () => {
    const next = !aiPickerActive;
    setAiPickerActive(next);
    try {
      previewIframeRef.current?.contentWindow?.postMessage(
        { type: 'WIN11_AI_TOGGLE_PICKER', active: next },
        '*'
      );
    } catch {
      // ignore
    }
  };

  const handleApplyLiveThemePreset = (preset: string) => {
    try {
      previewIframeRef.current?.contentWindow?.postMessage(
        { type: 'WIN11_AI_APPLY_THEME', preset },
        '*'
      );
    } catch {
      // ignore
    }
  };

  const handleExecuteAiElementOrFeatureEdit = async (overridePrompt?: string) => {
    const instruction = (overridePrompt ?? aiCustomPrompt).trim();
    if (!instruction || !activeFile || !onUpdateItem || isAiModifying) return;

    const targetHtmlFile =
      activeFile.type === 'html'
        ? activeFile
        : files.find(
            (f) =>
              f.parentId === activeFile.id &&
              f.type === 'html' &&
              f.parentId !== 'recyclebin'
          );
    if (!targetHtmlFile) return;

    setIsAiModifying(true);
    try {
      const fullPrompt = selectedElementInfo
        ? `المستخدم حدد العنصر التالي داخل الصفحة بالماوس: ${selectedElementInfo.selectorLabel}\nكود العنصر المحدد:\n${selectedElementInfo.outerHtml}\nالتعديل المطلوب تنفيذه بدقة على هذا العنصر أو القسم مع الحفاظ على باقي المشروع بالكامل: ${instruction}`
        : `أضف أو عدل في هذا المشروع مع الحفاظ التام على جميع الميزات الحالية وبدون أي إيموجيز: ${instruction}`;

      const res = await fetch('/api/ai/app-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          targetType: 'file',
          targetName: targetHtmlFile.name,
          currentCode: targetHtmlFile.content || compiledProject?.html || '',
          featureHistory: targetHtmlFile.featureHistory || [],
        }),
      });
      const data = await res.json();
      if (data?.updatedCode && String(data.updatedCode).includes('<')) {
        onUpdateItem(targetHtmlFile.id, {
          previousContent: targetHtmlFile.content,
          content: data.updatedCode,
          featureHistory: [...(targetHtmlFile.featureHistory || []), instruction],
        });
        setAiCustomPrompt('');
        setSelectedElementInfo(null);
        setRefreshKey((k) => k + 1);
      }
    } catch {
      // ignore
    } finally {
      setIsAiModifying(false);
    }
  };

  const searchWikipediaForTab = async (tabId: string, query: string) => {
    const clean = query.trim();
    if (!clean) return;
    setIsLoading(true);
    setBrowsingHistory((prev) => [
      {
        query: clean,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      ...prev.filter((h) => h.query !== clean).slice(0, 29),
    ]);

    updateTab(tabId, {
      mode: 'search',
      fileId: null,
      iframeUrl: '',
      searchQuery: clean,
      title: `${clean} - Search`,
      urlInput: `https://www.bing.com/search?q=${encodeURIComponent(clean)}`,
    });

    try {
      const isArabic = /[\u0600-\u06FF]/.test(clean);
      const wikiLang = isArabic ? 'ar' : 'en';
      const searchRes = await fetch(
        `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          clean
        )}&utf8=&format=json&origin=*`
      );
      const searchData = await searchRes.json();
      const items = searchData?.query?.search || [];

      if (items.length > 0) {
        const summaries: WikiArticle[] = await Promise.all(
          items.slice(0, 6).map(async (item: { title: string }) => {
            const sumRes = await fetch(
              `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
                item.title
              )}`
            );
            return await sumRes.json();
          })
        );
        updateTab(tabId, {
          wikiResults: summaries,
          selectedArticle: summaries[0] || null,
          title: summaries[0]?.title ? `${summaries[0].title} - Edge` : `${clean} - Search`,
        });
      } else {
        updateTab(tabId, { wikiResults: [], selectedArticle: null });
      }
    } catch {
      updateTab(tabId, { wikiResults: [], selectedArticle: null });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateTabTo = (tabId: string, rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed || trimmed === 'edge://newtab') {
      updateTab(tabId, {
        mode: 'newtab',
        fileId: null,
        iframeUrl: '',
        title: 'New Tab',
        urlInput: 'edge://newtab',
      });
      return;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (
        (trimmed.includes('wikipedia.org') ||
          trimmed.includes('google.com') ||
          trimmed.includes('bing.com')) &&
        !trimmed.includes('/wiki/')
      ) {
        const qMatch = trimmed.match(/[?&]q=([^&]+)/);
        const q = qMatch ? decodeURIComponent(qMatch[1]) : 'Windows 11';
        void searchWikipediaForTab(tabId, q);
      } else {
        updateTab(tabId, {
          mode: 'iframe',
          fileId: null,
          iframeUrl: trimmed,
          urlInput: trimmed,
          title: trimmed.replace(/^https?:\/\//, '').slice(0, 28),
        });
      }
    } else {
      void searchWikipediaForTab(tabId, trimmed);
    }
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTab) return;
    const nextHist = [
      ...activeTab.history.slice(0, activeTab.historyIndex + 1),
      activeTab.urlInput,
    ];
    updateTab(activeTab.id, {
      history: nextHist,
      historyIndex: nextHist.length - 1,
    });
    navigateTabTo(activeTab.id, activeTab.urlInput);
  };

  const handleAddNewTab = () => {
    const newT = createInitialTab(null);
    setTabs((prev) => [...prev, newT]);
    setActiveTabId(newT.id);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      const fresh = createInitialTab(null);
      setTabs([fresh]);
      setActiveTabId(fresh.id);
      return;
    }
    const idx = tabs.findIndex((t) => t.id === tabId);
    const filtered = tabs.filter((t) => t.id !== tabId);
    setTabs(filtered);
    if (activeTabId === tabId) {
      const nextActive = filtered[Math.max(0, idx - 1)] || filtered[0];
      setActiveTabId(nextActive.id);
    }
  };

  const handleToggleBookmarkCurrent = () => {
    if (!activeTab) return;
    const queryOrUrl =
      activeTab.mode === 'search'
        ? activeTab.searchQuery || activeTab.title
        : activeTab.urlInput;
    if (!queryOrUrl || queryOrUrl === 'edge://newtab') return;

    const exists = bookmarks.some((b) => b.urlOrQuery === queryOrUrl);
    if (exists) {
      setBookmarks((prev) => prev.filter((b) => b.urlOrQuery !== queryOrUrl));
    } else {
      setBookmarks((prev) => [
        ...prev,
        {
          id: `bm-${Date.now()}`,
          title: activeTab.selectedArticle?.title || activeTab.title.replace(/ - Edge$/, ''),
          urlOrQuery: queryOrUrl,
          type: activeTab.mode === 'iframe' ? 'url' : 'search',
        },
      ]);
    }
  };

  const isCurrentBookmarked = useMemo(() => {
    if (!activeTab) return false;
    const queryOrUrl =
      activeTab.mode === 'search'
        ? activeTab.searchQuery || activeTab.title
        : activeTab.urlInput;
    return bookmarks.some((b) => b.urlOrQuery === queryOrUrl);
  }, [activeTab, bookmarks]);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const projectFolders = useMemo(
    () =>
      files.filter((f) => f.type === 'folder' && f.parentId !== 'recyclebin'),
    [files]
  );

  const handleSelectDirectPlayEngine = (engineId: string) => {
    setSelectedEngineId(engineId);
    const chosen = STORE_APPS_CATALOG.find((a) => a.id === engineId);
    if (chosen && activeFile && onUpdateItem) {
      onUpdateItem(activeFile.id, {
        content: chosen.htmlContent,
        customIconUrl: chosen.iconSvgDataUrl,
      });
    }
    setExeTab('run');
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col h-full bg-[#191919] text-[#f3f3f3] select-none font-sans overflow-hidden">
      {/* 1. Microsoft Edge Multi-Tab Strip (Hidden in Preview Mode 0) */}
      {!isPreviewMode && (
      <div className="flex items-center gap-1 px-2 pt-1.5 bg-[#141414] border-b border-white/[0.06] overflow-x-auto">
        {tabs.map((tab) => {
          const isAct = tab.id === activeTab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center justify-between gap-2 px-3 py-1.5 rounded-t-[6px] min-w-[140px] max-w-[220px] text-xs cursor-pointer transition-colors border-t border-x ${
                isAct
                  ? 'bg-[#202020] border-white/[0.12] text-white font-medium'
                  : 'bg-[#181818] border-transparent hover:bg-[#1e1e1e] text-neutral-400'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {tab.mode === 'file' ? (
                  <Cpu size={12} className="text-[#60cdff] shrink-0" />
                ) : (
                  <Globe size={12} className="text-[#38bdf8] shrink-0" />
                )}
                <span className="truncate">{tab.title}</span>
              </div>
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="p-0.5 rounded hover:bg-white/[0.12] text-neutral-400 hover:text-white opacity-75 group-hover:opacity-100"
                title="Close Tab"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}

        <button
          onClick={handleAddNewTab}
          className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-300 transition-colors shrink-0"
          title="New Tab"
        >
          <Plus size={14} />
        </button>
      </div>
      )}

      {/* 2. Microsoft Edge Address & Navigation Bar (Hidden in Preview Mode 0) */}
      {!isPreviewMode && (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#202020] border-b border-white/[0.06]">
        <button
          onClick={() => {
            if (activeTab.historyIndex > 0) {
              const prevIdx = activeTab.historyIndex - 1;
              const prevUrl = activeTab.history[prevIdx];
              updateTab(activeTab.id, { historyIndex: prevIdx });
              navigateTabTo(activeTab.id, prevUrl);
            }
          }}
          disabled={activeTab.historyIndex <= 0}
          className="p-1.5 rounded hover:bg-white/[0.08] disabled:opacity-30 text-neutral-300 transition-colors"
          title="Back"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={() => {
            if (activeTab.historyIndex < activeTab.history.length - 1) {
              const nextIdx = activeTab.historyIndex + 1;
              const nextUrl = activeTab.history[nextIdx];
              updateTab(activeTab.id, { historyIndex: nextIdx });
              navigateTabTo(activeTab.id, nextUrl);
            }
          }}
          disabled={activeTab.historyIndex >= activeTab.history.length - 1}
          className="p-1.5 rounded hover:bg-white/[0.08] disabled:opacity-30 text-neutral-300 transition-colors"
          title="Forward"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-300 transition-colors"
          title="Reload"
        >
          <RotateCw size={14} />
        </button>
        <button
          onClick={() => navigateTabTo(activeTab.id, 'edge://newtab')}
          className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-300 transition-colors"
          title="New Tab Home"
        >
          <Home size={14} />
        </button>

        <form onSubmit={handleAddressSubmit} className="flex-1 flex items-center">
          <div className="flex items-center w-full bg-[#141414] border border-white/[0.1] focus-within:border-[#60cdff] rounded-full px-3.5 py-1 gap-2">
            {compiledProject ? (
              <Globe size={13} className="text-emerald-400 shrink-0" />
            ) : activeFile ? (
              <Cpu size={13} className="text-[#60cdff] shrink-0" />
            ) : (
              <Search size={13} className="text-neutral-400 shrink-0" />
            )}
            <input
              type="text"
              value={
                compiledProject
                  ? compiledProject.displayUrl
                  : activeFile
                  ? `C:\\Users\\Administrator\\Desktop\\${activeFile.name}`
                  : activeTab.urlInput
              }
              onChange={(e) => {
                updateTab(activeTab.id, {
                  fileId: null,
                  urlInput: e.target.value,
                });
              }}
              placeholder="Search the web or enter URL..."
              className="w-full bg-transparent text-xs text-white focus:outline-none font-mono"
            />
            {activeTab.mode === 'search' && (
              <button
                type="button"
                onClick={() =>
                  updateTab(activeTab.id, { readerMode: !activeTab.readerMode })
                }
                className={`p-1 rounded transition-colors ${
                  activeTab.readerMode
                    ? 'bg-[#0078d4] text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Toggle Immersive Reader Mode"
              >
                <BookOpen size={13} />
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleBookmarkCurrent}
              className={`p-1 rounded transition-colors ${
                isCurrentBookmarked
                  ? 'text-[#fbbf24]'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Bookmark this page"
            >
              <Star size={13} fill={isCurrentBookmarked ? '#fbbf24' : 'none'} />
            </button>
          </div>
        </form>

        {projectFolders.length > 0 && (
          <div className="flex items-center gap-1 bg-[#141414] border border-white/[0.1] rounded-md px-2 py-1">
            <Folder size={12} className="text-[#38bdf8] shrink-0" />
            <select
              value={
                activeFile?.type === 'folder'
                  ? activeFile.id
                  : compiledProject?.folderId || ''
              }
              onChange={(e) => {
                if (e.target.value) {
                  const fObj = files.find((f) => f.id === e.target.value);
                  updateTab(activeTab.id, {
                    mode: 'file',
                    fileId: e.target.value,
                    title: fObj?.name || 'Project Preview',
                  });
                }
              }}
              className="bg-transparent text-[11px] text-neutral-200 focus:outline-none cursor-pointer"
              title="Live Preview any Project Folder"
            >
              <option value="" className="bg-[#202020]">
                Preview Folder...
              </option>
              {projectFolders.map((folder) => (
                <option
                  key={folder.id}
                  value={folder.id}
                  className="bg-[#202020]"
                >
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={() => setShowHistoryDrawer((v) => !v)}
          className={`p-1.5 rounded transition-colors ${
            showHistoryDrawer
              ? 'bg-[#0078d4] text-white'
              : 'hover:bg-white/[0.08] text-neutral-300'
          }`}
          title="Browsing History"
        >
          <Clock size={14} />
        </button>
      </div>
      )}

      {/* 3. Bookmarks Bar (Hidden in Preview Mode 0) */}
      {!isPreviewMode && (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-[#202020] border-b border-white/[0.08] overflow-x-auto text-[11px]">
        <div className="flex items-center gap-1 text-neutral-400 pr-2 border-r border-white/[0.08] shrink-0">
          <Bookmark size={11} className="text-[#60cdff]" />
          <span>Favorites</span>
        </div>
        {bookmarks.map((bm) => (
          <button
            key={bm.id}
            onClick={() => navigateTabTo(activeTab.id, bm.urlOrQuery)}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded hover:bg-white/[0.08] text-neutral-200 transition-colors shrink-0"
          >
            <Globe size={11} className="text-[#60cdff]" />
            <span className="truncate max-w-[140px]">{bm.title}</span>
          </button>
        ))}
      </div>
      )}

      {/* History Drawer Popup */}
      {showHistoryDrawer && !isPreviewMode && (
        <div className="bg-[#222222] border-b border-white/[0.1] px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="text-neutral-400 font-semibold shrink-0">
              Recent History:
            </span>
            {browsingHistory.length === 0 ? (
              <span className="text-neutral-500">No recent searches yet</span>
            ) : (
              browsingHistory.slice(0, 8).map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    navigateTabTo(activeTab.id, item.query);
                    setShowHistoryDrawer(false);
                  }}
                  className="px-2.5 py-1 rounded bg-[#161616] hover:bg-[#0078d4] text-neutral-200 hover:text-white border border-white/[0.07] shrink-0 transition-colors"
                >
                  {item.query}{' '}
                  <span className="text-[10px] opacity-60">({item.timestamp})</span>
                </button>
              ))
            )}
          </div>
          {browsingHistory.length > 0 && (
            <button
              onClick={() => setBrowsingHistory([])}
              className="flex items-center gap-1 text-rose-400 hover:underline shrink-0"
            >
              <Trash2 size={12} />
              <span>Clear</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Main Tab Content Area */}
      {activeFile ? (
        <div className="flex-1 flex flex-col bg-[#141414] overflow-hidden">
          {/* Action Toolbar for Folder / HTML / Media / Executable (Hidden in Preview Mode 0) */}
          {!isPreviewMode && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#1f1f1f] border-b border-white/[0.08] text-xs">
            <div className="flex items-center gap-2 text-neutral-300 truncate">
              <span className="font-semibold text-white truncate">
                {activeFile.type === 'folder'
                  ? `Live Folder Preview: ${activeFile.name}`
                  : activeFile.name}
              </span>
              {activeFile.type !== 'folder' && (
                <span className="text-neutral-500">
                  ({formatBytes(activeFile.size)})
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(activeFile.type === 'folder' ||
                activeFile.type === 'html' ||
                activeFile.type === 'code' ||
                activeFile.type === 'text') &&
                onOpenInVSCode && (
                  <button
                    onClick={() =>
                      onOpenInVSCode(
                        activeFile.type === 'folder'
                          ? activeFile.id
                          : activeFile.parentId,
                        activeFile.type === 'folder' ? undefined : activeFile.id
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold transition-colors"
                  >
                    <Code2 size={13} />
                    <span>Open in Visual Studio Code</span>
                  </button>
                )}

              {(activeFile.type === 'html' ||
                activeFile.type === 'text' ||
                activeFile.type === 'code') && (
                <button
                  onClick={() => onEditInNotepad(activeFile.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 transition-colors"
                >
                  <Edit3 size={12} />
                  <span>Edit in Notepad</span>
                </button>
              )}

              {activeFile.type === 'exe' && (
                <>
                  <div className="flex items-center gap-1.5 bg-[#141414] border border-[#60cdff]/40 rounded px-2 py-1">
                    <Gamepad2 size={13} className="text-[#60cdff] shrink-0" />
                    <span className="text-[11px] text-neutral-300">DirectPlay Mode:</span>
                    <select
                      value={selectedEngineId}
                      onChange={(e) => handleSelectDirectPlayEngine(e.target.value)}
                      className="bg-transparent text-[11px] text-[#60cdff] font-semibold focus:outline-none cursor-pointer"
                    >
                      {STORE_APPS_CATALOG.map((eng) => (
                        <option key={eng.id} value={eng.id} className="bg-[#202020] text-white">
                          {eng.name} ({eng.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setExeTab('run');
                      setRefreshKey((k) => k + 1);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors ${
                      exeTab === 'run'
                        ? 'bg-[#0078d4] text-white'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200'
                    }`}
                  >
                    <Play size={12} />
                    <span>Play / Run Now</span>
                  </button>
                  <button
                    onClick={() => setExeTab('inspect')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium transition-colors ${
                      exeTab === 'inspect'
                        ? 'bg-[#0078d4] text-white'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200'
                    }`}
                  >
                    <Terminal size={12} />
                    <span>PE Inspector</span>
                  </button>
                  <button
                    onClick={() => setExeTab('web')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium transition-colors ${
                      exeTab === 'web'
                        ? 'bg-[#0078d4] text-white'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200'
                    }`}
                  >
                    <LinkIcon size={12} />
                    <span>Bind URL</span>
                  </button>
                </>
              )}

              {activeFile.mediaUrl && (
                <a
                  href={activeFile.mediaUrl}
                  download={activeFile.name}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 transition-colors"
                >
                  <Download size={12} />
                  <span>Download</span>
                </a>
              )}
            </div>
          </div>
          )}

          {activeFile.type === 'video' && activeFile.mediaUrl && (
            <div className="flex-1 flex flex-col items-center justify-center bg-black p-4">
              <video
                key={`${activeFile.id}-${refreshKey}`}
                src={activeFile.mediaUrl}
                controls
                autoPlay
                className="max-w-full max-h-full rounded shadow-2xl"
              />
            </div>
          )}

          {activeFile.type === 'pdf' && activeFile.mediaUrl && (
            <iframe
              key={`${activeFile.id}-${refreshKey}`}
              src={activeFile.mediaUrl}
              title={activeFile.name}
              className="flex-1 w-full h-full border-0 bg-white"
            />
          )}

          {(activeFile.type === 'folder' || activeFile.type === 'html') &&
            compiledProject && (
              <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0f17] relative">
                {/* Floating Smart AI Customization, Element Picker & Multi-Device Preview Bar */}
                {!isPreviewMode && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#141b2d]/95 border-b border-white/[0.1] text-xs z-20">
                    {/* Left: Multi-Device Responsive Switcher */}
                    <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-lg border border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('desktop')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          previewDevice === 'desktop'
                            ? 'bg-[#0078d4] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="معاينة شاشة الكمبيوتر (Desktop 100%)"
                      >
                        <Monitor size={12} />
                        <span>كمبيوتر</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('tablet')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          previewDevice === 'tablet'
                            ? 'bg-[#0078d4] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="معاينة شاشة التابلت (Tablet 768px)"
                      >
                        <Tablet size={12} />
                        <span>تابلت</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('mobile')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          previewDevice === 'mobile'
                            ? 'bg-[#0078d4] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="معاينة شاشة الموبايل (Mobile 390px)"
                      >
                        <Smartphone size={12} />
                        <span>موبايل</span>
                      </button>
                    </div>

                    {/* Center: Instant Theme & Color Palette Switcher */}
                    <div className="flex items-center gap-1.5 bg-[#090d16] px-2.5 py-1 rounded-lg border border-white/[0.08]">
                      <Palette size={12} className="text-amber-400" />
                      <span className="text-[11px] text-slate-300 font-medium">الثيم الفوري:</span>
                      {[
                        { id: 'gold-emerald', label: 'ذهبي وأخضر', color: '#d4af37' },
                        { id: 'cyber-cyan', label: 'سيان', color: '#0ea5e9' },
                        { id: 'royal-violet', label: 'بنفسجي', color: '#a855f7' },
                        { id: 'crimson-gold', label: 'ياقوتي', color: '#f43f5e' },
                        { id: 'light-editorial', label: 'نهاري', color: '#f8fafc' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleApplyLiveThemePreset(t.id)}
                          className="w-4 h-4 rounded-full border border-white/30 hover:scale-125 transition-transform cursor-pointer"
                          style={{ backgroundColor: t.color }}
                          title={`تطبيق ثيم ${t.label} فوراً`}
                        />
                      ))}
                    </div>

                    {/* Right: Interactive AI Element Picker + Prompt Input */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-[260px] justify-end">
                      <button
                        type="button"
                        onClick={handleToggleElementPicker}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer shrink-0 ${
                          aiPickerActive
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg'
                            : 'bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 border-amber-500/30'
                        }`}
                        title="اضغط ثم مرر الماوس داخل الموقع لتحديد أي عنصر وتعديله بالذكاء الاصطناعي"
                      >
                        <MousePointerClick size={13} />
                        <span>
                          {aiPickerActive ? 'اختر عنصراً بالماوس...' : 'تحديد عنصر للتعديل'}
                        </span>
                      </button>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void handleExecuteAiElementOrFeatureEdit();
                        }}
                        className="flex items-center gap-1.5 flex-1 max-w-md"
                      >
                        <input
                          type="text"
                          dir="auto"
                          value={aiCustomPrompt}
                          onChange={(e) => setAiCustomPrompt(e.target.value)}
                          placeholder={
                            selectedElementInfo
                              ? `عدّل (${selectedElementInfo.selectorLabel.slice(0, 26)})...`
                              : 'اكتب تعديلاً أو ميزة لإضافتها فوراً بالـ AI...'
                          }
                          className="w-full bg-[#090d16] border border-white/[0.14] focus:border-[#38bdf8] rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isAiModifying || !aiCustomPrompt.trim()}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-[#0ea5e9] to-[#2563eb] hover:brightness-110 disabled:opacity-40 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                        >
                          <Sparkles size={11} />
                          <span>{isAiModifying ? 'جاري التعديل...' : 'تعديل بـ AI'}</span>
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {selectedElementInfo && !isPreviewMode && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1 bg-emerald-950/80 border-b border-emerald-500/30 text-[11px] text-emerald-200">
                    <span className="truncate font-mono">
                      العنصر المحدد للتعديل: {selectedElementInfo.selectorLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedElementInfo(null)}
                      className="text-emerald-300 hover:text-white text-[10px] underline shrink-0 cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                )}

                {/* Responsive Device Viewport Container */}
                <div className="flex-1 w-full h-full flex items-center justify-center overflow-auto bg-[#070a10] p-0">
                  <div
                    className={`h-full transition-all duration-300 bg-white overflow-hidden ${
                      previewDevice === 'desktop'
                        ? 'w-full'
                        : previewDevice === 'tablet'
                        ? 'w-[768px] max-w-full my-3 h-[calc(100%-24px)] rounded-2xl border-4 border-slate-700 shadow-2xl'
                        : 'w-[390px] max-w-full my-3 h-[calc(100%-24px)] rounded-3xl border-4 border-slate-700 shadow-2xl'
                    }`}
                  >
                    <iframe
                      ref={previewIframeRef}
                      key={`${activeFile.id}-${refreshKey}`}
                      title={activeFile.name}
                      srcDoc={compiledProject.html}
                      sandbox="allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox"
                      className="w-full h-full border-0 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

          {activeFile.type === 'exe' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#141414]">
              {exeTab === 'run' ? (
                activeFile.peInfo?.webLaunchUrl ? (
                  <iframe
                    key={`${activeFile.id}-web-${refreshKey}`}
                    src={activeFile.peInfo.webLaunchUrl}
                    title={activeFile.name}
                    className="flex-1 w-full h-full border-0 bg-black"
                    allow="fullscreen; autoplay; gamepad"
                  />
                ) : (
                  <iframe
                    key={`${activeFile.id}-${selectedEngineId}-runtime-${refreshKey}`}
                    title={activeFile.name}
                    srcDoc={
                      activeFile.content ||
                      buildSmartWin32AppRuntimeHtml(activeFile, selectedEngineId)
                    }
                    sandbox="allow-scripts allow-forms allow-modals"
                    className="flex-1 w-full h-full border-0 bg-[#141414]"
                  />
                )
              ) : exeTab === 'inspect' ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="max-w-3xl mx-auto space-y-5">
                    <div className="flex items-center justify-between p-5 rounded-lg bg-[#222222] border border-white/[0.08]">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-[#0078d4]/20 border border-[#60cdff]/30 flex items-center justify-center text-[#60cdff]">
                          <Cpu size={24} />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-white">
                            {activeFile.name}
                          </h2>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {activeFile.peInfo?.architecture ||
                              'Win32 Native Executable'}{' '}
                            · {formatBytes(activeFile.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setExeTab('run')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white"
                      >
                        <Play size={13} />
                        <span>Play / Run Now</span>
                      </button>
                    </div>

                    {activeFile.peInfo?.hexPreview && (
                      <div className="p-5 rounded-lg bg-[#222222] border border-white/[0.08] space-y-2">
                        <div className="text-xs font-semibold text-neutral-300">
                          Real File Binary Header Inspection (First 256 Bytes Hex + ASCII)
                        </div>
                        <pre className="p-3 rounded bg-[#121212] border border-white/[0.06] text-[11px] font-mono text-[#60cdff] overflow-x-auto leading-relaxed">
                          {activeFile.peInfo.hexPreview}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-xl mx-auto p-5 rounded-lg bg-[#222222] border border-white/[0.08] space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                      <LinkIcon size={15} className="text-[#60cdff]" />
                      <span>Bind External Web URL to {activeFile.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customWebUrlInput}
                        onChange={(e) => setCustomWebUrlInput(e.target.value)}
                        placeholder="https://example.com/app..."
                        className="flex-1 bg-[#141414] border border-white/[0.12] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#60cdff]"
                      />
                      <button
                        onClick={() => {
                          if (!customWebUrlInput.trim() || !onUpdateItem) return;
                          onUpdateItem(activeFile.id, {
                            peInfo: {
                              ...(activeFile.peInfo || {
                                isValidMZ: true,
                                architecture: 'Win32',
                                subsystem: 'GUI',
                                hexPreview: '',
                                extractedStrings: [],
                              }),
                              webLaunchUrl: customWebUrlInput.trim(),
                            },
                          });
                          setExeTab('run');
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#0078d4] hover:bg-[#106ebe] text-white text-xs font-medium transition-colors"
                      >
                        <Play size={12} />
                        <span>Save &amp; Run</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab.mode === 'iframe' && activeTab.iframeUrl ? (
        <iframe
          key={`${activeTab.iframeUrl}-${refreshKey}`}
          src={activeTab.iframeUrl}
          title="Web View"
          className="flex-1 w-full h-full border-0 bg-white"
        />
      ) : activeTab.mode === 'newtab' ? (
        /* Microsoft Edge 24H2 New Tab Page with Speed Dial, Search & Local Projects */
        <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-[#171b24] to-[#121212]">
          <div className="max-w-3xl mx-auto space-y-8 pt-4">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                Microsoft Edge
              </h1>
              <p className="text-xs text-neutral-400">
                Fast multi-tab browsing, Wikipedia knowledge engine, and local web project host
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (activeTab.urlInput && activeTab.urlInput !== 'edge://newtab') {
                  navigateTabTo(activeTab.id, activeTab.urlInput);
                }
              }}
              className="flex items-center bg-[#222631] border border-white/[0.12] focus-within:border-[#60cdff] rounded-full px-5 py-3 shadow-xl gap-3"
            >
              <Search size={16} className="text-[#60cdff]" />
              <input
                type="text"
                placeholder="Search the web in Arabic or English, or enter a URL..."
                onChange={(e) =>
                  updateTab(activeTab.id, { urlInput: e.target.value })
                }
                className="w-full bg-transparent text-sm text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-full bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white"
              >
                Search
              </button>
            </form>

            {/* Quick Speed Dial Tiles */}
            <div>
              <div className="text-xs font-semibold text-neutral-400 mb-3">
                Quick Access &amp; Favorites
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {bookmarks.map((bm) => (
                  <button
                    key={bm.id}
                    onClick={() => navigateTabTo(activeTab.id, bm.urlOrQuery)}
                    className="p-3.5 rounded-lg bg-[#20242e] hover:bg-[#282d3a] border border-white/[0.08] flex flex-col items-center gap-2 text-center transition-all"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#0078d4]/20 border border-[#60cdff]/30 flex items-center justify-center text-[#60cdff]">
                      <Globe size={16} />
                    </div>
                    <span className="text-xs font-medium text-white truncate w-full">
                      {bm.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Local PC Web Projects & HTML Apps */}
            {projectFolders.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-neutral-400 mb-3">
                  Local Windows 11 Web Projects (Live Server)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projectFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="p-3.5 rounded-lg bg-[#1d2028] border border-white/[0.08] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder size={18} className="text-[#38bdf8] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {folder.name}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            http://localhost:5500/{folder.name}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          updateTab(activeTab.id, {
                            mode: 'file',
                            fileId: folder.id,
                            title: folder.name,
                          })
                        }
                        className="px-3 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-medium text-white shrink-0"
                      >
                        Run Project
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Search & Reader Mode View */
        <div className="flex-1 flex overflow-hidden bg-[#191919]">
          {!activeTab.readerMode && (
            <div className="w-72 border-r border-white/[0.08] bg-[#202020] overflow-y-auto p-3 space-y-2">
              <div className="text-[11px] font-medium text-neutral-400 px-2 py-1">
                Web Search Results ({activeTab.wikiResults.length})
              </div>
              {isLoading ? (
                <div className="p-4 text-xs text-neutral-400">Searching...</div>
              ) : activeTab.wikiResults.length === 0 ? (
                <div className="p-4 text-xs text-neutral-500">
                  Enter a search query in the address bar above.
                </div>
              ) : (
                activeTab.wikiResults.map((art, idx) => (
                  <button
                    key={idx}
                    onClick={() =>
                      updateTab(activeTab.id, { selectedArticle: art })
                    }
                    className={`w-full text-left p-2.5 rounded-md transition-colors border ${
                      activeTab.selectedArticle?.title === art.title
                        ? 'bg-white/[0.08] border-white/[0.15] text-white'
                        : 'bg-transparent border-transparent hover:bg-white/[0.04] text-neutral-300'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">
                      {art.title}
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-2 mt-1">
                      {art.extract}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab.selectedArticle ? (
              <div
                className={`mx-auto space-y-4 ${
                  activeTab.readerMode
                    ? 'max-w-xl bg-[#222222] p-8 rounded-xl border border-white/[0.08]'
                    : 'max-w-2xl'
                }`}
              >
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <h1 className="text-xl font-semibold text-white">
                      {activeTab.selectedArticle.title}
                    </h1>
                    <p className="text-xs text-neutral-400 mt-1">
                      {activeTab.readerMode
                        ? 'Microsoft Edge Immersive Reader'
                        : 'Web Knowledge Article'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateTab(activeTab.id, {
                          readerMode: !activeTab.readerMode,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs text-neutral-200 transition-colors"
                    >
                      <BookOpen size={12} />
                      <span>
                        {activeTab.readerMode ? 'Standard View' : 'Reader Mode'}
                      </span>
                    </button>
                    {activeTab.selectedArticle.content_urls?.desktop?.page && (
                      <a
                        href={activeTab.selectedArticle.content_urls.desktop.page}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-xs text-neutral-200 transition-colors"
                      >
                        <span>Open External</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                {activeTab.selectedArticle.thumbnail?.source && (
                  <img
                    src={activeTab.selectedArticle.thumbnail.source}
                    alt={activeTab.selectedArticle.title}
                    referrerPolicy="no-referrer"
                    className="max-h-64 rounded-lg border border-white/[0.08] object-cover"
                  />
                )}

                <p
                  className={`text-neutral-200 leading-relaxed whitespace-pre-line ${
                    activeTab.readerMode ? 'text-base leading-8' : 'text-sm'
                  }`}
                >
                  {activeTab.selectedArticle.extract}
                </p>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">
                Select an article or enter a search query above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
