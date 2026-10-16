import React from 'react';
import { PlaySquare } from 'lucide-react';
import { FileSystemItem } from '../../types/os';

export const MediaPlayerApp: React.FC<{
  files: FileSystemItem[];
  initialFileId?: string;
  onCreateItem?: (
    name: string,
    type: FileSystemItem['type'],
    parentId?: string,
    extra?: Partial<FileSystemItem>
  ) => FileSystemItem;
}> = ({ files, initialFileId }) => {
  const mediaFiles = files.filter(
    (f) => f.parentId !== 'recyclebin' && (f.type === 'video' || f.type === 'audio')
  );
  const active = files.find((f) => f.id === initialFileId) || mediaFiles[0];

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white select-none p-6 items-center justify-center">
      {active && active.mediaUrl ? (
        active.type === 'video' ? (
          <video src={active.mediaUrl} controls autoPlay className="max-h-full max-w-full rounded" />
        ) : (
          <div className="text-center space-y-4">
            <PlaySquare className="w-12 h-12 text-[#60cdff] mx-auto" />
            <div className="text-sm font-semibold">{active.name}</div>
            <audio src={active.mediaUrl} controls autoPlay />
          </div>
        )
      ) : (
        <div className="text-center space-y-2 text-xs text-neutral-400">
          <PlaySquare className="w-10 h-10 text-[#60cdff] mx-auto mb-2" />
          <div className="text-sm font-semibold text-white">Windows 11 Media Player</div>
          <p>Open any audio or video file from File Explorer to play it here.</p>
        </div>
      )}
    </div>
  );
};
