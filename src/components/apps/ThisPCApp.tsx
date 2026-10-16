import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Code2,
  Copy,
  FilePlus,
  FolderPlus,
  Globe,
  HardDrive,
  Monitor,
  Music,
  Image as ImageIcon,
  Download,
  FileText,
  RotateCcw,
  Search,
  Trash2,
  ClipboardPaste,
} from 'lucide-react';
import { AppId, FileSystemItem, OSClipboard, SpotifyTrack } from '../../types/os';
import { AppIconRenderer, FileItemIconRenderer } from '../icons/WinIcons';
import { dedupeFilesList } from '../../utils/osPersistence';

interface ThisPCAppProps {
  files: FileSystemItem[];
  initialFolderId?: string;
  osClipboard: OSClipboard | null;
  onSetClipboard: (cb: OSClipboard | null) => void;
  onPasteToFolder: (targetFolderId: string) => void;
  onOpenItem: (item: FileSystemItem) => void;
  onPreviewFolderInBrowser: (folder: FileSystemItem) => void;
  onOpenFolderInVSCode: (folderId: string) => void;
  onLaunchApp: (appId: AppId) => void;
  onCreateItem: (
    name: string,
    type: FileSystemItem['type'],
    parentId: string,
    extra?: Partial<FileSystemItem>
  ) => FileSystemItem;
  onRenameItem: (id: string, newName: string) => void;
  onDeleteItems: (ids: string[]) => void;
  onRestoreItems: (ids: string[]) => void;
  onMoveItems: (ids: string[], targetParentId: string) => void;
  onAddSpotifyTrack?: (track: Omit<SpotifyTrack, 'id'>) => void;
}

const SYSTEM_NAV_ITEMS = [
  { id: 'thispc', name: 'This PC', icon: <HardDrive className="w-4 h-4 text-[#60cdff]" /> },
  { id: 'desktop', name: 'Desktop', icon: <Monitor className="w-4 h-4 text-sky-400" /> },
  { id: 'documents', name: 'Documents', icon: <FileText className="w-4 h-4 text-amber-400" /> },
  { id: 'downloads', name: 'Downloads', icon: <Download className="w-4 h-4 text-emerald-400" /> },
  { id: 'pictures', name: 'Pictures', icon: <ImageIcon className="w-4 h-4 text-fuchsia-400" /> },
  { id: 'music', name: 'Music', icon: <Music className="w-4 h-4 text-rose-400" /> },
  { id: 'recyclebin', name: 'Recycle Bin', icon: <Trash2 className="w-4 h-4 text-neutral-400" /> },
];

export const ThisPCApp: React.FC<ThisPCAppProps> = ({
  files,
  initialFolderId,
  osClipboard,
  onSetClipboard,
  onPasteToFolder,
  onOpenItem,
  onPreviewFolderInBrowser,
  onOpenFolderInVSCode,
  onCreateItem,
  onRenameItem,
  onDeleteItems,
  onRestoreItems,
}) => {
  const safeFiles = useMemo(() => dedupeFilesList(files), [files]);
  const [currentFolder, setCurrentFolder] = useState<string>(initialFolderId || 'thispc');
  const [history, setHistory] = useState<string[]>([initialFolderId || 'thispc']);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState<string>('');

  const navigateTo = (folderId: string) => {
    setCurrentFolder(folderId);
    setSelectedIds([]);
    setHistory((prev) => [...prev, folderId]);
  };

  const goBack = () => {
    if (history.length <= 1) return;
    const prev = history[history.length - 2];
    setHistory((h) => h.slice(0, -1));
    setCurrentFolder(prev);
    setSelectedIds([]);
  };

  const goUp = () => {
    if (currentFolder === 'thispc') return;
    const sys = SYSTEM_NAV_ITEMS.find((s) => s.id === currentFolder);
    if (sys) {
      navigateTo('thispc');
      return;
    }
    const folderObj = safeFiles.find((f) => f.id === currentFolder);
    navigateTo(folderObj?.parentId || 'thispc');
  };

  const breadcrumbs = useMemo(() => {
    if (currentFolder === 'thispc') return [{ id: 'thispc', name: 'This PC' }];
    const sys = SYSTEM_NAV_ITEMS.find((s) => s.id === currentFolder);
    if (sys) {
      return [
        { id: 'thispc', name: 'This PC' },
        { id: sys.id, name: sys.name },
      ];
    }
    const chain: Array<{ id: string; name: string }> = [];
    const visited = new Set<string>();
    let ptr = safeFiles.find((f) => f.id === currentFolder);
    while (ptr && !visited.has(ptr.id)) {
      visited.add(ptr.id);
      chain.unshift({ id: ptr.id, name: ptr.name });
      const parentSys = SYSTEM_NAV_ITEMS.find((s) => s.id === ptr?.parentId);
      if (parentSys) {
        chain.unshift({ id: parentSys.id, name: parentSys.name });
        break;
      }
      ptr = safeFiles.find((f) => f.id === ptr?.parentId);
    }
    return [{ id: 'thispc', name: 'This PC' }, ...chain];
  }, [currentFolder, safeFiles]);

  const displayedItems = useMemo(() => {
    if (searchQuery.trim()) {
      return safeFiles.filter(
        (f) =>
          f.parentId !== 'recyclebin' &&
          f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (currentFolder === 'thispc') return [];
    return safeFiles.filter((f) => f.parentId === currentFolder);
  }, [currentFolder, safeFiles, searchQuery]);

  const activeFolderObj = safeFiles.find(
    (f) => f.id === currentFolder && f.type === 'folder'
  );

  return (
    <div className="flex flex-col h-full bg-[#191919] text-[#f3f3f3] select-none">
      {/* Top Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#202020] border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5">
          {currentFolder !== 'thispc' && currentFolder !== 'recyclebin' && (
            <>
              <button
                onClick={() => {
                  const created = onCreateItem('New Folder', 'folder', currentFolder);
                  setRenamingId(created.id);
                  setRenameText(created.name);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium whitespace-nowrap shrink-0"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>New Folder</span>
              </button>
              <button
                onClick={() => {
                  const created = onCreateItem('New Document.txt', 'text', currentFolder, {
                    content: '',
                  });
                  setRenamingId(created.id);
                  setRenameText(created.name);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium whitespace-nowrap shrink-0"
              >
                <FilePlus className="w-3.5 h-3.5 text-[#60cdff]" />
                <span>New File</span>
              </button>
            </>
          )}

          {activeFolderObj && (
            <>
              <button
                onClick={() => onOpenFolderInVSCode(activeFolderObj.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-[#0078d4]/25 hover:bg-[#0078d4]/40 border border-[#60cdff]/30 text-xs font-medium text-[#60cdff] whitespace-nowrap shrink-0"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Open in VS Code</span>
              </button>
              <button
                onClick={() => onPreviewFolderInBrowser(activeFolderObj)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/30 text-xs font-medium text-emerald-300 whitespace-nowrap shrink-0"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Run in Browser</span>
              </button>
            </>
          )}

          {selectedIds.length > 0 && currentFolder !== 'recyclebin' && (
            <>
              <button
                onClick={() => onSetClipboard({ ids: selectedIds, mode: 'copy' })}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => {
                  onDeleteItems(selectedIds);
                  setSelectedIds([]);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] bg-[#c42b1c] hover:bg-red-700 text-xs text-white"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          {osClipboard && osClipboard.ids.length > 0 && currentFolder !== 'thispc' && (
            <button
              onClick={() => onPasteToFolder(currentFolder)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] bg-[#0078d4] text-xs text-white"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste ({osClipboard.ids.length})</span>
            </button>
          )}

          {currentFolder === 'recyclebin' && displayedItems.length > 0 && (
            <button
              onClick={() =>
                onRestoreItems(
                  selectedIds.length > 0 ? selectedIds : displayedItems.map((i) => i.id)
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore Items</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-56">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search This PC..."
            className="w-full pl-8 pr-3 py-1 rounded-[4px] bg-[#141414] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-[#60cdff]"
          />
        </div>
      </div>

      {/* Address & Breadcrumb Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1c1c1c] border-b border-white/[0.06] text-xs">
        <button
          onClick={goBack}
          disabled={history.length <= 1}
          className="p-1 rounded hover:bg-white/[0.08] disabled:opacity-30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={goUp}
          disabled={currentFolder === 'thispc'}
          className="p-1 rounded hover:bg-white/[0.08] disabled:opacity-30"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 flex items-center gap-1 px-2.5 py-1 rounded bg-[#141414] border border-white/[0.08] overflow-x-auto no-scrollbar">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={`${b.id}-${idx}`}>
              {idx > 0 && <ChevronRight className="w-3 h-3 text-neutral-500 shrink-0" />}
              <button
                onClick={() => navigateTo(b.id)}
                className="hover:text-[#60cdff] transition-colors truncate whitespace-nowrap"
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Tree */}
        <div className="w-48 bg-[#161616] border-r border-white/[0.07] p-2 space-y-1 overflow-y-auto shrink-0">
          {SYSTEM_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[5px] text-xs font-medium transition-colors ${
                currentFolder === item.id && !searchQuery
                  ? 'bg-white/[0.1] text-white'
                  : 'text-neutral-400 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* Right Content Viewport */}
        <div
          className="flex-1 overflow-y-auto p-4"
          onClick={() => {
            setSelectedIds([]);
            setRenamingId(null);
          }}
        >
          {currentFolder === 'thispc' && !searchQuery.trim() ? (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold text-neutral-300 mb-3">
                  Folders ({SYSTEM_NAV_ITEMS.length - 1})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {SYSTEM_NAV_ITEMS.filter((i) => i.id !== 'thispc').map((folder) => {
                    const count = safeFiles.filter((f) => f.parentId === folder.id).length;
                    return (
                      <button
                        key={folder.id}
                        onDoubleClick={() => navigateTo(folder.id)}
                        onClick={() => navigateTo(folder.id)}
                        className="flex items-center gap-3 p-3 rounded-[6px] bg-[#222222] hover:bg-[#2a2a2a] border border-white/[0.07] text-left transition-colors"
                      >
                        {folder.icon}
                        <div>
                          <div className="text-xs font-medium text-white">{folder.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
                            {count} items
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-neutral-300 mb-3">
                  Devices and drives (2)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                  <div
                    onClick={() => navigateTo('desktop')}
                    className="p-3.5 rounded-[6px] bg-[#222222] hover:bg-[#2a2a2a] border border-white/[0.08] flex items-center gap-3.5 cursor-pointer"
                  >
                    <HardDrive className="w-8 h-8 text-[#60cdff] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">
                        Windows 11 Pro OS (C:)
                      </div>
                      <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden my-1.5">
                        <div className="h-full bg-[#0078d4] w-[38%]" />
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
                        624 GB free of 1.00 TB · NVMe PCIe 4.0
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => navigateTo('documents')}
                    className="p-3.5 rounded-[6px] bg-[#222222] hover:bg-[#2a2a2a] border border-white/[0.08] flex items-center gap-3.5 cursor-pointer"
                  >
                    <HardDrive className="w-8 h-8 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">
                        AI Studio Workspace (D:)
                      </div>
                      <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden my-1.5">
                        <div className="h-full bg-emerald-500 w-[22%]" />
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono tabular-nums">
                        1.56 TB free of 2.00 TB · Cloud Sync Active
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-neutral-400 text-xs gap-2">
              <span>This folder is empty.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {displayedItems.map((item) => {
                const isSel = selectedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIds([item.id]);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (item.type === 'folder') {
                        navigateTo(item.id);
                      } else {
                        onOpenItem(item);
                      }
                    }}
                    className={`p-3 rounded-[6px] border flex flex-col items-center text-center gap-2 cursor-pointer transition-colors ${
                      isSel
                        ? 'bg-[#0078d4]/25 border-[#60cdff]'
                        : 'bg-[#222222] hover:bg-white/[0.06] border-white/[0.06]'
                    }`}
                  >
                    {item.type === 'app' && item.appId ? (
                      <AppIconRenderer appId={item.appId} size={34} />
                    ) : (
                      <FileItemIconRenderer
                        type={item.type}
                        name={item.name}
                        customIconUrl={item.customIconUrl}
                        size={34}
                      />
                    )}

                    {renamingId === item.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={renameText}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onRenameItem(item.id, renameText.trim() || item.name);
                            setRenamingId(null);
                          }
                        }}
                        onBlur={() => {
                          onRenameItem(item.id, renameText.trim() || item.name);
                          setRenamingId(null);
                        }}
                        className="w-full px-1.5 py-0.5 rounded bg-black border border-[#60cdff] text-xs text-white text-center"
                      />
                    ) : (
                      <div className="text-xs text-white truncate w-full">{item.name}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
