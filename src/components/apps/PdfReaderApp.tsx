import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { FileSystemItem } from '../../types/os';

export const PdfReaderApp: React.FC<{
  files: FileSystemItem[];
  initialFileId?: string;
  onUpdateFile?: (id: string, content: string, extra?: Partial<FileSystemItem>) => void;
  onCreateFile?: (
    name: string,
    content: string,
    parentId?: string,
    extra?: Partial<FileSystemItem>
  ) => FileSystemItem;
}> = ({ files, initialFileId }) => {
  const active = files.find((f) => f.id === initialFileId);

  return (
    <div className="flex flex-col h-full bg-[#181818] text-white p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full bg-[#222222] border border-white/[0.08] rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-2 text-[#60cdff]">
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-sm font-semibold">
            {active ? active.name : 'Windows 11 PDF Reader Pro'}
          </span>
        </div>
        <div className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
          {active?.content ||
            'Select a PDF document from This PC or Desktop to inspect its pages and annotations.'}
        </div>
      </div>
    </div>
  );
};
