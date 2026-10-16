import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Folder,
  FolderPlus,
  FilePlus,
  FileCode,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Upload,
  Save,
  Trash2,
  Edit3,
  Check,
  X,
  Sparkles,
  Code2,
  ChevronDown,
  Layers,
  Send,
  Play,
  Files,
  Eye,
  EyeOff,
  Wrench,
  AlertTriangle,
  Mic,
  MicOff,
  Paperclip,
} from 'lucide-react';
import { ChatAttachment, FileSystemItem } from '../../types/os';
import {
  parseRealExternalFile,
  readImportedProjectFolder,
} from '../../utils/fileImporter';
import {
  loadAIMemorySync,
  saveAIMemoryPersistence,
} from '../../utils/osPersistence';
import { injectWin11KernelBridge } from '../../utils/kernelEngine';
import { VSCodeSvgIcon } from '../icons/WinIcons';

interface VSCodeAppProps {
  files: FileSystemItem[];
  initialFolderId?: string;
  initialFileId?: string;
  onCreateItem: (
    name: string,
    type: FileSystemItem['type'],
    parentId: string,
    extra?: Partial<FileSystemItem>
  ) => FileSystemItem;
  onUpdateItem: (id: string, partial: Partial<FileSystemItem>) => void;
  onRenameItem: (id: string, newName: string) => void;
  onDeleteItems: (ids: string[], permanent?: boolean) => void;
  onPreviewFolderInBrowser?: (folderId: string) => void;
}

interface IntelliSenseItem {
  label: string;
  detail: string;
  kind: 'snippet' | 'tag' | 'css' | 'js' | 'media' | 'file';
  insertText: string;
}

interface VsAiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  updatedFiles?: string[];
  attachments?: ChatAttachment[];
}

const BASE_INTELLISENSE_ITEMS: IntelliSenseItem[] = [
  {
    label: '! / html5',
    detail: 'HTML5 Boilerplate with CSS & JS links',
    kind: 'snippet',
    insertText: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <script src="script.js"></script>
</body>
</html>`,
  },
  {
    label: 'link:css',
    detail: 'Link external style.css',
    kind: 'tag',
    insertText: `<link rel="stylesheet" href="style.css" />`,
  },
  {
    label: 'script:src',
    detail: 'Include external script.js',
    kind: 'tag',
    insertText: `<script src="script.js"></script>`,
  },
  {
    label: 'addEventListener',
    detail: 'DOM Event Listener',
    kind: 'js',
    insertText: `document.addEventListener('DOMContentLoaded', () => {\n  \n});`,
  },
  {
    label: 'flex-center',
    detail: 'CSS Flexbox Center Layout',
    kind: 'css',
    insertText: `display: flex;\njustify-content: center;\nalign-items: center;`,
  },
];

function buildCombinedLivePreviewSrcDoc(
  htmlCode: string,
  cssCode: string,
  jsCode: string,
  folderItems: FileSystemItem[]
): string {
  let finalHtml =
    htmlCode ||
    `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><div style="padding:20px;font-family:sans-serif;color:#aaa;">Write HTML or ask Copilot Chat to generate a project.</div></body></html>`;

  // Replace relative media file names with their data/media URLs
  for (const item of folderItems) {
    const url = item.imageUrl || item.mediaUrl || item.audioUrl;
    if (url && item.name) {
      const escaped = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      finalHtml = finalHtml.replace(
        new RegExp(`(["'])${escaped}\\1`, 'g'),
        `"${url}"`
      );
    }
  }

  const errorBridge = `<script>
(function(){
  window.addEventListener('error', function(e) {
    try {
      window.parent.postMessage({
        type: 'VSCODE_RUNTIME_ERROR',
        message: (e && e.message ? e.message : 'Runtime Error') + (e && e.lineno ? ' (Line ' + e.lineno + ')' : '')
      }, '*');
    } catch (_) {}
  });
  window.addEventListener('unhandledrejection', function(e) {
    try {
      window.parent.postMessage({
        type: 'VSCODE_RUNTIME_ERROR',
        message: 'Unhandled Promise Rejection: ' + (e && e.reason ? (e.reason.message || String(e.reason)) : 'Unknown')
      }, '*');
    } catch (_) {}
  });
})();
</script>`;

  const styleBlock = cssCode ? `<style>\n${cssCode}\n</style>` : '';
  const scriptBlock = jsCode ? `<script>\n${jsCode}\n</script>` : '';

  if (finalHtml.includes('</head>')) {
    finalHtml = finalHtml.replace('</head>', `${errorBridge}\n${styleBlock}\n</head>`);
  } else {
    finalHtml = `${errorBridge}\n${styleBlock}\n${finalHtml}`;
  }

  if (finalHtml.includes('</body>')) {
    finalHtml = finalHtml.replace('</body>', `${scriptBlock}\n</body>`);
  } else {
    finalHtml = `${finalHtml}\n${scriptBlock}`;
  }

  return injectWin11KernelBridge(finalHtml, 'vscode-preview');
}

export const VSCodeApp: React.FC<VSCodeAppProps> = ({
  files,
  initialFolderId,
  initialFileId,
  onCreateItem,
  onUpdateItem,
  onRenameItem,
  onDeleteItems,
  onPreviewFolderInBrowser,
}) => {
  const allFolders = useMemo(
    () => files.filter((f) => f.type === 'folder' && f.parentId !== 'recyclebin'),
    [files]
  );

  const [activeFolderId, setActiveFolderId] = useState<string>(() => {
    if (initialFolderId && files.some((f) => f.id === initialFolderId && f.type === 'folder')) {
      return initialFolderId;
    }
    if (initialFileId) {
      const targetFile = files.find((f) => f.id === initialFileId);
      if (targetFile) {
        const parentFolder = files.find((f) => f.id === targetFile.parentId && f.type === 'folder');
        if (parentFolder) return parentFolder.id;
      }
    }
    const defaultProj = files.find(
      (f) => f.id === 'desk-folder-projects' && f.parentId !== 'recyclebin'
    );
    return defaultProj?.id || allFolders[0]?.id || 'desktop';
  });

  const activeFolder = useMemo(
    () => files.find((f) => f.id === activeFolderId && f.type === 'folder') || null,
    [files, activeFolderId]
  );

  const folderItems = useMemo(
    () =>
      files
        .filter((f) => f.parentId === activeFolderId && f.parentId !== 'recyclebin')
        .sort((a, b) => a.name.localeCompare(b.name)),
    [files, activeFolderId]
  );

  const [showExplorer, setShowExplorer] = useState<boolean>(true);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(initialFileId || null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string>('');

  // Inline Live Preview & Auto-Fix Runtime Debugger inside VS Code
  const [showLivePreview, setShowLivePreview] = useState<boolean>(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isAutoFixingError, setIsAutoFixingError] = useState<boolean>(false);

  // Folder & File Creation / Renaming
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('New Project');
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('index.html');
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [fileRenameValue, setFileRenameValue] = useState<string>('');

  // IntelliSense Autocomplete State
  const [intelliQuery, setIntelliQuery] = useState<string>('');
  const [showIntelliSense, setShowIntelliSense] = useState<boolean>(false);
  const [selectedIntelliIndex, setSelectedIntelliIndex] = useState<number>(0);
  const [cursorLine, setCursorLine] = useState<number>(1);

  // Authentic GitHub Copilot Chat Sidebar + Multimodal + Voice (Collapsed by default for a clean IDE workspace)
  const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiAttachments, setAiAttachments] = useState<ChatAttachment[]>([]);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceLang, setVoiceLang] = useState<'ar-EG' | 'en-US'>('ar-EG');
  const speechRecRef = useRef<any>(null);
  const aiAttachmentInputRef = useRef<HTMLInputElement | null>(null);

  const [aiMessages, setAiMessages] = useState<VsAiChatMessage[]>([
    {
      id: 'vs-welcome',
      role: 'assistant',
      text: 'أهلاً بك في GitHub Copilot. اكتب أو تحدث بصوتك أو أرفق صورة/ملف لأي موقع أو لعبة أو تعديل تريده، وسأقوم بكتابة وتحديث index.html و style.css و script.js مع معاينة حية وتصحيح تلقائي للأخطاء.',
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const projectFolderInputRef = useRef<HTMLInputElement | null>(null);
  const aiChatEndRef = useRef<HTMLDivElement | null>(null);

  const triggerSavedToast = (msg = 'Saved') => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(''), 2000);
  };

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isAiLoading]);

  // Listen for runtime errors from VS Code's Live Preview iframe
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'VSCODE_RUNTIME_ERROR') {
        setRuntimeError(String(e.data.message || 'Runtime Error'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (initialFolderId && files.some((f) => f.id === initialFolderId && f.type === 'folder')) {
      setActiveFolderId(initialFolderId);
    }
  }, [initialFolderId, files]);

  useEffect(() => {
    if (initialFileId) {
      const file = files.find((f) => f.id === initialFileId);
      if (file) {
        if (files.some((f) => f.id === file.parentId && f.type === 'folder')) {
          setActiveFolderId(file.parentId);
        }
        setActiveFileId(file.id);
        setOpenTabIds((prev) => (prev.includes(file.id) ? prev : [...prev, file.id]));
        setEditorContent(file.content || '');
        setIsDirty(false);
      }
    }
  }, [initialFileId]);

  useEffect(() => {
    const editableInFolder = folderItems.filter((f) =>
      ['html', 'code', 'text'].includes(f.type)
    );
    if (editableInFolder.length > 0) {
      const currentStillInFolder = editableInFolder.find((f) => f.id === activeFileId);
      const target =
        currentStillInFolder ||
        editableInFolder.find((f) => f.name.toLowerCase() === 'index.html') ||
        editableInFolder[0];
      if (target && target.id !== activeFileId) {
        setActiveFileId(target.id);
        setOpenTabIds((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
        setEditorContent(target.content || '');
        setIsDirty(false);
      }
    } else if (folderItems.length > 0 && !folderItems.some((f) => f.id === activeFileId)) {
      setActiveFileId(folderItems[0].id);
    }
  }, [activeFolderId, folderItems.length]);

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || null,
    [files, activeFileId]
  );

  useEffect(() => {
    if (activeFile && !isDirty && typeof activeFile.content === 'string') {
      setEditorContent(activeFile.content);
    }
  }, [activeFile?.content, activeFile?.id]);

  const htmlFileInFolder = useMemo(
    () =>
      folderItems.find((f) => f.name.toLowerCase() === 'index.html') ||
      folderItems.find((f) => f.type === 'html'),
    [folderItems]
  );
  const cssFileInFolder = useMemo(
    () => folderItems.find((f) => f.name.toLowerCase().endsWith('.css')),
    [folderItems]
  );
  const jsFileInFolder = useMemo(
    () => folderItems.find((f) => f.name.toLowerCase().endsWith('.js')),
    [folderItems]
  );

  const livePreviewSrcDoc = useMemo(() => {
    const html =
      activeFile?.id === htmlFileInFolder?.id
        ? editorContent
        : htmlFileInFolder?.content || '';
    const css =
      activeFile?.id === cssFileInFolder?.id
        ? editorContent
        : cssFileInFolder?.content || '';
    const js =
      activeFile?.id === jsFileInFolder?.id
        ? editorContent
        : jsFileInFolder?.content || '';
    return buildCombinedLivePreviewSrcDoc(html, css, js, folderItems);
  }, [
    activeFile?.id,
    htmlFileInFolder,
    cssFileInFolder,
    jsFileInFolder,
    editorContent,
    folderItems,
  ]);

  const dynamicIntelliSense = useMemo(() => {
    const folderBasedItems: IntelliSenseItem[] = [];
    folderItems.forEach((item) => {
      if (item.type === 'image') {
        folderBasedItems.push({
          label: `img:${item.name}`,
          detail: `Insert <img> for "${item.name}"`,
          kind: 'media',
          insertText: `<img src="${item.name}" alt="${item.name}" />`,
        });
      } else if (item.type === 'video') {
        folderBasedItems.push({
          label: `video:${item.name}`,
          detail: `Insert <video> for "${item.name}"`,
          kind: 'media',
          insertText: `<video src="${item.name}" controls></video>`,
        });
      }
    });

    const combined = [...folderBasedItems, ...BASE_INTELLISENSE_ITEMS];
    if (!intelliQuery.trim()) return combined.slice(0, 6);
    const q = intelliQuery.toLowerCase();
    return combined.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.detail.toLowerCase().includes(q)
    );
  }, [folderItems, intelliQuery]);

  const handleOpenFileInEditor = (item: FileSystemItem) => {
    if (isDirty && activeFile && ['html', 'code', 'text'].includes(activeFile.type)) {
      onUpdateItem(activeFile.id, {
        content: editorContent,
        size: new Blob([editorContent]).size,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
    }
    setActiveFileId(item.id);
    if (!openTabIds.includes(item.id)) {
      setOpenTabIds((prev) => [...prev, item.id]);
    }
    setEditorContent(item.content || '');
    setIsDirty(false);
    setShowIntelliSense(false);
  };

  const handleSaveCurrentFile = () => {
    if (!activeFile) return;
    onUpdateItem(activeFile.id, {
      content: editorContent,
      size: new Blob([editorContent]).size,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setIsDirty(false);
    triggerSavedToast(`Saved ${activeFile.name}`);
  };

  const applyGeneratedCodeToFolder = (
    htmlCode: string,
    cssCode: string,
    jsCode: string,
    addedFeaturePrompt?: string
  ): string[] => {
    const modifiedNames: string[] = [];

    if (htmlCode && htmlCode.trim()) {
      const existingHtml =
        folderItems.find((f) => f.name.toLowerCase() === 'index.html') ||
        folderItems.find((f) => f.type === 'html');
      if (existingHtml) {
        const prevFeats = existingHtml.featureHistory || [];
        const nextFeats =
          addedFeaturePrompt && !prevFeats.includes(addedFeaturePrompt)
            ? [...prevFeats, addedFeaturePrompt]
            : prevFeats;
        onUpdateItem(existingHtml.id, {
          previousContent: existingHtml.content,
          content: htmlCode,
          featureHistory: nextFeats,
          size: new Blob([htmlCode]).size,
          updatedAt: new Date().toISOString().slice(0, 10),
        });
        modifiedNames.push(existingHtml.name);
      } else {
        const created = onCreateItem('index.html', 'html', activeFolderId, {
          content: htmlCode,
          featureHistory: addedFeaturePrompt ? [addedFeaturePrompt] : [],
          size: new Blob([htmlCode]).size,
        });
        modifiedNames.push(created.name);
      }
    }

    if (cssCode && cssCode.trim()) {
      const existingCss = folderItems.find((f) => f.name.toLowerCase().endsWith('.css'));
      if (existingCss) {
        onUpdateItem(existingCss.id, {
          content: cssCode,
          size: new Blob([cssCode]).size,
          updatedAt: new Date().toISOString().slice(0, 10),
        });
        modifiedNames.push(existingCss.name);
      } else {
        const created = onCreateItem('style.css', 'code', activeFolderId, {
          content: cssCode,
          size: new Blob([cssCode]).size,
        });
        modifiedNames.push(created.name);
      }
    }

    if (jsCode && jsCode.trim()) {
      const existingJs = folderItems.find((f) => f.name.toLowerCase().endsWith('.js'));
      if (existingJs) {
        onUpdateItem(existingJs.id, {
          content: jsCode,
          size: new Blob([jsCode]).size,
          updatedAt: new Date().toISOString().slice(0, 10),
        });
        modifiedNames.push(existingJs.name);
      } else {
        const created = onCreateItem('script.js', 'code', activeFolderId, {
          content: jsCode,
          size: new Blob([jsCode]).size,
        });
        modifiedNames.push(created.name);
      }
    }

    if (activeFile) {
      const lowerName = activeFile.name.toLowerCase();
      if (lowerName.endsWith('.css') && cssCode.trim()) {
        setEditorContent(cssCode);
      } else if (lowerName.endsWith('.js') && jsCode.trim()) {
        setEditorContent(jsCode);
      } else if (htmlCode.trim()) {
        setEditorContent(htmlCode);
      }
      setIsDirty(false);
    } else if (htmlCode.trim()) {
      setEditorContent(htmlCode);
      setIsDirty(false);
    }

    setRuntimeError(null);
    triggerSavedToast('Updated HTML, CSS & JS');
    return modifiedNames;
  };

  const handleAutoFixProjectRuntimeError = async () => {
    if (isAutoFixingError) return;
    setIsAutoFixingError(true);
    const errToFix =
      runtimeError ||
      'Inspect index.html, style.css, and script.js and fix any runtime errors, undefined variables, or missing DOM selectors.';

    try {
      const res = await fetch('/api/ai/auto-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isMultiFile: true,
          targetName: activeFolder?.name || 'Project',
          errorMessage: errToFix,
          htmlContext:
            activeFile?.id === htmlFileInFolder?.id
              ? editorContent
              : htmlFileInFolder?.content || '',
          cssContext:
            activeFile?.id === cssFileInFolder?.id
              ? editorContent
              : cssFileInFolder?.content || '',
          jsContext:
            activeFile?.id === jsFileInFolder?.id
              ? editorContent
              : jsFileInFolder?.content || '',
        }),
      });
      const data = await res.json();
      if (data && !data.useLocalFallback && (data.htmlCode || data.jsCode)) {
        const updated = applyGeneratedCodeToFolder(
          data.htmlCode || '',
          data.cssCode || '',
          data.jsCode || ''
        );
        setRuntimeError(null);
        setAiMessages((prev) => [
          ...prev,
          {
            id: `fix-${Date.now()}`,
            role: 'assistant',
            text: data.reply || 'تم فحص وإصلاح الأخطاء البرمجية تلقائياً.',
            updatedFiles: updated,
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setIsAutoFixingError(false);
    }
  };

  const handleToggleVoiceInVsCode = () => {
    if (isVoiceListening) {
      try {
        speechRecRef.current?.stop();
      } catch {
        // ignore
      }
      setIsVoiceListening(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const rec = new SpeechRec();
      rec.lang = voiceLang;
      rec.continuous = false;
      rec.interimResults = true;
      let finalTranscript = '';

      rec.onstart = () => setIsVoiceListening(true);
      rec.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += t;
          else interim += t;
        }
        setAiPrompt((finalTranscript || interim).trim());
      };
      rec.onerror = () => setIsVoiceListening(false);
      rec.onend = () => {
        setIsVoiceListening(false);
        if (finalTranscript.trim()) {
          void handleAskCodingAi(finalTranscript.trim());
        }
      };
      speechRecRef.current = rec;
      rec.start();
    } catch {
      setIsVoiceListening(false);
    }
  };

  const handleSelectAiAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const filesArr = Array.from(list).slice(0, 3);
    e.target.value = '';

    const loaded: ChatAttachment[] = [];
    for (const file of filesArr) {
      if (file.type.startsWith('image/')) {
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => resolve('');
          r.readAsDataURL(file);
        });
        if (dataUrl) {
          loaded.push({
            id: `vs-att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: file.name,
            mimeType: file.type || 'image/png',
            kind: 'image',
            dataUrl,
          });
        }
      } else {
        const textContent = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || '').slice(0, 8000));
          r.onerror = () => resolve('');
          r.readAsText(file);
        });
        loaded.push({
          id: `vs-att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: file.name,
          mimeType: file.type || 'text/plain',
          kind: 'code',
          textContent,
        });
      }
    }
    setAiAttachments((prev) => [...prev, ...loaded].slice(0, 3));
  };

  const handleCreateNewProjectFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFolder = newFolderName.trim() || 'New Project';
    const createdFolder = onCreateItem(cleanFolder, 'folder', 'desktop');

    const starterHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanFolder}</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <h1>${cleanFolder}</h1>
    <p>Edit index.html, style.css, and script.js or ask Copilot Chat.</p>
    <button id="btn">Test Action</button>
    <div id="out"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`;

    const starterCss = `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: #121212;
  color: #f3f3f3;
  font-family: 'Segoe UI', system-ui, sans-serif;
  padding: 40px;
}
.container {
  max-width: 760px;
  margin: 0 auto;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 28px;
}
h1 { color: #38bdf8; margin-bottom: 10px; }
button {
  margin-top: 16px;
  background: #007acc;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 6px;
  cursor: pointer;
}`;

    const starterJs = `document.getElementById('btn')?.addEventListener('click', () => {
  const out = document.getElementById('out');
  if (out) out.textContent = 'Clicked at ' + new Date().toLocaleTimeString();
});`;

    const htmlFile = onCreateItem('index.html', 'html', createdFolder.id, {
      content: starterHtml,
      size: starterHtml.length,
    });
    onCreateItem('style.css', 'code', createdFolder.id, {
      content: starterCss,
      size: starterCss.length,
    });
    onCreateItem('script.js', 'code', createdFolder.id, {
      content: starterJs,
      size: starterJs.length,
    });

    setActiveFolderId(createdFolder.id);
    setActiveFileId(htmlFile.id);
    setOpenTabIds([htmlFile.id]);
    setEditorContent(htmlFile.content || '');
    setIsDirty(false);
    setIsCreatingFolder(false);
  };

  const handleCreateFileInFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFileName.trim() || 'page.html';
    const ext = clean.split('.').pop()?.toLowerCase() || '';
    const fileType: FileSystemItem['type'] =
      ext === 'html' || ext === 'htm'
        ? 'html'
        : ['css', 'js', 'ts', 'json', 'py'].includes(ext)
        ? 'code'
        : 'text';

    const created = onCreateItem(clean, fileType, activeFolderId, {
      content: '',
      size: 0,
    });
    setActiveFileId(created.id);
    setOpenTabIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
    setEditorContent('');
    setIsDirty(false);
    setIsCreatingFile(false);
  };

  const handleUploadMediaToFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;
    const list = Array.from(uploaded);
    e.target.value = '';

    for (const file of list) {
      const parsed = await parseRealExternalFile(file);
      onCreateItem(parsed.name, parsed.type, activeFolderId, parsed.extra);
    }
    triggerSavedToast(`Added ${list.length} file(s)`);
  };

  const handleImportFullFolderFromPC = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    try {
      const { folderName, files: projectFiles } = await readImportedProjectFolder(fileList);
      e.target.value = '';
      const createdFolder = onCreateItem(folderName, 'folder', 'desktop', { size: 0 });
      let firstFile: FileSystemItem | null = null;
      for (const pf of projectFiles) {
        const created = onCreateItem(pf.name, pf.type, createdFolder.id, {
          size: pf.size,
          content: pf.content,
          mediaUrl: pf.mediaUrl,
          imageUrl: pf.imageUrl,
          audioUrl: pf.audioUrl,
          mimeType: pf.mimeType,
        });
        if (!firstFile && (pf.name.toLowerCase() === 'index.html' || pf.type === 'html' || pf.type === 'code')) {
          firstFile = created;
        }
      }
      setActiveFolderId(createdFolder.id);
      if (firstFile) {
        setActiveFileId(firstFile.id);
        setOpenTabIds([firstFile.id]);
        setEditorContent(firstFile.content || '');
      }
      setShowLivePreview(true);
      triggerSavedToast(`Imported folder "${folderName}" (${projectFiles.length} files)`);
    } catch {
      triggerSavedToast('Failed to import folder');
    }
  };

  const insertSnippetAtCursor = (snippetText: string, replaceCurrentWord = false) => {
    const ta = textareaRef.current;
    if (!ta) {
      setEditorContent((prev) => prev + '\n' + snippetText);
      setIsDirty(true);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    let before = editorContent.slice(0, start);
    const after = editorContent.slice(end);

    if (replaceCurrentWord) {
      before = before.replace(/[a-zA-Z0-9_!:<.-]+$/, '');
    }

    const updated = `${before}${snippetText}${after}`;
    setEditorContent(updated);
    setIsDirty(true);
    setShowIntelliSense(false);

    requestAnimationFrame(() => {
      ta.focus();
      const newPos = before.length + snippetText.length;
      ta.setSelectionRange(newPos, newPos);
    });
  };

  const handleInsertMediaIntoHtml = (mediaItem: FileSystemItem) => {
    const tag =
      mediaItem.type === 'video'
        ? `\n  <video src="${mediaItem.name}" controls style="max-width: 100%; border-radius: 8px;"></video>`
        : mediaItem.type === 'image'
        ? `\n  <img src="${mediaItem.name}" alt="${mediaItem.name}" style="max-width: 100%; border-radius: 8px;" />`
        : `\n  <audio src="${mediaItem.name}" controls></audio>`;

    const targetHtml =
      (activeFile && activeFile.type === 'html' ? activeFile : null) ||
      folderItems.find((f) => f.type === 'html');

    if (targetHtml) {
      const currentHtml =
        activeFile?.id === targetHtml.id ? editorContent : targetHtml.content || '';
      const updatedHtml = currentHtml.includes('</body>')
        ? currentHtml.replace('</body>', `${tag}\n</body>`)
        : `${currentHtml}\n${tag}`;

      onUpdateItem(targetHtml.id, {
        content: updatedHtml,
        size: new Blob([updatedHtml]).size,
      });
      setActiveFileId(targetHtml.id);
      if (!openTabIds.includes(targetHtml.id)) {
        setOpenTabIds((prev) => [...prev, targetHtml.id]);
      }
      setEditorContent(updatedHtml);
      setIsDirty(false);
      triggerSavedToast(`Inserted ${mediaItem.name}`);
    }
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorContent(val);
    setIsDirty(true);

    if (activeFile) {
      onUpdateItem(activeFile.id, {
        content: val,
        size: new Blob([val]).size,
      });
    }

    const pos = e.target.selectionStart;
    const textBefore = val.slice(0, pos);
    const lines = textBefore.split('\n');
    setCursorLine(lines.length);

    const wordMatch = textBefore.match(/([a-zA-Z0-9_!:<.-]{2,24})$/);
    if (wordMatch) {
      setIntelliQuery(wordMatch[1]);
      setShowIntelliSense(true);
      setSelectedIntelliIndex(0);
    } else {
      setShowIntelliSense(false);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSaveCurrentFile();
      return;
    }

    if (e.key === 'F5') {
      e.preventDefault();
      handleSaveCurrentFile();
      onPreviewFolderInBrowser?.(activeFolderId);
      return;
    }

    if (e.ctrlKey && e.key === ' ') {
      e.preventDefault();
      setIntelliQuery('');
      setShowIntelliSense(true);
      setSelectedIntelliIndex(0);
      return;
    }

    if (showIntelliSense && dynamicIntelliSense.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIntelliIndex((prev) => (prev + 1) % dynamicIntelliSense.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIntelliIndex(
          (prev) => (prev - 1 + dynamicIntelliSense.length) % dynamicIntelliSense.length
        );
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        const chosen = dynamicIntelliSense[selectedIntelliIndex];
        if (chosen && intelliQuery.length >= 2) {
          e.preventDefault();
          insertSnippetAtCursor(chosen.insertText, true);
          return;
        }
      }
      if (e.key === 'Escape') {
        setShowIntelliSense(false);
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      insertSnippetAtCursor('  ', false);
    }
  };

  const handleAskCodingAi = async (overridePrompt?: string) => {
    const q = (overridePrompt ?? aiPrompt).trim();
    if ((!q && aiAttachments.length === 0) || isAiLoading) return;
    if (!overridePrompt) setAiPrompt('');

    const currentAttachments = [...aiAttachments];
    setAiAttachments([]);

    const userTurn: VsAiChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: q || `مرفق: ${currentAttachments.map((a) => a.name).join(', ')}`,
      attachments: currentAttachments.length > 0 ? currentAttachments : undefined,
    };
    const nextChat = [...aiMessages, userTurn];
    setAiMessages(nextChat);
    setIsAiLoading(true);

    const folderFileSummary = folderItems
      .map((f) => `${f.name} (${f.type})`)
      .join(', ');

    const sharedMemory = loadAIMemorySync();
    const cumulativeFeatures = Array.from(
      new Set([
        ...(activeFolder?.featureHistory || []),
        ...(htmlFileInFolder?.featureHistory || []),
        ...aiMessages.filter((m) => m.role === 'user').map((m) => m.text),
      ])
    );

    try {
      const res = await fetch('/api/ai/code-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: q || 'Convert the attached image/file into working HTML, CSS, and JS.',
          folderName: activeFolder?.name || 'Project',
          folderFiles: folderFileSummary,
          currentFileName: activeFile?.name || 'index.html',
          currentCode: editorContent,
          htmlContext:
            activeFile?.id === htmlFileInFolder?.id
              ? editorContent
              : htmlFileInFolder?.content || '',
          cssContext:
            activeFile?.id === cssFileInFolder?.id
              ? editorContent
              : cssFileInFolder?.content || '',
          jsContext:
            activeFile?.id === jsFileInFolder?.id
              ? editorContent
              : jsFileInFolder?.content || '',
          featureHistory: cumulativeFeatures,
          attachments: currentAttachments,
          aiMemory: sharedMemory,
          runtimeError: runtimeError || undefined,
          chatHistory: nextChat.slice(-10).map((m) => ({
            role: m.role,
            text: m.text.slice(0, 450),
          })),
        }),
      });
      const data = await res.json();

      if (data && !data.useLocalFallback) {
        let updatedList: string[] = [];
        if (data.shouldApplyCode && (data.htmlCode || data.cssCode || data.jsCode)) {
          updatedList = applyGeneratedCodeToFolder(
            data.htmlCode || '',
            data.cssCode || '',
            data.jsCode || '',
            q
          );
          if (activeFolder && q) {
            const folderFeats = activeFolder.featureHistory || [];
            if (!folderFeats.includes(q)) {
              onUpdateItem(activeFolder.id, {
                featureHistory: [...folderFeats, q],
              });
            }
          }
          setShowLivePreview(true);
          saveAIMemoryPersistence({
            ...sharedMemory,
            lastEditedFolderId: activeFolderId,
            items: [
              {
                id: `mem-${Date.now()}`,
                category: 'project',
                summary:
                  data.memoryNote ||
                  `تطوير مشروع VS Code: ${activeFolder?.name || 'Project'}`,
                targetId: activeFolderId,
                targetName: activeFolder?.name || 'Project',
                updatedAt: new Date().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              },
              ...sharedMemory.items.slice(0, 10),
            ],
          });
        }
        setAiMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: data.explanation || 'تم كتابة وتحديث ملفات المشروع بنجاح.',
            updatedFiles: updatedList.length > 0 ? updatedList : undefined,
          },
        ]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: 'تعذر الاتصال بالخادم حالياً، يرجى المحاولة مرة أخرى.',
          },
        ]);
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: 'حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.',
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const lineNumbers = useMemo(() => {
    const count = Math.max(1, editorContent.split('\n').length);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [editorContent]);

  const activeFileLanguage = useMemo(() => {
    if (!activeFile) return 'Plain Text';
    const lower = activeFile.name.toLowerCase();
    if (lower.endsWith('.html')) return 'HTML';
    if (lower.endsWith('.css')) return 'CSS';
    if (lower.endsWith('.js')) return 'JavaScript';
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'TypeScript';
    if (lower.endsWith('.json')) return 'JSON';
    return 'Text';
  }, [activeFile]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] select-none font-sans">
      <input
        ref={mediaInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.html,.css,.js,.ts,.json,.txt"
        className="hidden"
        onChange={handleUploadMediaToFolder}
      />
      <input
        ref={aiAttachmentInputRef}
        type="file"
        multiple
        accept="image/*,.html,.css,.js,.ts,.json,.txt"
        className="hidden"
        onChange={handleSelectAiAttachment}
      />
      <input
        ref={projectFolderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in modern browsers
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleImportFullFolderFromPC}
      />

      {/* Main Authentic VS Code Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 1. Far-Left VS Code Activity Bar (44px) */}
        <div className="w-11 bg-[#333333] border-r border-[#191919] flex flex-col items-center justify-between py-2 shrink-0">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setShowExplorer((v) => !v)}
              className={`w-10 h-10 flex items-center justify-center border-l-2 transition-colors ${
                showExplorer
                  ? 'border-white text-white'
                  : 'border-transparent text-[#858585] hover:text-white'
              }`}
              title="Explorer"
            >
              <Files className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowAiPanel((v) => !v)}
              className={`w-10 h-10 flex items-center justify-center border-l-2 transition-colors ${
                showAiPanel
                  ? 'border-[#38bdf8] text-[#38bdf8]'
                  : 'border-transparent text-[#858585] hover:text-white'
              }`}
              title="GitHub Copilot Chat"
            >
              <Sparkles className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowLivePreview((v) => !v)}
              className={`w-10 h-10 flex items-center justify-center border-l-2 transition-colors ${
                showLivePreview
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-[#858585] hover:text-white'
              }`}
              title="Toggle Inline Live Preview & Auto-Fix Debugger"
            >
              {showLivePreview ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            {onPreviewFolderInBrowser && (
              <button
                onClick={() => {
                  handleSaveCurrentFile();
                  onPreviewFolderInBrowser(activeFolderId);
                }}
                className="w-10 h-10 flex items-center justify-center border-l-2 border-transparent text-[#858585] hover:text-emerald-400 transition-colors"
                title="Run Project in Browser (F5)"
              >
                <Play className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => mediaInputRef.current?.click()}
              className="w-10 h-10 flex items-center justify-center text-[#858585] hover:text-white transition-colors"
              title="Import File / Media into Folder"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Explorer Sidebar */}
        {showExplorer && (
          <div className="w-56 bg-[#252526] border-r border-[#191919] flex flex-col shrink-0">
            {/* Folder Switcher Header */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-[#191919]">
              <select
                value={activeFolderId}
                onChange={(e) => setActiveFolderId(e.target.value)}
                className="bg-transparent text-[11px] font-semibold uppercase tracking-wider text-[#cccccc] focus:outline-none cursor-pointer truncate max-w-[125px]"
                title="Switch Workspace Folder"
              >
                {allFolders.map((folder) => (
                  <option
                    key={folder.id}
                    value={folder.id}
                    className="bg-[#252526] text-white normal-case"
                  >
                    {folder.name}
                  </option>
                ))}
                <option value="desktop" className="bg-[#252526] text-white normal-case">
                  Desktop
                </option>
              </select>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setNewFileName('index.html');
                    setIsCreatingFile((v) => !v);
                    setIsCreatingFolder(false);
                  }}
                  className="p-1 rounded hover:bg-[#37373d] text-[#cccccc]"
                  title="New File"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setNewFolderName(`Project ${allFolders.length + 1}`);
                    setIsCreatingFolder((v) => !v);
                    setIsCreatingFile(false);
                  }}
                  className="p-1 rounded hover:bg-[#37373d] text-[#cccccc]"
                  title="New Project Folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => projectFolderInputRef.current?.click()}
                  className="p-1 rounded hover:bg-[#37373d] text-[#38bdf8]"
                  title="Import Complete Project Folder from PC"
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => mediaInputRef.current?.click()}
                  className="p-1 rounded hover:bg-[#37373d] text-[#cccccc]"
                  title="Add Image / Video / File from PC"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {isCreatingFolder && (
              <form
                onSubmit={handleCreateNewProjectFolder}
                className="p-2 bg-[#1e1e1e] border-b border-[#007acc] flex gap-1"
              >
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  placeholder="Folder name..."
                  className="flex-1 px-2 py-1 bg-[#252526] border border-[#3c3c3c] rounded text-xs text-white focus:outline-none focus:border-[#007acc]"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-[#0e639c] text-white text-xs rounded"
                >
                  Create
                </button>
              </form>
            )}

            {isCreatingFile && (
              <form
                onSubmit={handleCreateFileInFolder}
                className="p-2 bg-[#1e1e1e] border-b border-[#007acc] flex gap-1"
              >
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  autoFocus
                  placeholder="filename.html"
                  className="flex-1 px-2 py-1 bg-[#252526] border border-[#3c3c3c] rounded text-xs text-white focus:outline-none focus:border-[#007acc]"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-[#0e639c] text-white text-xs rounded"
                >
                  Add
                </button>
              </form>
            )}

            {/* Folder Files Tree */}
            <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
              <div className="px-2.5 py-1 flex items-center gap-1.5 text-xs font-medium text-white">
                <ChevronDown className="w-3.5 h-3.5 text-[#cccccc]" />
                <Folder className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span className="truncate">{activeFolder ? activeFolder.name : 'Desktop'}</span>
              </div>

              {folderItems.map((item) => {
                const isSelected = activeFileId === item.id;
                const isRenamingThis = renamingFileId === item.id;
                const lowerName = item.name.toLowerCase();

                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenFileInEditor(item)}
                    className={`group flex items-center justify-between px-4 py-1.5 text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#37373d] text-white font-medium'
                        : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {item.type === 'html' || lowerName.endsWith('.html') ? (
                        <Code2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      ) : lowerName.endsWith('.css') ? (
                        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      ) : lowerName.endsWith('.js') ? (
                        <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : item.type === 'video' ? (
                        <Film className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      ) : item.type === 'image' ? (
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : item.type === 'audio' ? (
                        <Music className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}

                      {isRenamingThis ? (
                        <input
                          type="text"
                          value={fileRenameValue}
                          onChange={(e) => setFileRenameValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (fileRenameValue.trim()) {
                                onRenameItem(item.id, fileRenameValue.trim());
                              }
                              setRenamingFileId(null);
                            } else if (e.key === 'Escape') {
                              setRenamingFileId(null);
                            }
                          }}
                          onBlur={() => {
                            if (fileRenameValue.trim()) {
                              onRenameItem(item.id, fileRenameValue.trim());
                            }
                            setRenamingFileId(null);
                          }}
                          autoFocus
                          className="bg-[#1e1e1e] border border-[#007acc] rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-none"
                        />
                      ) : (
                        <span className="truncate">{item.name}</span>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setRenamingFileId(item.id);
                          setFileRenameValue(item.name);
                        }}
                        className="p-0.5 hover:text-white text-[#858585]"
                        title="Rename"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteItems([item.id])}
                        className="p-0.5 hover:text-rose-400 text-[#858585]"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Center Code Editor + Optional Split Live Preview */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e] relative">
          {/* Open File Tabs + Live Preview + Run Action */}
          <div className="flex items-center justify-between bg-[#252526] border-b border-[#191919]">
            <div className="flex items-center overflow-x-auto no-scrollbar">
              {folderItems.map((item) => {
                const isActive = activeFile?.id === item.id;
                const lowerName = item.name.toLowerCase();
                return (
                  <button
                    key={item.id}
                    onClick={() => handleOpenFileInEditor(item)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs border-r border-[#191919] shrink-0 transition-colors ${
                      isActive
                        ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                        : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e]'
                    }`}
                  >
                    {item.type === 'html' || lowerName.endsWith('.html') ? (
                      <Code2 className="w-3.5 h-3.5 text-orange-400" />
                    ) : lowerName.endsWith('.css') ? (
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                    ) : lowerName.endsWith('.js') ? (
                      <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 px-2 shrink-0">
              <button
                onClick={handleSaveCurrentFile}
                className="flex items-center gap-1 px-2 py-1 rounded hover:bg-[#37373d] text-[#cccccc] text-[11px]"
                title="Save (Ctrl+S)"
              >
                {savedToast ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{savedToast || 'Save'}</span>
              </button>

              <button
                onClick={() => setShowLivePreview((v) => !v)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                  showLivePreview
                    ? 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300'
                    : 'hover:bg-[#37373d] text-[#cccccc]'
                }`}
                title="معاينة حية داخل VS Code"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                onClick={() => setShowAiPanel((v) => !v)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                  showAiPanel
                    ? 'bg-[#007acc] text-white'
                    : 'hover:bg-[#37373d] text-[#cccccc]'
                }`}
                title="GitHub Copilot Chat"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Copilot</span>
              </button>

              {onPreviewFolderInBrowser && (
                <button
                  onClick={() => {
                    handleSaveCurrentFile();
                    onPreviewFolderInBrowser(activeFolderId);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] font-medium"
                  title="Run Project in Browser (F5)"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Code Editor Pane */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {!activeFile ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#858585]">
                  <VSCodeSvgIcon size={48} className="mb-3 opacity-50" />
                  <div className="text-sm font-medium text-[#cccccc]">
                    Visual Studio Code
                  </div>
                  <p className="text-xs max-w-sm mt-1">
                    اختر ملفاً من القائمة الجانبية، أو اطلب من Copilot كتابة الكود.
                  </p>
                </div>
              ) : activeFile.type === 'video' || activeFile.type === 'image' ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#1e1e1e] overflow-y-auto space-y-4">
                  <div className="max-w-md w-full bg-[#252526] border border-[#3c3c3c] rounded-lg p-5 text-center space-y-4">
                    <div className="text-xs font-medium text-white font-mono">
                      {activeFile.name}
                    </div>
                    {activeFile.type === 'video' && activeFile.mediaUrl && (
                      <video
                        src={activeFile.mediaUrl}
                        controls
                        className="w-full max-h-56 rounded bg-black mx-auto"
                      />
                    )}
                    {activeFile.type === 'image' && (activeFile.imageUrl || activeFile.mediaUrl) && (
                      <img
                        src={activeFile.imageUrl || activeFile.mediaUrl}
                        alt={activeFile.name}
                        referrerPolicy="no-referrer"
                        className="max-h-56 rounded object-contain mx-auto"
                      />
                    )}
                    <button
                      onClick={() => handleInsertMediaIntoHtml(activeFile)}
                      className="w-full py-2 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white text-xs font-medium transition-colors"
                    >
                      إدراج في index.html
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex min-h-0 relative overflow-hidden">
                  <div className="w-12 py-3 bg-[#1e1e1e] border-r border-[#2b2b2b] text-right pr-3 font-mono text-xs text-[#858585] select-none overflow-hidden shrink-0 leading-[1.6rem]">
                    {lineNumbers.map((n) => (
                      <div
                        key={n}
                        className={n === cursorLine ? 'text-white font-bold' : 'text-[#6e7681]'}
                      >
                        {n}
                      </div>
                    ))}
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={editorContent}
                    onChange={handleEditorChange}
                    onKeyDown={handleEditorKeyDown}
                    spellCheck={false}
                    placeholder="Write HTML, CSS, or JavaScript..."
                    className="flex-1 py-3 px-4 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[13px] leading-[1.6rem] focus:outline-none resize-none overflow-y-auto"
                  />

                  {showIntelliSense && dynamicIntelliSense.length > 0 && (
                    <div className="absolute left-16 top-12 z-30 w-80 bg-[#252526] border border-[#454545] rounded shadow-2xl overflow-hidden">
                      <div className="max-h-48 overflow-y-auto divide-y divide-[#2d2d2d]">
                        {dynamicIntelliSense.map((item, idx) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => insertSnippetAtCursor(item.insertText, true)}
                            className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 text-xs transition-colors ${
                              idx === selectedIntelliIndex
                                ? 'bg-[#04395e] text-white'
                                : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                            }`}
                          >
                            <span className="font-mono text-[#9cdcfe] truncate">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-[#999999] truncate">
                              {item.detail}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Split Live Preview & Runtime Debugger Pane */}
            {showLivePreview && (
              <div className="w-[45%] border-l border-[#191919] bg-[#141414] flex flex-col min-w-[260px]">
                <div className="px-3 py-1.5 bg-[#252526] border-b border-[#191919] flex items-center justify-between text-[11px]">
                  <span className="font-medium text-emerald-400">
                    Live Preview ({activeFolder?.name || 'Project'})
                  </span>
                  <button
                    onClick={() => setShowLivePreview(false)}
                    className="text-[#858585] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {runtimeError && (
                  <div className="px-3 py-2 bg-rose-950/80 border-b border-rose-500/40 flex items-center justify-between gap-2 text-xs text-rose-200">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate font-mono text-[11px]">{runtimeError}</span>
                    </div>
                    <button
                      onClick={handleAutoFixProjectRuntimeError}
                      disabled={isAutoFixingError}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-medium shrink-0"
                    >
                      {isAutoFixingError ? 'Fixing...' : 'Auto-Fix'}
                    </button>
                  </div>
                )}

                <div className="flex-1 bg-[#101010] relative">
                  <iframe
                    title="vscode-live-preview"
                    srcDoc={livePreviewSrcDoc}
                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. GitHub Copilot Chat Sidebar in VS Code */}
        {showAiPanel && (
          <div className="w-76 bg-[#252526] border-l border-[#191919] flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-[#191919] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>GitHub Copilot Chat</span>
              </div>
              <button
                onClick={() => setShowAiPanel(false)}
                className="text-[#858585] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[92%] rounded-lg px-3 py-2 leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-[#007acc] text-white'
                        : 'bg-[#1e1e1e] border border-[#333333] text-[#e5e5e5]'
                    }`}
                  >
                    <div>{msg.text}</div>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.attachments.map((att) =>
                          att.kind === 'image' && att.dataUrl ? (
                            <img
                              key={att.id}
                              src={att.dataUrl}
                              alt={att.name}
                              referrerPolicy="no-referrer"
                              className="max-h-24 rounded border border-white/15 object-contain"
                            />
                          ) : (
                            <span
                              key={att.id}
                              className="px-2 py-0.5 rounded bg-black/30 text-[10px] font-mono"
                            >
                              {att.name}
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {msg.updatedFiles && msg.updatedFiles.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#333333] space-y-1.5">
                        <div className="text-[10px] text-emerald-400">
                          Updated: {msg.updatedFiles.join(' · ')}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setShowLivePreview(true)}
                            className="flex-1 py-1 px-2 rounded bg-[#2d2d2d] hover:bg-[#3a3a3a] text-white text-[11px] font-medium flex items-center justify-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Live Preview</span>
                          </button>
                          {onPreviewFolderInBrowser && (
                            <button
                              onClick={() => onPreviewFolderInBrowser(activeFolderId)}
                              className="flex-1 py-1 px-2 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white text-[11px] font-medium flex items-center justify-center gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Browser</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="text-xs text-[#38bdf8] px-1">
                  جاري كتابة وتحديث HTML و CSS و JS...
                </div>
              )}
              <div ref={aiChatEndRef} />
            </div>

            {aiAttachments.length > 0 && (
              <div className="px-2.5 py-1.5 bg-[#1e1e1e] border-t border-[#333333] flex items-center gap-1.5 overflow-x-auto">
                {aiAttachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#2d2d2d] text-[10px] text-white shrink-0"
                  >
                    <span className="truncate max-w-[100px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAiAttachments((prev) => prev.filter((a) => a.id !== att.id))
                      }
                      className="text-neutral-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAskCodingAi();
              }}
              className="p-2.5 border-t border-[#191919] flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => aiAttachmentInputRef.current?.click()}
                className="p-1.5 rounded bg-[#1e1e1e] hover:bg-[#333333] border border-[#3c3c3c] text-[#cccccc]"
                title="إرفاق صورة أو ملف كود"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleToggleVoiceInVsCode}
                className={`p-1.5 rounded border transition-colors ${
                  isVoiceListening
                    ? 'bg-rose-600 border-rose-500 text-white'
                    : 'bg-[#1e1e1e] hover:bg-[#333333] border-[#3c3c3c] text-[#cccccc]'
                }`}
                title={`أمر صوتي (${voiceLang === 'ar-EG' ? 'عربي' : 'English'})`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setVoiceLang((p) => (p === 'ar-EG' ? 'en-US' : 'ar-EG'));
                }}
              >
                {isVoiceListening ? (
                  <MicOff className="w-3.5 h-3.5" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
              </button>

              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="اطلب بناء موقع أو لعبة أو تعديل الكود..."
                className="flex-1 px-2.5 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs text-white focus:outline-none focus:border-[#007acc]"
              />
              <button
                type="submit"
                disabled={(!aiPrompt.trim() && aiAttachments.length === 0) || isAiLoading}
                className="p-1.5 rounded bg-[#007acc] hover:bg-[#1f8ad2] disabled:opacity-40 text-white"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Authentic VS Code Bottom Blue Status Bar (22px) */}
      <div className="h-[22px] bg-[#007acc] text-white px-3 flex items-center justify-between text-[11px] shrink-0">
        <div className="flex items-center gap-3">
          <span>{activeFolder ? activeFolder.name : 'Desktop'}</span>
          {activeFile && <span>{activeFile.name}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>Ln {cursorLine}</span>
          <span>UTF-8</span>
          <span>{activeFileLanguage}</span>
          <span>Auto-Save</span>
        </div>
      </div>
    </div>
  );
};
