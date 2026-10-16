import React from 'react';
import {
  Activity,
  Calculator,
  Code2,
  Cpu,
  FileCode,
  FileSpreadsheet,
  FileText,
  Folder,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Music,
  Palette,
  PlaySquare,
  Settings,
  ShoppingBag,
  Sparkles,
  Terminal,
  Trash2,
} from 'lucide-react';
import { AppId, FileItemType } from '../../types/os';

export const CUSTOM_ICON_PRESETS: Array<{ id: string; label: string; url: string }> = [
  {
    id: 'neon-cube',
    label: 'Sapphire Cube',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%230078d4"/><path d="M32 12L50 22V42L32 52L14 42V22L32 12Z" fill="%2360cdff" opacity="0.9"/></svg>',
  },
  {
    id: 'emerald-shield',
    label: 'Emerald Core',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%23059669"/><circle cx="32" cy="32" r="18" fill="%236ee7b7"/></svg>',
  },
  {
    id: 'amber-flame',
    label: 'Amber Studio',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%23d97706"/><polygon points="32,12 50,48 14,48" fill="%23fde68a"/></svg>',
  },
];

export const WindowsStartIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="9" height="9" rx="1.5" fill="#60cdff" />
    <rect x="13" y="2" width="9" height="9" rx="1.5" fill="#38bdf8" />
    <rect x="2" y="13" width="9" height="9" rx="1.5" fill="#0284c7" />
    <rect x="13" y="13" width="9" height="9" rx="1.5" fill="#0078d4" />
  </svg>
);

export const TaskViewIcon: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="4" width="12" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
    <rect x="10" y="7" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.25" />
  </svg>
);

export const CopilotSvgIcon: React.FC<{ size?: number; className?: string }> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <defs>
      <linearGradient id="cp-g1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0078d4" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
      <linearGradient id="cp-g2" x1="44" y1="4" x2="4" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    <path
      d="M12 28C10.5 24 11 18 15 14C19 10 26 10 30 14C32 16 33 19 33 22C33 27 29 31 24 31C20 31 17 28 17 25C17 22 19 20 22 20C24 20 25.5 21 26 22.5"
      stroke="url(#cp-g1)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M36 20C37.5 24 37 30 33 34C29 38 22 38 18 34C16 32 15 29 15 26C15 21 19 17 24 17C28 17 31 20 31 23C31 26 29 28 26 28C24 28 22.5 27 22 25.5"
      stroke="url(#cp-g2)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

let globalCustomIcons: Partial<Record<AppId, string>> = {};
export function setGlobalCustomAppIcons(icons?: Partial<Record<AppId, string>>) {
  if (icons) globalCustomIcons = { ...icons };
}

// Authentic Windows 11 Fluent Vector Icons
export const Win11ThisPCIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Stand */}
    <path d="M20 38h8v4h-8z" fill="#94a3b8" />
    <path d="M14 42h20v2H14z" rx="1" fill="#cbd5e1" />
    {/* Monitor body */}
    <rect x="6" y="8" width="36" height="28" rx="3.5" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
    {/* Screen with Windows 11 Bloom gradient */}
    <rect x="8.5" y="10.5" width="31" height="23" rx="2" fill="url(#pc-screen-grad)" />
    {/* Bloom petals */}
    <circle cx="24" cy="22" r="7" fill="#38bdf8" fillOpacity="0.8" />
    <circle cx="21" cy="20" r="5" fill="#0284c7" fillOpacity="0.9" />
    <circle cx="26" cy="24" r="5" fill="#60cdff" fillOpacity="0.9" />
    <defs>
      <linearGradient id="pc-screen-grad" x1="8" y1="10" x2="40" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="45%" stopColor="#0369a1" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>
  </svg>
);

export const Win11RecycleBinIcon: React.FC<{ size?: number; recycleHasItems?: boolean; className?: string }> = ({ size = 24, recycleHasItems = false, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    {/* Bin Rim */}
    <path d="M12 12h24l-2 26a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3l-2-26z" fill="url(#bin-glass-grad)" stroke="#38bdf8" strokeWidth="1.5" />
    <ellipse cx="24" cy="12" rx="12" ry="2.5" fill="#38bdf8" fillOpacity="0.4" stroke="#60cdff" strokeWidth="1" />
    {/* Ribbed lines */}
    <path d="M18 16l1.5 22M24 16v22M30 16l-1.5 22" stroke="#bae6fd" strokeWidth="1" strokeOpacity="0.6" strokeDasharray="2 1" />
    {recycleHasItems ? (
      /* Paper sheets inside when full */
      <g>
        <path d="M17 15l10-4 4 6-10 4z" fill="#f8fafc" fillOpacity="0.95" />
        <path d="M22 17l6-3 3 4-6 3z" fill="#93c5fd" fillOpacity="0.9" />
        <path d="M18 19l8-2 2 4-8 2z" fill="#e2e8f0" />
      </g>
    ) : (
      /* Recycle arrows on glass when empty */
      <g transform="translate(17, 21) scale(0.6)" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 3-3 3M15 5H6a4 4 0 0 0-4 4v1" />
        <path d="M2 14l-3 3 3 3M-1 17h9a4 4 0 0 0 4-4v-1" />
      </g>
    )}
    <defs>
      <linearGradient id="bin-glass-grad" x1="12" y1="12" x2="36" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.65" />
      </linearGradient>
    </defs>
  </svg>
);

export const Win11EdgeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <defs>
      <linearGradient id="edge-swirl-1" x1="8" y1="28" x2="38" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0c83eb" />
        <stop offset="100%" stopColor="#004e92" />
      </linearGradient>
      <linearGradient id="edge-swirl-2" x1="20" y1="4" x2="44" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="50%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>
    {/* Bottom swirl */}
    <path
      d="M39.5 28.5C38 36.5 30 42 22 42C12.5 42 6 34 6 25C6 14.5 14 6 25 6C34 6 41 12 41 20C41 24 38 27 34 27C29 27 28 23 28 20C28 14 31 10 25 10C17 10 13 18 13 25C13 32 17 37 23 37C28 37 32 34 34.5 30.5L39.5 28.5Z"
      fill="url(#edge-swirl-1)"
    />
    {/* Top wave wrap */}
    <path
      d="M25 6C35 6 42 12.5 42 21C42 25 39 28 35 28C30.5 28 29.5 24 29.5 21C29.5 15.5 33 11 25.5 11C18 11 13 18.5 13 25.5C13 21 16 11 25 6Z"
      fill="url(#edge-swirl-2)"
    />
  </svg>
);

export const Win11SettingsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <defs>
      <linearGradient id="gear-grad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="gear-blue" x1="18" y1="18" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60cdff" />
        <stop offset="100%" stopColor="#0078d4" />
      </linearGradient>
    </defs>
    {/* Back large gear */}
    <circle cx="21" cy="27" r="14" fill="url(#gear-grad)" />
    <circle cx="21" cy="27" r="6" fill="#1e293b" />
    <path d="M21 10v4M21 40v4M4 27h4M34 27h4M9 15l3 3M30 36l3 3M9 39l3-3M30 18l3-3" stroke="url(#gear-grad)" strokeWidth="4.5" strokeLinecap="round" />
    {/* Foreground modern blue cog */}
    <circle cx="32" cy="18" r="9" fill="url(#gear-blue)" />
    <circle cx="32" cy="18" r="3.5" fill="#f8fafc" />
    <path d="M32 6v3M32 27v3M20 18h3M41 18h3M23.5 9.5l2 2M38.5 24.5l2 2M23.5 26.5l2-2M38.5 11.5l2-2" stroke="url(#gear-blue)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const Win11FolderIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <defs>
      <linearGradient id="f-back" x1="4" y1="12" x2="44" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id="f-front" x1="4" y1="20" x2="44" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    {/* Folder back & tab */}
    <path d="M4 14a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V14z" fill="url(#f-back)" />
    {/* White sheet inside */}
    <rect x="9" y="16" width="30" height="18" rx="1.5" fill="#ffffff" fillOpacity="0.9" />
    {/* Folder front body */}
    <path d="M4 22a2 2 0 0 1 2-2h36a2 2 0 0 1 2 2v16a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V22z" fill="url(#f-front)" />
    {/* Modern subtle blue badge clip */}
    <rect x="20" y="24" width="8" height="2.5" rx="1.2" fill="#0284c7" fillOpacity="0.75" />
  </svg>
);

export const Win11TerminalIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="5" y="8" width="38" height="32" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
    <path d="M5 16h38" stroke="#1e293b" strokeWidth="1.5" />
    <circle cx="10" cy="12" r="1.5" fill="#ef4444" />
    <circle cx="15" cy="12" r="1.5" fill="#f59e0b" />
    <circle cx="20" cy="12" r="1.5" fill="#10b981" />
    <path d="M12 24l5 4-5 4M21 32h8" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Win11NotepadIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="10" y="6" width="28" height="36" rx="3.5" fill="#0284c7" />
    <rect x="14" y="9" width="22" height="30" rx="2" fill="#f8fafc" />
    <path d="M18 16h14M18 22h14M18 28h9" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    {/* Pencil */}
    <path d="M30 36l8-10 4 4-8 10-5 1 1-5z" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
  </svg>
);

export const Win11CalculatorIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="10" y="6" width="28" height="36" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
    <rect x="14" y="10" width="20" height="8" rx="2" fill="#334155" />
    <rect x="14" y="22" width="4.5" height="4.5" rx="1" fill="#475569" />
    <rect x="21.5" y="22" width="4.5" height="4.5" rx="1" fill="#475569" />
    <rect x="29.5" y="22" width="4.5" height="4.5" rx="1" fill="#0284c7" />
    <rect x="14" y="29" width="4.5" height="4.5" rx="1" fill="#475569" />
    <rect x="21.5" y="29" width="4.5" height="4.5" rx="1" fill="#475569" />
    <rect x="29.5" y="29" width="4.5" height="11.5" rx="1" fill="#0078d4" />
    <rect x="14" y="36" width="12" height="4.5" rx="1" fill="#475569" />
  </svg>
);

export const Win11PaintIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path
      d="M24 6C13.5 6 6 13.5 6 24C6 34.5 14 42 22 42C24.5 42 26 40 26 38C26 36.5 25.5 35 25.5 33.5C25.5 31.5 27 30 29 30H32C37.5 30 42 25.5 42 20C42 12.5 34 6 24 6Z"
      fill="#f8fafc"
      stroke="#cbd5e1"
      strokeWidth="1.5"
    />
    <circle cx="15" cy="18" r="3" fill="#ef4444" />
    <circle cx="24" cy="13" r="3" fill="#f59e0b" />
    <circle cx="33" cy="18" r="3" fill="#10b981" />
    <circle cx="18" cy="28" r="3" fill="#3b82f6" />
    {/* Brush */}
    <path d="M34 26l8 8-3 3-8-8z" fill="#d97706" />
    <path d="M33 25l-2-2 4-4 2 2z" fill="#475569" />
  </svg>
);

export const Win11PhotosIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="6" y="8" width="36" height="32" rx="4" fill="url(#photos-bg)" />
    <circle cx="17" cy="19" r="4.5" fill="#fbbf24" />
    <path d="M6 34l12-11 11 10 5-4 8 7v2a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V34z" fill="#0284c7" />
    <path d="M16 34l8-8 12 11 6-5 6 5v1a4 4 0 0 1-4 4H20z" fill="#0369a1" fillOpacity="0.8" />
    <defs>
      <linearGradient id="photos-bg" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="60%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

export const Win11TaskManagerIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect x="6" y="8" width="36" height="32" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
    <path d="M10 28l6-10 6 14 7-18 6 12 7-6" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 34h28" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 2" />
    <path d="M10 20h28" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 2" />
  </svg>
);

export const Win11SpotifyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <circle cx="24" cy="24" r="19" fill="#1ed760" />
    <path d="M14 18c6-1.5 14-1 20 2.5" stroke="#121212" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M16 23.5c5-1.2 11.5-.8 16.5 2" stroke="#121212" strokeWidth="3" strokeLinecap="round" />
    <path d="M17.5 29c4-1 9-.6 13 1.5" stroke="#121212" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const Win11MediaPlayerIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <defs>
      <linearGradient id="mp-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="50%" stopColor="#ea580c" />
        <stop offset="100%" stopColor="#e11d48" />
      </linearGradient>
      <linearGradient id="mp-ring" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffedd5" />
        <stop offset="100%" stopColor="#fed7aa" />
      </linearGradient>
    </defs>
    {/* Squircle base */}
    <rect x="5" y="5" width="38" height="38" rx="10" fill="url(#mp-bg)" />
    {/* Inner ring */}
    <circle cx="24" cy="24" r="13" stroke="url(#mp-ring)" strokeWidth="2.5" fill="none" strokeOpacity="0.9" />
    {/* Play triangle */}
    <polygon points="21,18 31,24 21,30" fill="#ffffff" />
  </svg>
);

export const Win11PdfIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <defs>
      <linearGradient id="pdf-grad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>
    {/* Page base */}
    <path d="M10 8a3 3 0 0 1 3-3h16l11 11v24a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
    {/* Fold corner */}
    <path d="M29 5v8a3 3 0 0 0 3 3h8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    {/* PDF red banner */}
    <rect x="8" y="22" width="26" height="12" rx="2" fill="url(#pdf-grad)" />
    <text x="11" y="31" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="sans-serif">PDF</text>
  </svg>
);

export const Win11InstallerIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <defs>
      <linearGradient id="box-top" x1="24" y1="6" x2="24" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60cdff" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="box-left" x1="8" y1="18" x2="24" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0078d4" />
        <stop offset="100%" stopColor="#004c99" />
      </linearGradient>
      <linearGradient id="box-right" x1="24" y1="18" x2="40" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
    </defs>
    {/* Isometric Package Box */}
    <path d="M24 6l16 8-16 8-16-8 16-8z" fill="url(#box-top)" />
    <path d="M8 14v18l16 10V22L8 14z" fill="url(#box-left)" />
    <path d="M40 14v18L24 42V22l16-8z" fill="url(#box-right)" />
    {/* Center installer badge disc */}
    <circle cx="24" cy="22" r="7" fill="#ffffff" fillOpacity="0.95" />
    <circle cx="24" cy="22" r="3" fill="#0078d4" />
  </svg>
);

export const Win11TextDocIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M10 8a3 3 0 0 1 3-3h16l11 11v24a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
    <path d="M29 5v8a3 3 0 0 0 3 3h8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    <line x1="16" y1="22" x2="32" y2="22" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="28" x2="32" y2="28" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    <line x1="16" y1="34" x2="26" y2="34" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Win11CodeDocIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M10 8a3 3 0 0 1 3-3h16l11 11v24a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8z" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
    <path d="M29 5v8a3 3 0 0 0 3 3h8" fill="#1e293b" stroke="#334155" strokeWidth="1.2" />
    <path d="M19 24l-4 4 4 4M29 24l4 4-4 4M26 21l-4 14" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Win11ImageDocIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M10 8a3 3 0 0 1 3-3h16l11 11v24a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
    <path d="M29 5v8a3 3 0 0 0 3 3h8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    <rect x="15" y="20" width="18" height="15" rx="2" fill="#38bdf8" fillOpacity="0.25" stroke="#0284c7" strokeWidth="1" />
    <circle cx="19" cy="24" r="1.8" fill="#f59e0b" />
    <path d="M15 31l5-4 4 3 4-4 5 5v1h-18z" fill="#0284c7" />
  </svg>
);

export const Win11AudioDocIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M10 8a3 3 0 0 1 3-3h16l11 11v24a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
    <path d="M29 5v8a3 3 0 0 0 3 3h8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    <circle cx="21" cy="33" r="3" fill="#10b981" />
    <path d="M24 33V20l8-3v11" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
    <circle cx="29" cy="30" r="2.5" fill="#10b981" />
  </svg>
);

export const Win11VideoDocIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M10 8a3 3 0 0 1 3-3h16l11 11v24a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
    <path d="M29 5v8a3 3 0 0 0 3 3h8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    <rect x="15" y="22" width="18" height="13" rx="2" fill="#ea580c" />
    <polygon points="22,25 28,28.5 22,32" fill="#ffffff" />
  </svg>
);

export const Win11HtmlDocIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path d="M10 8a3 3 0 0 1 3-3h16l11 11v24a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V8z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
    <path d="M29 5v8a3 3 0 0 0 3 3h8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.2" />
    <circle cx="24" cy="28" r="7" stroke="#0078d4" strokeWidth="1.5" fill="none" />
    <ellipse cx="24" cy="28" rx="3.5" ry="7" stroke="#0078d4" strokeWidth="1.2" fill="none" />
    <line x1="17" y1="28" x2="31" y2="28" stroke="#0078d4" strokeWidth="1.2" />
  </svg>
);

export const AppIconRenderer: React.FC<{
  appId: AppId;
  size?: number;
  recycleHasItems?: boolean;
  customIconUrl?: string;
}> = ({ appId, size = 24, recycleHasItems = false, customIconUrl }) => {
  if (customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt={appId}
        style={{ width: size, height: size }}
        className="object-contain rounded"
      />
    );
  }

  switch (appId) {
    case 'thispc':
      return <Win11ThisPCIcon size={size} />;
    case 'recyclebin':
      return <Win11RecycleBinIcon size={size} recycleHasItems={recycleHasItems} />;
    case 'edge':
      return <Win11EdgeIcon size={size} />;
    case 'copilot':
      return <CopilotSvgIcon size={size} />;
    case 'vscode':
      return <VSCodeSvgIcon size={size} />;
    case 'taskmanager':
      return <Win11TaskManagerIcon size={size} />;
    case 'paint':
      return <Win11PaintIcon size={size} />;
    case 'store':
      return <MicrosoftStoreSvgIcon size={size} />;
    case 'spotify':
      return <Win11SpotifyIcon size={size} />;
    case 'terminal':
      return <Win11TerminalIcon size={size} />;
    case 'notepad':
      return <Win11NotepadIcon size={size} />;
    case 'calculator':
      return <Win11CalculatorIcon size={size} />;
    case 'photos':
      return <Win11PhotosIcon size={size} />;
    case 'mediaplayer':
      return <Win11MediaPlayerIcon size={size} />;
    case 'pdfreader':
      return <Win11PdfIcon size={size} />;
    case 'installer':
      return <Win11InstallerIcon size={size} />;
    case 'settings':
    default:
      return <Win11SettingsIcon size={size} />;
  }
};

export const FileItemIconRenderer: React.FC<{
  type: FileItemType;
  name?: string;
  customIconUrl?: string;
  size?: number;
  appId?: AppId;
  exePreset?: string;
  recycleHasItems?: boolean;
}> = ({ type, name = '', customIconUrl, size = 24, appId, recycleHasItems }) => {
  if (appId) {
    return <AppIconRenderer appId={appId} size={size} recycleHasItems={recycleHasItems} customIconUrl={customIconUrl} />;
  }
  if (customIconUrl) {
    return (
      <img
        src={customIconUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="object-contain rounded shrink-0"
      />
    );
  }

  switch (type) {
    case 'folder':
      return <Win11FolderIcon size={size} />;
    case 'html':
      return <Win11HtmlDocIcon size={size} />;
    case 'code':
      return <Win11CodeDocIcon size={size} />;
    case 'image':
      return <Win11ImageDocIcon size={size} />;
    case 'audio':
      return <Win11AudioDocIcon size={size} />;
    case 'video':
      return <Win11VideoDocIcon size={size} />;
    case 'pdf':
      return <Win11PdfIcon size={size} />;
    case 'exe':
      return <Win11InstallerIcon size={size} />;
    default:
      return <Win11TextDocIcon size={size} />;
  }
};

export const MicrosoftStoreSvgIcon: React.FC<{ size?: number; className?: string }> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <rect width="48" height="48" rx="10" fill="#0078d4" />
    <path d="M12 16h24l-3 20H15l-3-20z" fill="#ffffff" fillOpacity="0.9" />
    <path d="M18 16V13a6 6 0 0 1 12 0v3" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    <circle cx="21" cy="24" r="1.5" fill="#0078d4" />
    <circle cx="27" cy="24" r="1.5" fill="#0078d4" />
    <circle cx="21" cy="30" r="1.5" fill="#0078d4" />
    <circle cx="27" cy="30" r="1.5" fill="#0078d4" />
  </svg>
);

export const VSCodeSvgIcon: React.FC<{ size?: number; className?: string }> = ({ size = 22, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
    <path
      d="M36.5 4.5l-13 12.3-9.5-7.3-3.5 1.7v25.6l3.5 1.7 9.5-7.3 13 12.3 8-3.8V8.3l-8-3.8zm-19 23.5l-4-3 4-3v6zm13 3l-8.5-6.5 8.5-6.5v13zm4.5 5.5l-9-8.5 9-8.5v17z"
      fill="#0078d4"
    />
  </svg>
);

export const StoreAppIconRenderer: React.FC<{
  app?: { id: string; name: string; accent?: string; iconText?: string; iconSvgDataUrl?: string };
  storeAppId?: string;
  size?: number;
  accent?: string;
  iconText?: string;
  className?: string;
}> = ({ app, storeAppId, size = 24, accent, iconText, className = '' }) => {
  if (app?.iconSvgDataUrl) {
    return <img src={app.iconSvgDataUrl} alt={app.name} style={{ width: size, height: size }} className={`rounded object-contain shrink-0 ${className}`} />;
  }
  const bg = app?.accent || accent || '#0078d4';
  const text = app?.iconText || iconText || (app?.name ? app.name.slice(0, 2).toUpperCase() : (storeAppId ? storeAppId.replace('store-', '').slice(0, 2).toUpperCase() : 'APP'));
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
      }}
      className={`rounded-[6px] flex items-center justify-center text-white font-bold text-[11px] shadow-sm shrink-0 ${className}`}
    >
      {text}
    </div>
  );
};

export function getStoreAppSvgDataUrl(titleOrId: string, accent = '#0078d4', iconText?: string): string {
  const letters = iconText || titleOrId.replace('store-', '').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${accent}"/><text x="32" y="40" font-family="Segoe UI, sans-serif" font-weight="700" font-size="24" fill="#ffffff" text-anchor="middle">${letters}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
