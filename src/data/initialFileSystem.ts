import { AppDefinition, FileSystemItem, SpotifyTrack } from '../types/os';

// 1. Official Windows 11 Bloom (Dark)
const WIN11_BLOOM_DARK_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#04142c"/>
      <stop offset="55%" stop-color="#020b18"/>
      <stop offset="100%" stop-color="#00040a"/>
    </radialGradient>
    <radialGradient id="fold1" cx="48%" cy="42%" r="42%">
      <stop offset="0%" stop-color="#3b9eff"/>
      <stop offset="35%" stop-color="#0067c0"/>
      <stop offset="75%" stop-color="#002b5e"/>
      <stop offset="100%" stop-color="#00122e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="petalA" x1="25%" y1="15%" x2="75%" y2="85%">
      <stop offset="0%" stop-color="#60cdff"/>
      <stop offset="32%" stop-color="#0078d4"/>
      <stop offset="72%" stop-color="#00397a"/>
      <stop offset="100%" stop-color="#041533"/>
    </linearGradient>
    <linearGradient id="petalB" x1="70%" y1="10%" x2="30%" y2="90%">
      <stop offset="0%" stop-color="#4cc2ff"/>
      <stop offset="40%" stop-color="#005fb8"/>
      <stop offset="80%" stop-color="#00224b"/>
      <stop offset="100%" stop-color="#010a1c"/>
    </linearGradient>
    <linearGradient id="petalC" x1="20%" y1="80%" x2="80%" y2="20%">
      <stop offset="0%" stop-color="#0091ff"/>
      <stop offset="45%" stop-color="#004c99"/>
      <stop offset="90%" stop-color="#001b3a"/>
    </linearGradient>
    <linearGradient id="rim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#99ebff" stop-opacity="0.85"/>
      <stop offset="50%" stop-color="#0078d4" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#001b3a" stop-opacity="0"/>
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="36" />
    </filter>
    <filter id="dropShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="22" stdDeviation="28" flood-color="#000511" flood-opacity="0.75"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <circle cx="960" cy="520" r="520" fill="url(#fold1)" filter="url(#softGlow)"/>
  <g filter="url(#dropShadow)">
    <path d="M960,540 C680,190 430,270 490,560 C540,810 830,860 960,540 Z" fill="url(#petalA)" stroke="url(#rim)" stroke-width="2.5"/>
    <path d="M960,540 C1240,180 1490,280 1420,570 C1360,820 1070,860 960,540 Z" fill="url(#petalB)" stroke="url(#rim)" stroke-width="2.5"/>
    <path d="M960,540 C720,240 1200,240 960,540 Z" fill="url(#petalC)" stroke="url(#rim)" stroke-width="2"/>
    <path d="M960,540 C580,440 590,890 950,840 C1310,890 1340,440 960,540 Z" fill="url(#petalB)" opacity="0.92" stroke="url(#rim)" stroke-width="2.5"/>
    <path d="M960,520 C760,340 670,580 860,690 C1040,790 1190,520 960,520 Z" fill="url(#petalA)" stroke="url(#rim)" stroke-width="3"/>
    <path d="M960,520 C1140,330 1260,560 1060,680 C880,780 780,530 960,520 Z" fill="url(#petalC)" opacity="0.88" stroke="url(#rim)" stroke-width="2.5"/>
    <ellipse cx="960" cy="515" rx="145" ry="110" fill="url(#petalA)" transform="rotate(-18 960 515)" stroke="url(#rim)" stroke-width="2"/>
  </g>
</svg>`);

// 2. Official Windows 11 Bloom (Light)
const WIN11_BLOOM_LIGHT_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="lbg" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#f0f6ff"/>
      <stop offset="60%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#bfdbfe"/>
    </radialGradient>
    <linearGradient id="lpA" x1="20%" y1="10%" x2="80%" y2="90%">
      <stop offset="0%" stop-color="#60cdff"/>
      <stop offset="45%" stop-color="#0078d4"/>
      <stop offset="100%" stop-color="#004286"/>
    </linearGradient>
    <linearGradient id="lpB" x1="80%" y1="15%" x2="20%" y2="85%">
      <stop offset="0%" stop-color="#93c5fd"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <filter id="lShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="20" stdDeviation="25" flood-color="#1e3a8a" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#lbg)"/>
  <g filter="url(#lShadow)">
    <path d="M960,540 C680,190 430,270 490,560 C540,810 830,860 960,540 Z" fill="url(#lpA)" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2"/>
    <path d="M960,540 C1240,180 1490,280 1420,570 C1360,820 1070,860 960,540 Z" fill="url(#lpB)" stroke="#ffffff" stroke-opacity="0.6" stroke-width="2"/>
    <path d="M960,540 C580,440 590,890 950,840 C1310,890 1340,440 960,540 Z" fill="url(#lpB)" opacity="0.9" stroke="#ffffff" stroke-opacity="0.5" stroke-width="2"/>
    <path d="M960,520 C760,340 670,580 860,690 C1040,790 1190,520 960,520 Z" fill="url(#lpA)" stroke="#ffffff" stroke-opacity="0.8" stroke-width="2.5"/>
    <ellipse cx="960" cy="515" rx="145" ry="110" fill="url(#lpA)" transform="rotate(-18 960 515)" stroke="#ffffff" stroke-opacity="0.8" stroke-width="2"/>
  </g>
</svg>`);

// 3. New Windows 11 24H2 Copilot Fluid Bloom (Official 24H2 Colorful Ribbon)
const WIN11_24H2_COPILOT_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="cbg" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#0b1120"/>
      <stop offset="60%" stop-color="#060913"/>
      <stop offset="100%" stop-color="#020409"/>
    </radialGradient>
    <linearGradient id="cRib1" x1="0%" y1="20%" x2="100%" y2="80%">
      <stop offset="0%" stop-color="#00f2fe"/>
      <stop offset="35%" stop-color="#0078d4"/>
      <stop offset="70%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="cRib2" x1="100%" y1="10%" x2="0%" y2="90%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="40%" stop-color="#ec4899"/>
      <stop offset="80%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="cRib3" x1="20%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <filter id="cShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#000000" flood-opacity="0.7"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#cbg)"/>
  <g filter="url(#cShadow)">
    <path d="M360,640 C480,180 960,180 1020,540 C1080,880 1440,840 1580,380 C1460,880 980,980 860,600 C740,220 460,360 360,640 Z" fill="url(#cRib1)" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
    <path d="M520,320 C880,140 1320,340 1240,680 C1160,960 660,920 620,560 C580,240 940,300 1120,540 C940,760 640,720 520,320 Z" fill="url(#cRib2)" opacity="0.88" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2"/>
    <ellipse cx="960" cy="540" rx="220" ry="135" fill="url(#cRib3)" transform="rotate(-24 960 540)" opacity="0.9" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2.5"/>
  </g>
</svg>`);

// 4. Official Windows 11 Glow (4 Glowing 3D Spheres)
const WIN11_GLOW_SPHERES_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <radialGradient id="gbg" cx="50%" cy="50%" r="80%">
      <stop offset="0%" stop-color="#0c1021"/>
      <stop offset="60%" stop-color="#060813"/>
      <stop offset="100%" stop-color="#020308"/>
    </radialGradient>
    <radialGradient id="sp1" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#f472b6"/>
      <stop offset="45%" stop-color="#9333ea"/>
      <stop offset="85%" stop-color="#311042"/>
      <stop offset="100%" stop-color="#090514"/>
    </radialGradient>
    <radialGradient id="sp2" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#60cdff"/>
      <stop offset="45%" stop-color="#0078d4"/>
      <stop offset="85%" stop-color="#0c2d57"/>
      <stop offset="100%" stop-color="#040d1a"/>
    </radialGradient>
    <radialGradient id="sp3" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#fb923c"/>
      <stop offset="50%" stop-color="#db2777"/>
      <stop offset="90%" stop-color="#4c0519"/>
      <stop offset="100%" stop-color="#110207"/>
    </radialGradient>
    <filter id="glowBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="50"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#gbg)"/>
  <circle cx="720" cy="480" r="320" fill="#7c3aed" opacity="0.28" filter="url(#glowBlur)"/>
  <circle cx="1180" cy="560" r="340" fill="#0078d4" opacity="0.28" filter="url(#glowBlur)"/>
  <circle cx="960" cy="540" r="240" fill="url(#sp2)"/>
  <circle cx="670" cy="430" r="165" fill="url(#sp1)"/>
  <circle cx="1250" cy="460" r="150" fill="url(#sp3)"/>
  <circle cx="1090" cy="760" r="115" fill="url(#sp1)"/>
</svg>`);

// 5. Official Windows 11 Captured Motion
const WIN11_CAPTURED_MOTION_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="cmBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090414"/>
      <stop offset="50%" stop-color="#120924"/>
      <stop offset="100%" stop-color="#050814"/>
    </linearGradient>
    <linearGradient id="cmWave1" x1="0%" y1="30%" x2="100%" y2="70%">
      <stop offset="0%" stop-color="#ff2a85" stop-opacity="0"/>
      <stop offset="30%" stop-color="#ff2a85"/>
      <stop offset="65%" stop-color="#ff7b00"/>
      <stop offset="100%" stop-color="#ffae00" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="cmWave2" x1="0%" y1="70%" x2="100%" y2="20%">
      <stop offset="0%" stop-color="#00d2ff" stop-opacity="0"/>
      <stop offset="35%" stop-color="#0078d4"/>
      <stop offset="70%" stop-color="#7928ca"/>
      <stop offset="100%" stop-color="#ff0080" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#cmBg)"/>
  <path d="M100,820 C520,220 960,920 1420,260 C1620,100 1780,380 1860,220" fill="none" stroke="url(#cmWave2)" stroke-width="155" stroke-linecap="round" opacity="0.85"/>
  <path d="M180,300 C640,940 1120,160 1560,780 C1700,920 1800,640 1840,720" fill="none" stroke="url(#cmWave1)" stroke-width="140" stroke-linecap="round" opacity="0.9"/>
</svg>`);

// 6. Official Windows 11 Sunrise
const WIN11_SUNRISE_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="srSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="38%" stop-color="#38bdf8"/>
      <stop offset="72%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <radialGradient id="srSun" cx="50%" cy="68%" r="45%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="35%" stop-color="#fef08a" stop-opacity="0.75"/>
      <stop offset="70%" stop-color="#fb923c" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#fb923c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#srSky)"/>
  <rect width="1920" height="1080" fill="url(#srSun)"/>
  <path d="M0,780 Q480,680 960,750 T1920,730 L1920,1080 L0,1080 Z" fill="#0f172a" opacity="0.35"/>
  <path d="M0,850 Q620,760 1180,830 T1920,810 L1920,1080 L0,1080 Z" fill="#090d16" opacity="0.65"/>
</svg>`);

// 7. Official Windows 11 Flow (Abstract Architectural Silk Waves)
const WIN11_FLOW_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
  <defs>
    <linearGradient id="flBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#090d16"/>
    </linearGradient>
    <linearGradient id="flRibA" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
    <linearGradient id="flRibB" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a5f3fc"/>
      <stop offset="55%" stop-color="#0078d4"/>
      <stop offset="100%" stop-color="#172554"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#flBg)"/>
  <path d="M-100,260 C420,-40 940,660 1480,220 C1720,40 1920,300 2020,180 L2020,1080 L-100,1080 Z" fill="url(#flRibA)" opacity="0.8"/>
  <path d="M-100,520 C520,240 1060,840 1620,420 C1800,280 1920,480 2020,420 L2020,1080 L-100,1080 Z" fill="url(#flRibB)" opacity="0.9"/>
</svg>`);

export const APP_DEFINITIONS: AppDefinition[] = [
  {
    id: 'thispc',
    name: 'This PC',
    category: 'System',
    description: 'File Explorer, drives, folders, and local PC files',
    defaultSize: { width: 960, height: 620 },
    pinnedToTaskbar: true,
    pinnedToStart: true,
  },
  {
    id: 'store',
    name: 'Microsoft Store',
    category: 'System',
    description: 'Download and install apps, utilities, and games to your Desktop',
    defaultSize: { width: 980, height: 640 },
    pinnedToTaskbar: true,
    pinnedToStart: true,
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    category: 'Productivity',
    description: 'Web browser, PDF viewer, video player, and Win32/HTML app host',
    defaultSize: { width: 980, height: 640 },
    pinnedToTaskbar: true,
    pinnedToStart: true,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    category: 'Media',
    description: 'Music player with background taskbar playback & live song search',
    defaultSize: { width: 940, height: 610 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'copilot',
    name: 'Copilot',
    category: 'System',
    description: 'Windows 11 AI Assistant with Google Search grounding & OS control',
    defaultSize: { width: 880, height: 620 },
    pinnedToTaskbar: true,
    pinnedToStart: true,
  },
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    category: 'Development',
    description: 'Folder-based Code IDE with IntelliSense, AI Coding Assistant, and Folder Media support',
    defaultSize: { width: 1020, height: 650 },
    pinnedToTaskbar: true,
    pinnedToStart: true,
  },
  {
    id: 'notepad',
    name: 'Notepad',
    category: 'Productivity',
    description: 'Text and source code editor',
    defaultSize: { width: 820, height: 560 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'terminal',
    name: 'Terminal',
    category: 'Development',
    description: 'Windows PowerShell & Command Prompt',
    defaultSize: { width: 800, height: 500 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'settings',
    name: 'Settings',
    category: 'System',
    description: 'System, Display, Sound, Personalization, Taskbar, and Accounts',
    defaultSize: { width: 940, height: 640 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'pdfreader',
    name: 'PDF Reader',
    category: 'Productivity',
    description: 'Read, annotate, highlight, and export PDF documents',
    defaultSize: { width: 960, height: 640 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'mediaplayer',
    name: 'Media Player',
    category: 'Media',
    description: 'Windows 11 Video & Audio Player with Equalizer',
    defaultSize: { width: 960, height: 630 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'installer',
    name: 'Import Local File',
    category: 'System',
    description: 'Import and run any file, video, MP3, PDF, image, ZIP, or .exe from your PC',
    defaultSize: { width: 900, height: 600 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    category: 'Utilities',
    description: 'Standard & scientific calculator',
    defaultSize: { width: 380, height: 540 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'paint',
    name: 'Paint',
    category: 'Productivity',
    description: 'Digital canvas drawing and image export',
    defaultSize: { width: 880, height: 580 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'photos',
    name: 'Photos',
    category: 'Media',
    description: 'Image viewer and gallery',
    defaultSize: { width: 860, height: 580 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'taskmanager',
    name: 'Task Manager',
    category: 'System',
    description: 'Active processes and system resource monitor',
    defaultSize: { width: 820, height: 540 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
  {
    id: 'recyclebin',
    name: 'Recycle Bin',
    category: 'System',
    description: 'Deleted files recovery and management',
    defaultSize: { width: 880, height: 560 },
    pinnedToTaskbar: false,
    pinnedToStart: true,
  },
];

export const WALLPAPERS = [
  {
    id: 'bloom-dark',
    name: 'Windows 11 Bloom (Dark)',
    url: WIN11_BLOOM_DARK_SVG,
    style: 'radial-gradient(circle at 50% 45%, #004c99 0%, #020b18 65%, #00040a 100%)',
    gradient: 'radial-gradient(circle at 50% 45%, #004c99 0%, #020b18 65%, #00040a 100%)',
  },
  {
    id: 'bloom-light',
    name: 'Windows 11 Bloom (Light)',
    url: WIN11_BLOOM_LIGHT_SVG,
    style: 'radial-gradient(circle at 50% 45%, #60cdff 0%, #dbeafe 70%, #bfdbfe 100%)',
    gradient: 'radial-gradient(circle at 50% 45%, #60cdff 0%, #dbeafe 70%, #bfdbfe 100%)',
  },
  {
    id: 'win11-24h2-copilot',
    name: 'Windows 11 24H2 Bloom',
    url: WIN11_24H2_COPILOT_SVG,
    style: 'linear-gradient(135deg, #0078d4 0%, #7c3aed 50%, #ec4899 100%)',
    gradient: 'linear-gradient(135deg, #0078d4 0%, #7c3aed 50%, #ec4899 100%)',
  },
  {
    id: 'sunset-mica',
    name: 'Windows 11 Glow',
    url: WIN11_GLOW_SPHERES_SVG,
    style: 'linear-gradient(135deg, #0c1021 0%, #7c3aed 50%, #0078d4 100%)',
    gradient: 'linear-gradient(135deg, #0c1021 0%, #7c3aed 50%, #0078d4 100%)',
  },
  {
    id: 'win11-captured-motion',
    name: 'Windows 11 Captured Motion',
    url: WIN11_CAPTURED_MOTION_SVG,
    style: 'linear-gradient(135deg, #120924 0%, #ff2a85 50%, #0078d4 100%)',
    gradient: 'linear-gradient(135deg, #120924 0%, #ff2a85 50%, #0078d4 100%)',
  },
  {
    id: 'win11-sunrise',
    name: 'Windows 11 Sunrise',
    url: WIN11_SUNRISE_SVG,
    style: 'linear-gradient(180deg, #1e3a8a 0%, #38bdf8 45%, #f97316 100%)',
    gradient: 'linear-gradient(180deg, #1e3a8a 0%, #38bdf8 45%, #f97316 100%)',
  },
  {
    id: 'win11-flow',
    name: 'Windows 11 Flow',
    url: WIN11_FLOW_SVG,
    style: 'linear-gradient(135deg, #0f172a 0%, #0284c7 55%, #1e3a8a 100%)',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #0284c7 55%, #1e3a8a 100%)',
  },
  {
    id: 'abstract-fluid',
    name: 'Windows 11 SE Fluid',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)',
  },
  {
    id: 'alpine-peaks',
    name: 'Windows Spotlight: Alpine Peaks',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
  },
  {
    id: 'northern-aurora',
    name: 'Windows Spotlight: Aurora Borealis',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)',
  },
  {
    id: 'cyberpunk-tokyo',
    name: 'Windows Spotlight: Tokyo Night',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #311042 0%, #090d16 100%)',
  },
  {
    id: 'sahara-dunes',
    name: 'Windows Spotlight: Golden Dunes',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #78350f 0%, #1c1917 100%)',
  },
  {
    id: 'swiss-lake',
    name: 'Windows Spotlight: Emerald Lake',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #065f46 0%, #111827 100%)',
  },
  {
    id: 'deep-ocean',
    name: 'Windows Spotlight: Pacific Horizon',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #020617 100%)',
  },
  {
    id: 'autumn-forest',
    name: 'Windows Spotlight: Misty Woods',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #14532d 0%, #090d16 100%)',
  },
  {
    id: 'cosmic-nebula',
    name: 'Windows Spotlight: Carina Nebula',
    url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #3b0764 0%, #030712 100%)',
  },
  {
    id: 'sunset-canyon',
    name: 'Windows Spotlight: Crimson Horizon',
    url: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #111827 100%)',
  },
  {
    id: 'snow-peaks',
    name: 'Windows Spotlight: Arctic Peaks',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  },
  {
    id: 'win11-glow-purple',
    name: 'Windows 11 Glow (Purple Petals)',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #0f172a 100%)',
  },
  {
    id: 'win11-captured-motion',
    name: 'Windows 11 Captured Motion (Light Ribbon)',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
  },
  {
    id: 'win11-nordic-fjord',
    name: 'Windows Spotlight: Nordic Fjord',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #082f49 100%)',
  },
  {
    id: 'win11-dark-mica',
    name: 'Windows 11 Dark Mica Geometric',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
  },
  {
    id: 'win11-flow-light',
    name: 'Windows 11 Flow (Light Silk)',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #93c5fd 0%, #c084fc 50%, #f472b6 100%)',
  },
  {
    id: 'win11-cloud-bloom',
    name: 'Windows 365 Cloud Bloom',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #6366f1 60%, #0f172a 100%)',
  },
  {
    id: 'win11-neon-grid',
    name: 'Windows 11 Neon Horizon',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #701a75 100%)',
  },
  {
    id: 'win11-desert-dusk',
    name: 'Windows Spotlight: Desert Dusk',
    url: 'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #0f172a 100%)',
  },
  {
    id: 'win11-emerald-valley',
    name: 'Windows Spotlight: Emerald Valley',
    url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #022c22 100%)',
  },
  {
    id: 'win11-sapphire-prism',
    name: 'Windows 11 Sapphire Prism',
    url: 'https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&w=1920&q=85',
    style: 'url("https://images.unsplash.com/photo-1550684847-75bdda21cc95?auto=format&fit=crop&w=600&q=80") center/cover',
    gradient: 'linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #0f172a 100%)',
  },
];

// Authentic Windows 11 Desktop Icons (Clean Single-Column Layout)
export const INITIAL_FILE_SYSTEM: FileSystemItem[] = [
  {
    id: 'desk-thispc',
    name: 'This PC',
    type: 'app',
    appId: 'thispc',
    parentId: 'desktop',
    size: 0,
    createdAt: '2026-10-01',
    gridCol: 0,
    gridRow: 0,
  },
  {
    id: 'desk-recyclebin',
    name: 'Recycle Bin',
    type: 'app',
    appId: 'recyclebin',
    parentId: 'desktop',
    size: 0,
    createdAt: '2026-10-01',
    gridCol: 0,
    gridRow: 1,
  },
  {
    id: 'desk-edge',
    name: 'Microsoft Edge',
    type: 'app',
    appId: 'edge',
    parentId: 'desktop',
    size: 0,
    createdAt: '2026-10-01',
    gridCol: 0,
    gridRow: 2,
  },
  {
    id: 'desk-vscode',
    name: 'Visual Studio Code',
    type: 'app',
    appId: 'vscode',
    parentId: 'desktop',
    size: 0,
    createdAt: '2026-10-04',
    gridCol: 0,
    gridRow: 3,
  },
  {
    id: 'desk-copilot',
    name: 'Copilot',
    type: 'app',
    appId: 'copilot',
    parentId: 'desktop',
    size: 0,
    createdAt: '2026-10-01',
    gridCol: 0,
    gridRow: 4,
  },
  {
    id: 'desk-folder-projects',
    name: 'My Web Project',
    type: 'folder',
    parentId: 'documents',
    size: 0,
    createdAt: '2026-10-05',
  },
  {
    id: 'proj-index-html',
    name: 'index.html',
    type: 'html',
    parentId: 'desk-folder-projects',
    size: 2048,
    createdAt: '2026-10-05',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Web Project</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <h1>Welcome to My VS Code Web Project</h1>
    <p>This folder is managed in Visual Studio Code. You can add images and videos inside this folder and reference them directly by file name!</p>
    <img src="banner.jpg" alt="Project Banner" class="banner" />
    <div class="actions">
      <button id="actionBtn">Click to Run Script</button>
    </div>
    <p id="output"></p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
  },
  {
    id: 'proj-style-css',
    name: 'style.css',
    type: 'code',
    parentId: 'desk-folder-projects',
    size: 1024,
    createdAt: '2026-10-05',
    content: `body {
  margin: 0;
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}
.container {
  max-width: 680px;
  width: 100%;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 28px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.4);
}
h1 { color: #38bdf8; margin-top: 0; }
.banner {
  width: 100%;
  max-height: 260px;
  object-fit: cover;
  border-radius: 12px;
  margin: 16px 0;
  border: 1px solid #475569;
}
button {
  background: #0284c7;
  color: white;
  border: none;
  padding: 10px 22px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}
button:hover { background: #0369a1; }`,
  },
  {
    id: 'proj-script-js',
    name: 'script.js',
    type: 'code',
    parentId: 'desk-folder-projects',
    size: 512,
    createdAt: '2026-10-05',
    content: `document.getElementById('actionBtn')?.addEventListener('click', () => {
  const out = document.getElementById('output');
  if (out) {
    out.textContent = 'JavaScript executed from script.js at ' + new Date().toLocaleTimeString();
  }
});`,
  },
  {
    id: 'proj-banner-img',
    name: 'banner.jpg',
    type: 'image',
    parentId: 'desk-folder-projects',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
    size: 245000,
    createdAt: '2026-10-05',
  },

  // Documents folder items
  {
    id: 'doc-notes-1',
    name: 'System Notes.txt',
    type: 'text',
    parentId: 'documents',
    size: 1420,
    createdAt: '2026-10-03',
    content: `Windows 11 System Notes:\n- File Explorer supports multiple folders, search, and local PC file import.\n- Media files (.mp4, .mp3, .pdf, .png, .html, .txt) open natively with their real contents.`,
  },
  {
    id: 'doc-win11-guide-pdf',
    name: 'Windows 11 Pro Architecture & AI Guide.pdf',
    type: 'pdf',
    parentId: 'documents',
    size: 428000,
    createdAt: '2026-10-09',
    content: `# Windows 11 Pro (24H2) — Architecture & AI Guide\n\n## Page 1: Executive Overview\nWelcome to Windows 11 Pro (24H2). This system integrates native desktop window management, multi-user cloud profiles, and deep AI Copilot orchestration.\n\nKey highlights included in this release:\n1. Smart Local File Importer with native support for PDF, MP4, MP3, ZIP, HTML, and PE (.exe) binaries.\n2. Multi-Session AI Copilot with persistent chat history, session switching, and instant deletion.\n3. PDF Reader Studio with page navigation, highlighting, text search, voice read-aloud, and AI summarization.\n4. Windows Media Player Pro with a live 10-band Web Audio API equalizer and real-time frequency visualizer.\n\n---\n\n## Page 2: Smart File System & IndexedDB Persistence\nAll files imported from your physical computer are stored in high-capacity IndexedDB storage so large videos, audio tracks, and PDF documents persist across browser reloads without hitting localStorage quotas.\n\n- PDF documents open directly inside PDF Reader Studio.\n- Video & Audio streams route to Windows Media Player Pro.\n- Code & Web Projects open in Visual Studio Code or Microsoft Edge.\n- Executables (.exe / .msi / .zip) are analyzed and launched inside the Windows 11 App Virtualizer.\n\n---\n\n## Page 3: AI Copilot Studio & Shortcut Reference\nUse Windows Copilot to control system settings, generate complete playable games or productivity apps, and inspect open windows.\n\nKeyboard & System Shortcuts:\n- Press 0 or F1: Toggle Full-Screen Immersive Mode.\n- Right-Click any file: Choose "Open with..." to pick PDF Reader, Media Player, Edge, VS Code, or Notepad.\n- Drag & Drop from PC: Drop any file from your computer directly onto the Windows 11 Desktop to import and open it immediately.`,
  },
];

export const createSynthTrackWavUrl = (
  notesOrFreq: number | number[],
  durationSec = 8
): string => {
  const freq = Array.isArray(notesOrFreq) ? notesOrFreq[0] || 220 : notesOrFreq;
  return createSynthesizedWavUrl(freq, durationSec);
};

export function createSynthesizedWavUrl(freqBase: number, durationSec = 8): string {
  const sampleRate = 22050;
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  const notes = [freqBase, freqBase * 1.25, freqBase * 1.5, freqBase * 1.333];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIndex = Math.floor(t * 2) % notes.length;
    const freq = notes[noteIndex];
    const noteTime = (t * 2) % 1;
    const envelope = Math.exp(-noteTime * 3.5);
    const sample =
      (Math.sin(2 * Math.PI * freq * t) * 0.6 +
        Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.3) *
      envelope;
    const pcm = Math.max(-1, Math.min(1, sample)) * 16000;
    view.setInt16(44 + i * 2, pcm, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export const INITIAL_SPOTIFY_TRACKS: SpotifyTrack[] = [
  {
    id: 'real-amr-diab',
    title: 'نور العين (Nour El Ain)',
    artist: 'عمرو دياب (Amr Diab)',
    album: 'أحلى ما غنى الهضبة',
    duration: 179,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://discoveryprovider.audius.co/v1/tracks/yWpNlP/stream?app_name=win11spotify',
    isLiked: true,
    source: 'audius',
  },
  {
    id: 'real-cairokee',
    title: 'كان لك معايا (Kan Lak Maaya)',
    artist: 'كايروكي (Cairokee)',
    album: 'أبناء البطة السوداء',
    duration: 225,
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://discoveryprovider.audius.co/v1/tracks/BKoGx/stream?app_name=win11spotify',
    isLiked: true,
    source: 'audius',
  },
  {
    id: 'real-hamaki',
    title: 'يا ستار (Ya Sattar)',
    artist: 'محمد حماقي (Mohamed Hamaki)',
    album: 'كل يوم من ده',
    duration: 225,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://discoveryprovider.audius.co/v1/tracks/PV2PN/stream?app_name=win11spotify',
    isLiked: true,
    source: 'audius',
  },
  {
    id: 'real-wegz',
    title: 'سكرتي (Skerty)',
    artist: 'ويجز (Wegz)',
    album: 'Trap Masr Vol 1',
    duration: 211,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://discoveryprovider.audius.co/v1/tracks/yGjbw/stream?app_name=win11spotify',
    isLiked: true,
    source: 'audius',
  },
  {
    id: 'real-weeknd',
    title: 'Save Your Tears / Die For You',
    artist: 'The Weeknd & Ariana Grande',
    album: 'After Hours Hits',
    duration: 278,
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://discoveryprovider.audius.co/v1/tracks/WbKAQ8l/stream?app_name=win11spotify',
    isLiked: true,
    source: 'audius',
  },
  {
    id: 'real-coldplay',
    title: 'Clocks',
    artist: 'Coldplay',
    album: 'A Rush of Blood to the Head',
    duration: 322,
    coverUrl: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://discoveryprovider.audius.co/v1/tracks/Ja10V6Y/stream?app_name=win11spotify',
    isLiked: false,
    source: 'audius',
  },
  {
    id: 'real-dua-lipa',
    title: 'One Kiss',
    artist: 'Calvin Harris ft. Dua Lipa',
    album: 'Future Nostalgia Era',
    duration: 109,
    coverUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://discoveryprovider.audius.co/v1/tracks/bKvxEzy/stream?app_name=win11spotify',
    isLiked: true,
    source: 'audius',
  },
  {
    id: 'real-adele',
    title: 'Hello (Acoustic)',
    artist: 'Adele',
    album: '25 Deluxe Acoustic',
    duration: 228,
    coverUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
    audioUrl: 'https://discoveryprovider.audius.co/v1/tracks/2GpX6/stream?app_name=win11spotify',
    isLiked: true,
    source: 'audius',
  },
];

export const STRONGHOLD_CRUSADER_HTML = '';
export function generateExeRuntimeHtml(appName: string, _size?: number): string {
  return `<!DOCTYPE html><html><body style="background:#191919;color:#fff;font-family:Segoe UI,sans-serif;padding:24px"><h3>${appName}</h3></body></html>`;
}
