import React from 'react';
import { Cpu, Play } from 'lucide-react';
import { AppId, FileSystemItem } from '../../types/os';

export const AppInstallerApp: React.FC<{
  files: FileSystemItem[];
  initialFileId?: string;
  onCreateItem?: (
    name: string,
    type: FileSystemItem['type'],
    parentId?: string,
    extra?: Partial<FileSystemItem>
  ) => FileSystemItem;
  onOpenItem?: (item: FileSystemItem) => void;
  onUpdateItem?: (id: string, partial: Partial<FileSystemItem>) => void;
  onDeleteItem?: (id: string) => void;
  onOpenInVSCode?: (fileId?: string, folderId?: string) => void;
  onLaunchApp: (
    appId: AppId,
    opts?: { fileId?: string; folderId?: string; customTitle?: string }
  ) => void;
}> = ({ files, initialFileId, onLaunchApp }) => {
  const exeItem = files.find((f) => f.id === initialFileId);

  return (
    <div className="flex flex-col h-full bg-[#161616] text-white p-6 items-center justify-center">
      <div className="max-w-md w-full p-6 rounded-xl bg-[#202020] border border-white/[0.1] space-y-4 text-center">
        <Cpu className="w-10 h-10 text-[#60cdff] mx-auto" />
        <div className="text-sm font-semibold">
          {exeItem ? exeItem.name : 'Win32 / WebAssembly Sandbox Runner'}
        </div>
        <p className="text-xs text-neutral-400">
          Verified Windows 11 24H2 Executable Container. Click below to launch inside the interactive
          runtime.
        </p>
        {exeItem && (
          <button
            onClick={() =>
              onLaunchApp('edge', {
                fileId: exeItem.id,
                customTitle: exeItem.name,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Launch Executable</span>
          </button>
        )}
      </div>
    </div>
  );
};
