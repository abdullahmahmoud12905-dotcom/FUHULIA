import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  FilePlus,
  Play,
  Download,
  Check,
  FileText,
  Code,
  Search,
  Eye,
  Copy,
  Plus,
  X,
  WrapText,
  Hash,
  Sparkles,
} from 'lucide-react';
import { FileSystemItem } from '../../types/os';
import { injectWin11KernelBridge } from '../../utils/kernelEngine';

interface NotepadAppProps {
  files: FileSystemItem[];
  initialFileId?: string;
  onSaveFile: (
    fileId: string | null,
    name: string,
    content: string,
    type: FileSystemItem['type']
  ) => FileSystemItem;
  onRunHtmlFile: (file: FileSystemItem) => void;
}

interface EditorTab {
  tabId: string;
  fileId: string | null;
  name: string;
  content: string;
  dirty: boolean;
}

export const NotepadApp: React.FC<NotepadAppProps> = ({
  files,
  initialFileId,
  onSaveFile,
  onRunHtmlFile,
}) => {
  const editableFiles = useMemo(
    () =>
      files.filter(
        (f) => f.parentId !== 'recyclebin' && ['text', 'code', 'html'].includes(f.type)
      ),
    [files]
  );

  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    if (initialFileId) {
      const found = files.find((f) => f.id === initialFileId);
      if (found) {
        return [
          {
            tabId: `tab-${found.id}`,
            fileId: found.id,
            name: found.name,
            content: found.content || '',
            dirty: false,
          },
        ];
      }
    }
    return [
      {
        tabId: 'tab-welcome',
        fileId: null,
        name: 'Welcome_Notes.md',
        content: `# Windows 11 Notepad Studio (24H2)\n\nWelcome to the rebuilt multi-tab **Notepad Studio**:\n- Open multiple documents simultaneously in tabs\n- Toggle **Split Preview** for live Markdown & HTML rendering\n- Use **Find & Replace** to search and refactor text instantly\n- Save directly to your Windows 11 Desktop or run HTML apps in Edge`,
        dirty: false,
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.tabId || 'tab-welcome');
  const [fontSize, setFontSize] = useState<number>(13);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [showSplitPreview, setShowSplitPreview] = useState<boolean>(false);
  const [showFindBar, setShowFindBar] = useState<boolean>(false);
  const [findQuery, setFindQuery] = useState<string>('');
  const [replaceQuery, setReplaceQuery] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  useEffect(() => {
    if (!initialFileId) return;
    const target = files.find((f) => f.id === initialFileId);
    if (!target) return;
    setTabs((prev) => {
      const existing = prev.find((t) => t.fileId === target.id);
      if (existing) {
        setActiveTabId(existing.tabId);
        return prev;
      }
      const nextTab: EditorTab = {
        tabId: `tab-${target.id}-${Date.now()}`,
        fileId: target.id,
        name: target.name,
        content: target.content || '',
        dirty: false,
      };
      setActiveTabId(nextTab.tabId);
      return [...prev, nextTab];
    });
  }, [initialFileId, files]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.tabId === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const updateActiveTab = (patch: Partial<EditorTab>) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => (t.tabId === activeTab.tabId ? { ...t, ...patch } : t))
    );
  };

  const handleOpenFileInTab = (item: FileSystemItem) => {
    const existing = tabs.find((t) => t.fileId === item.id);
    if (existing) {
      setActiveTabId(existing.tabId);
      return;
    }
    const newTab: EditorTab = {
      tabId: `tab-${item.id}-${Date.now()}`,
      fileId: item.id,
      name: item.name,
      content: item.content || '',
      dirty: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.tabId);
  };

  const handleCreateTab = (preset: 'text' | 'html' | 'md') => {
    const id = `tab-new-${Date.now()}`;
    let name = `Untitled_${tabs.length + 1}.txt`;
    let content = '';
    if (preset === 'html') {
      name = `Interactive_App_${tabs.length + 1}.html`;
      content = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <style>\n    body { margin: 0; background: #121624; color: #f8fafc; font-family: 'Segoe UI', sans-serif; padding: 28px; }\n    .card { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; max-width: 520px; }\n    button { background: #0078d4; color: #fff; border: none; padding: 9px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; }\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h2>Windows 11 Custom Web App</h2>\n    <p>Edit this HTML inside Notepad Studio and preview it live!</p>\n    <button onclick="document.getElementById('msg').textContent = 'Executed at ' + new Date().toLocaleTimeString()">Run Action</button>\n    <p id="msg" style="color:#60cdff;margin-top:12px"></p>\n  </div>\n</body>\n</html>`;
      setShowSplitPreview(true);
    } else if (preset === 'md') {
      name = `Project_Plan_${tabs.length + 1}.md`;
      content = `# Project Specification\n\n## Key Objectives\n- Build high-craft Windows 11 applications\n- Export documents directly to Desktop\n- **Real-time Markdown & HTML Preview**`;
      setShowSplitPreview(true);
    }
    const newTab: EditorTab = { tabId: id, fileId: null, name, content, dirty: true };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) {
      updateActiveTab({ fileId: null, name: 'Untitled.txt', content: '', dirty: false });
      return;
    }
    const idx = tabs.findIndex((t) => t.tabId === tabId);
    const nextTabs = tabs.filter((t) => t.tabId !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      const fallback = nextTabs[Math.max(0, idx - 1)] || nextTabs[0];
      setActiveTabId(fallback.tabId);
    }
  };

  const handleSave = () => {
    if (!activeTab) return null;
    const cleanName = activeTab.name.trim() || 'Untitled.txt';
    const ext = cleanName.split('.').pop()?.toLowerCase() || '';
    const detectedType: FileSystemItem['type'] =
      ext === 'html' || ext === 'htm'
        ? 'html'
        : ['js', 'ts', 'json', 'css', 'py', 'sql'].includes(ext)
        ? 'code'
        : 'text';

    const saved = onSaveFile(activeTab.fileId, cleanName, activeTab.content, detectedType);
    updateActiveTab({ fileId: saved.id, name: saved.name, dirty: false });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
    return saved;
  };

  const handleReplaceAll = () => {
    if (!activeTab || !findQuery) return;
    const next = activeTab.content.split(findQuery).join(replaceQuery);
    updateActiveTab({ content: next, dirty: true });
  };

  const handleCopyContent = () => {
    if (!activeTab) return;
    navigator.clipboard?.writeText(activeTab.content).catch(() => {});
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 1500);
  };

  const handleDownloadToPC = () => {
    if (!activeTab) return;
    const blob = new Blob([activeTab.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab.name || 'document.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isHtmlFile =
    activeTab?.name.toLowerCase().endsWith('.html') ||
    activeTab?.name.toLowerCase().endsWith('.htm');

  const lines = useMemo(
    () => (activeTab?.content || '').split('\n'),
    [activeTab?.content]
  );
  const wordsCount = useMemo(
    () => (activeTab?.content.trim() ? activeTab.content.trim().split(/\s+/).length : 0),
    [activeTab?.content]
  );
  const matchCount = useMemo(() => {
    if (!findQuery || !activeTab?.content) return 0;
    return activeTab.content.split(findQuery).length - 1;
  }, [findQuery, activeTab?.content]);

  const renderedPreviewHtml = useMemo(() => {
    const raw = activeTab?.content || '';
    if (isHtmlFile || raw.trim().startsWith('<!DOCTYPE') || raw.trim().startsWith('<html')) {
      return raw;
    }
    const mdHtml = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3 style="color:#60cdff;margin:12px 0 6px">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 style="color:#38bdf8;margin:14px 0 8px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 style="color:#fff;margin:0 0 12px">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong style="color:#fde047">$1</strong>')
      .replace(/^- (.*$)/gim, '<li style="margin:4px 0">$1</li>')
      .replace(/\n/g, '<br/>');
    return `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#141414;color:#e5e7eb;font-family:'Segoe UI',sans-serif;font-size:13px;line-height:1.6">${mdHtml}</body></html>`;
  }, [activeTab?.content, isHtmlFile]);

  return (
    <div className="flex flex-col h-full bg-[#181818] text-[#f3f3f3] select-none">
      {/* 1. Windows 11 Notepad Multi-Tab Strip */}
      <div className="flex items-center gap-1 px-2 pt-2 bg-[#111111] border-b border-white/[0.08] overflow-x-auto shrink-0">
        {tabs.map((tab) => {
          const isAct = tab.tabId === activeTab?.tabId;
          return (
            <div
              key={tab.tabId}
              onClick={() => setActiveTabId(tab.tabId)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-[6px] text-xs cursor-pointer border-t border-x transition-colors max-w-[200px] ${
                isAct
                  ? 'bg-[#202020] text-white border-white/[0.1]'
                  : 'bg-[#161616] text-neutral-400 border-transparent hover:bg-[#1c1c1c] hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-[#60cdff]" />
              <span className="truncate font-medium">
                {tab.name}
                {tab.dirty ? ' •' : ''}
              </span>
              <button
                onClick={(e) => handleCloseTab(tab.tabId, e)}
                className="p-0.5 rounded hover:bg-white/[0.12] text-neutral-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          onClick={() => handleCreateTab('text')}
          className="p-1.5 rounded hover:bg-white/[0.08] text-neutral-300 hover:text-white ml-1"
          title="New Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Command Ribbon Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#202020] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleCreateTab('md')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.11] text-neutral-200 rounded-[4px]"
          >
            <FilePlus className="w-3.5 h-3.5 text-[#60cdff]" />
            <span>+ Markdown</span>
          </button>

          <button
            onClick={() => handleCreateTab('html')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white/[0.06] hover:bg-white/[0.11] text-neutral-200 rounded-[4px]"
          >
            <Code className="w-3.5 h-3.5 text-amber-400" />
            <span>+ HTML5 App</span>
          </button>

          <input
            type="text"
            value={activeTab?.name || ''}
            onChange={(e) => updateActiveTab({ name: e.target.value, dirty: true })}
            placeholder="File name..."
            className="px-2.5 py-1 bg-[#141414] border border-white/[0.12] rounded-[4px] text-xs text-white focus:outline-none focus:border-[#60cdff] w-44"
          />

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-[4px] transition-colors"
          >
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedNotice ? 'Saved' : 'Save to Desktop'}</span>
          </button>

          {isHtmlFile && (
            <button
              onClick={() => {
                const saved = handleSave();
                if (saved) onRunHtmlFile(saved);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-[4px] transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run in Edge</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFindBar((v) => !v)}
            className={`p-1.5 rounded-[4px] text-xs flex items-center gap-1 ${
              showFindBar
                ? 'bg-[#0078d4] text-white'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300'
            }`}
            title="Find and Replace"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowSplitPreview((v) => !v)}
            className={`px-2.5 py-1.5 rounded-[4px] text-xs font-medium flex items-center gap-1.5 ${
              showSplitPreview
                ? 'bg-[#0078d4] text-white'
                : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>

          <button
            onClick={() => setShowLineNumbers((v) => !v)}
            className={`p-1.5 rounded-[4px] ${
              showLineNumbers ? 'bg-white/[0.14] text-white' : 'bg-white/[0.05] text-neutral-400'
            }`}
            title="Toggle Line Numbers"
          >
            <Hash className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setWordWrap((v) => !v)}
            className={`p-1.5 rounded-[4px] ${
              wordWrap ? 'bg-white/[0.14] text-white' : 'bg-white/[0.05] text-neutral-400'
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopyContent}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 rounded-[4px]"
          >
            {copiedNotice ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedNotice ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadToPC}
            className="p-1.5 bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 rounded-[4px]"
            title="Export to PC"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Optional Find & Replace Bar */}
      {showFindBar && (
        <div className="px-3 py-2 bg-[#252526] border-b border-white/[0.08] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-400 font-medium">Find:</span>
          <input
            type="text"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Search text..."
            className="px-2.5 py-1 bg-[#141414] border border-white/[0.12] rounded text-xs text-white w-44 focus:outline-none focus:border-[#60cdff]"
          />
          <span className="text-neutral-400 font-medium">Replace:</span>
          <input
            type="text"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            placeholder="Replace with..."
            className="px-2.5 py-1 bg-[#141414] border border-white/[0.12] rounded text-xs text-white w-44 focus:outline-none focus:border-[#60cdff]"
          />
          <button
            onClick={handleReplaceAll}
            className="px-3 py-1 rounded bg-[#0078d4] hover:bg-[#106ebe] text-white font-medium"
          >
            Replace All ({matchCount})
          </button>
        </div>
      )}

      {/* 4. Main Workspace: Sidebar + Editor + Optional Live Split Preview */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="w-48 bg-[#141414] border-r border-white/[0.07] p-2 overflow-y-auto hidden sm:flex flex-col justify-between shrink-0">
          <div>
            <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400">
              System &amp; Desktop Files ({editableFiles.length})
            </div>
            <div className="space-y-0.5 mt-1">
              {editableFiles.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleOpenFileInTab(f)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-xs text-left transition-colors ${
                    activeTab?.fileId === f.id
                      ? 'bg-[#0078d4]/25 text-[#60cdff] border border-[#60cdff]/30'
                      : 'text-neutral-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 rounded bg-[#1e1e1e] border border-white/[0.06] space-y-1.5">
            <div className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#60cdff]" />
              <span>Font Size ({fontSize}px)</span>
            </div>
            <input
              type="range"
              min={11}
              max={20}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-[#0078d4]"
            />
          </div>
        </div>

        {/* Code / Text Area with Line Numbers */}
        <div className="flex-1 flex min-w-0 bg-[#191919] overflow-hidden">
          {showLineNumbers && (
            <div
              style={{ fontSize: `${fontSize}px` }}
              className="py-4 px-2.5 bg-[#141414] border-r border-white/[0.06] text-right font-mono text-neutral-500 select-none overflow-hidden shrink-0 leading-relaxed"
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}

          <textarea
            value={activeTab?.content || ''}
            onChange={(e) => updateActiveTab({ content: e.target.value, dirty: true })}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave();
              } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setShowFindBar((v) => !v);
              }
            }}
            style={{
              fontSize: `${fontSize}px`,
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            }}
            placeholder="Start typing notes, Markdown, or HTML code..."
            className="flex-1 p-4 bg-[#191919] text-[#f3f3f3] font-mono leading-relaxed focus:outline-none resize-none select-text overflow-auto"
          />
        </div>

        {/* Split Live Preview Pane */}
        {showSplitPreview && (
          <div className="w-1/2 border-l border-white/[0.08] flex flex-col bg-[#141414]">
            <div className="px-3 py-1.5 bg-[#202020] border-b border-white/[0.07] text-[11px] font-semibold text-[#60cdff] flex items-center justify-between">
              <span>Live Rendered Preview ({isHtmlFile ? 'HTML5 Sandbox' : 'Markdown'})</span>
              <button
                onClick={() => setShowSplitPreview(false)}
                className="text-neutral-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <iframe
              title="notepad-live-preview"
              srcDoc={injectWin11KernelBridge(
                renderedPreviewHtml,
                activeTab?.fileId || 'notepad-preview'
              )}
              sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"
              className="flex-1 w-full border-0 bg-[#141414]"
            />
          </div>
        )}
      </div>

      {/* 5. Authentic Windows 11 Notepad Status Bar */}
      <div className="px-3.5 py-1 bg-[#202020] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-neutral-400 font-mono tabular-nums shrink-0">
        <div className="flex items-center gap-3">
          <span>{activeTab?.fileId ? `Saved: ${activeTab.name}` : `Draft: ${activeTab?.name}`}</span>
          <span>·</span>
          <span>{tabs.length} Open Tab(s)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Ln {lines.length}</span>
          <span>·</span>
          <span>{wordsCount} words</span>
          <span>·</span>
          <span>{(activeTab?.content || '').length} chars</span>
          <span>·</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};

