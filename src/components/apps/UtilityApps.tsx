import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save,
  Check,
  Monitor,
  Palette,
  Volume2,
  Cpu,
  HardDrive,
  XCircle,
  Eraser,
  Brush,
  Activity,
  Users,
  Zap,
  Cloud,
  Download,
  Upload,
  Plus,
  Square,
  Circle,
  Minus,
  Type,
  PaintBucket,
  Undo2,
  Redo2,
  Grid,
  Copy,
  Sliders,
  Sparkles,
  FlipHorizontal,
  Image as ImageIcon,
  Search,
  Leaf,
  Layers,
  Wand2,
  Loader2,
  Shield,
  Lock,
} from 'lucide-react';
import {
  AppId,
  FileSystemItem,
  SystemSettings,
  UserAccount,
  VirtualDesktop,
  WindowInstance,
} from '../../types/os';
import { APP_DEFINITIONS, WALLPAPERS } from '../../data/initialFileSystem';
import { AppIconRenderer, CUSTOM_ICON_PRESETS } from '../icons/WinIcons';

/* ============================================================================
 * 1. WINDOWS TERMINAL PRO (POWERSHELL 7 / CMD / WSL UBUNTU)
 * ========================================================================== */
interface TerminalAppProps {
  files: FileSystemItem[];
  onCreateItem: (
    name: string,
    type: FileSystemItem['type'],
    parentId: string,
    extra?: Partial<FileSystemItem> | any
  ) => FileSystemItem;
  onDeleteItem: (id: string) => void;
  onRenameItem: (id: string, newName: string) => void;
  onOpenItem: (item: FileSystemItem) => void;
  onLaunchApp: (appId: AppId) => void;
}

type ShellProfile = 'powershell' | 'cmd' | 'wsl';
type TerminalTheme = 'fluent' | 'matrix' | 'cyber' | 'amber';

export const TerminalApp: React.FC<TerminalAppProps> = ({
  files,
  onCreateItem,
  onDeleteItem,
  onRenameItem,
  onOpenItem,
  onLaunchApp,
}) => {
  const [shell, setShell] = useState<ShellProfile>('powershell');
  const [theme, setTheme] = useState<TerminalTheme>('fluent');
  const [cwd, setCwd] = useState<string>('desktop');
  const [lines, setLines] = useState<string[]>([
    'Windows PowerShell 7.4.6 — Windows 11 Pro (24H2)',
    'Copyright (C) Microsoft Corporation. All rights reserved.',
    'Type "help", "neofetch", "sysinfo", "tree", or "ls" to inspect and control your OS.',
    '',
  ]);
  const [cmd, setCmd] = useState<string>('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const getPromptPrefix = () => {
    if (shell === 'wsl') return `admin@win11-wsl:/mnt/c/${cwd}$`;
    if (shell === 'cmd') return `C:\\Users\\Admin\\${cwd}>`;
    return `PS C:\\Users\\Admin\\${cwd}>`;
  };

  const switchShell = (nextShell: ShellProfile) => {
    setShell(nextShell);
    const banner =
      nextShell === 'powershell'
        ? 'Switched to Windows PowerShell 7.4.6'
        : nextShell === 'cmd'
        ? 'Microsoft Windows [Version 10.0.26100.1742] — Command Prompt'
        : 'Ubuntu 24.04.1 LTS (GNU/Linux 6.6.36-microsoft-standard-WSL2 x86_64)';
    setLines((prev) => [...prev, '', banner, '']);
  };

  const runCommand = (raw: string) => {
    const trimmed = raw.trim();
    const promptLine = `${getPromptPrefix()} ${trimmed}`;
    if (!trimmed) {
      setLines((prev) => [...prev, promptLine]);
      return;
    }

    setCmdHistory((prev) => [trimmed, ...prev.slice(0, 39)]);
    setHistoryIdx(-1);

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const arg1 = parts[1];
    const rest = parts.slice(1).join(' ');

    if (command === 'clear' || command === 'cls') {
      setLines([]);
      return;
    }

    const out: string[] = [promptLine];

    if (command === 'help') {
      out.push(
        '┌──────────────────────────────────────────────────────────────────────┐',
        '│ WINDOWS 11 TERMINAL PRO — SYSTEM & FILE COMMANDS                     │',
        '├──────────────────────────────────────────────────────────────────────┤',
        '│ ls / dir              List files and folders in current directory    │',
        '│ tree                  Render visual ASCII tree of all system folders │',
        '│ cd <folder>           Switch directory (desktop, documents, etc.)    │',
        '│ mkdir <name>          Create a new folder in current directory       │',
        '│ touch <name>          Create a new file in current directory         │',
        '│ cat <name>            Display file source code or text contents      │',
        '│ rm / del <name>       Move item to Recycle Bin                       │',
        '│ ren <old> <new>       Rename a file or directory                     │',
        '│ open <app/file>       Launch app (copilot, store, vscode, edge...)   │',
        '│ neofetch / sysinfo    Display Windows 11 hardware & OS ASCII summary │',
        '│ ipconfig / ping       Inspect network interfaces & RTT latency       │',
        '│ calc <expr>           Evaluate mathematical expression in terminal   │',
        '│ clear / cls           Clear terminal buffer                          │',
        '└──────────────────────────────────────────────────────────────────────┘'
      );
    } else if (command === 'neofetch' || command === 'sysinfo') {
      const activeFiles = files.filter((f) => f.parentId !== 'recyclebin').length;
      out.push(
        '        ,.=:!!t3Z3z.,                admin@WINDOWS-11-PRO',
        '       :tt:::tt333EE3                --------------------',
        '       Et:::ztt33EEEL @Ee.,      .., OS: Windows 11 Pro 24H2 (Build 26100)',
        '      ;tt:::tt333EE7 ;EEEEEEttttt33# Kernel: NT 10.0.26100.1742-WebOS',
        '     :Et:::zt333EEQ. $EEEEEttttt33QL Shell: ' +
          (shell === 'wsl' ? 'bash 5.2 (WSL2)' : shell === 'cmd' ? 'cmd.exe' : 'pwsh 7.4.6'),
        '     it::::tt333EEF @EEEEEEttttt33F  CPU: Intel Core i9-14900K (24C/32T) @ 5.8GHz',
        '    ;3=*^```"*4EEV :EEEEEEttttt33@.  GPU: NVIDIA GeForce RTX 4080 Super',
        '    ,.=::::!t=., ` @EEEEEEtttz33QF   Memory: 4280MiB / 16384MiB DDR5',
        `   ;::::::::zt33)   "4EEEtttji3P*    File System: ${activeFiles} indexed items`,
        '  :t::::::::tt33.:Z3z..  `` ,..g.    Desktop Theme: Fluent Mica Dark'
      );
    } else if (command === 'tree') {
      const folders = ['desktop', 'documents', 'downloads', 'pictures', 'music'];
      out.push('C:\\Users\\Admin');
      folders.forEach((folderName, idx) => {
        const isLastFolder = idx === folders.length - 1;
        const folderItems = files.filter((f) => f.parentId === folderName);
        out.push(
          `${isLastFolder ? '└──' : '├──'} [${folderName.toUpperCase()}] (${folderItems.length})`
        );
        folderItems.slice(0, 6).forEach((item, i) => {
          const branch = isLastFolder ? '    ' : '│   ';
          const leaf = i === Math.min(folderItems.length, 6) - 1 ? '└──' : '├──';
          out.push(`${branch}${leaf} ${item.name}`);
        });
      });
    } else if (command === 'ipconfig') {
      out.push(
        'Windows IP Configuration',
        '',
        'Ethernet adapter vEthernet (Fluent Hyper-V Switch):',
        '   Connection-specific DNS Suffix  . : win11.internal.cloud',
        '   IPv4 Address. . . . . . . . . . . : 192.168.1.104',
        '   Subnet Mask . . . . . . . . . . . : 255.255.255.0',
        '   Default Gateway . . . . . . . . . : 192.168.1.1'
      );
    } else if (command === 'ping') {
      const host = arg1 || 'microsoft.com';
      out.push(
        `Pinging ${host} [20.112.250.133] with 32 bytes of data:`,
        `Reply from 20.112.250.133: bytes=32 time=14ms TTL=56`,
        `Reply from 20.112.250.133: bytes=32 time=12ms TTL=56`,
        `Reply from 20.112.250.133: bytes=32 time=13ms TTL=56`,
        `Ping statistics for ${host}: Packets: Sent = 3, Received = 3, Lost = 0 (0% loss)`
      );
    } else if (command === 'calc') {
      try {
        const expr = rest.replace(/[^0-9+\-*/.%() ]/g, '');
        const val = Function(`"use strict"; return (${expr || '0'})`)();
        out.push(`= ${val}`);
      } catch {
        out.push('calc: Invalid math expression');
      }
    } else if (command === 'ls' || command === 'dir') {
      const items = files.filter((f) => f.parentId === cwd);
      if (items.length === 0) {
        out.push('  (Directory is empty)');
      } else {
        out.push(`  Directory of C:\\Users\\Admin\\${cwd}`);
        out.push('  TYPE      SIZE       NAME');
        out.push('  ----      ----       ----');
        items.forEach((f) => {
          const sz = f.size ? `${Math.max(1, Math.round(f.size / 1024))} KB` : '<DIR>';
          out.push(`  [${f.type.toUpperCase().padEnd(6)}]  ${sz.padEnd(9)}  ${f.name}`);
        });
      }
    } else if (command === 'cd') {
      const valid = ['desktop', 'documents', 'downloads', 'music', 'pictures', 'recyclebin'];
      if (!arg1 || arg1 === '~') {
        setCwd('desktop');
      } else if (valid.includes(arg1.toLowerCase())) {
        setCwd(arg1.toLowerCase());
      } else {
        const folder = files.find(
          (f) => f.parentId === cwd && f.type === 'folder' && f.name.toLowerCase() === rest.toLowerCase()
        );
        if (folder) setCwd(folder.id);
        else out.push(`cd: Cannot find path '${rest}'`);
      }
    } else if (command === 'mkdir') {
      if (!rest) out.push('mkdir: Specify a folder name');
      else {
        onCreateItem(rest, 'folder', cwd);
        out.push(`Created directory: ${rest}`);
      }
    } else if (command === 'touch') {
      if (!rest) out.push('touch: Specify a file name');
      else {
        const fname = rest.includes('.') ? rest : `${rest}.txt`;
        onCreateItem(fname, 'text', cwd, {
          content: `Created via Windows Terminal at ${new Date().toLocaleTimeString()}`,
        });
        out.push(`Created file: ${fname}`);
      }
    } else if (command === 'cat') {
      const target = files.find(
        (f) => f.parentId === cwd && f.name.toLowerCase().includes((rest || '').toLowerCase())
      );
      if (!target) out.push(`cat: File not found '${rest}'`);
      else out.push(target.content || `[Binary/App Item: ${target.name}]`);
    } else if (command === 'rm' || command === 'del') {
      const target = files.find(
        (f) => f.parentId === cwd && f.name.toLowerCase().includes((rest || '').toLowerCase())
      );
      if (!target) out.push(`rm: Item not found '${rest}'`);
      else {
        onDeleteItem(target.id);
        out.push(`Moved '${target.name}' to Recycle Bin.`);
      }
    } else if (command === 'ren') {
      const newName = parts.slice(2).join(' ');
      const target = files.find(
        (f) => f.parentId === cwd && f.name.toLowerCase().includes((arg1 || '').toLowerCase())
      );
      if (!target || !newName) out.push('Usage: ren <oldName> <newName>');
      else {
        onRenameItem(target.id, newName);
        out.push(`Renamed '${target.name}' to '${newName}'.`);
      }
    } else if (command === 'open') {
      const appMatch = APP_DEFINITIONS.find(
        (a) => a.id === rest.toLowerCase() || a.name.toLowerCase().includes(rest.toLowerCase())
      );
      if (appMatch) {
        onLaunchApp(appMatch.id);
        out.push(`Launching ${appMatch.name}...`);
      } else {
        const fileMatch = files.find(
          (f) => f.parentId === cwd && f.name.toLowerCase().includes(rest.toLowerCase())
        );
        if (fileMatch) {
          onOpenItem(fileMatch);
          out.push(`Opening ${fileMatch.name}...`);
        } else {
          out.push(`open: Could not find app or file '${rest}'`);
        }
      }
    } else {
      out.push(`'${command}' is not recognized. Type 'help' or 'neofetch' for available commands.`);
    }

    setLines((prev) => [...prev, ...out, '']);
  };

  const themeStyles: Record<TerminalTheme, { bg: string; text: string; prompt: string }> = {
    fluent: { bg: 'bg-[#0c0c0c]', text: 'text-[#e5e5e5]', prompt: 'text-[#60cdff]' },
    matrix: { bg: 'bg-[#020b05]', text: 'text-[#4ade80]', prompt: 'text-[#22c55e]' },
    cyber: { bg: 'bg-[#090d1a]', text: 'text-[#93c5fd]', prompt: 'text-[#f472b6]' },
    amber: { bg: 'bg-[#120c02]', text: 'text-[#fde68a]', prompt: 'text-[#f59e0b]' },
  };

  const curStyle = themeStyles[theme];

  return (
    <div className={`flex flex-col h-full ${curStyle.bg} font-mono text-xs select-text`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#181818] border-b border-white/[0.08] select-none shrink-0">
        <div className="flex items-center gap-1">
          {[
            { id: 'powershell', label: 'PowerShell 7' },
            { id: 'cmd', label: 'Command Prompt' },
            { id: 'wsl', label: 'WSL Ubuntu' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => switchShell(s.id as ShellProfile)}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] font-sans font-medium transition-colors whitespace-nowrap shrink-0 ${
                shell === s.id
                  ? 'bg-[#0078d4] text-white'
                  : 'bg-white/[0.05] text-neutral-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {(['neofetch', 'tree', 'ls', 'ipconfig', 'clear'] as const).map((q) => (
            <button
              key={q}
              onClick={() => runCommand(q)}
              className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.14] text-[10px] text-neutral-300 whitespace-nowrap shrink-0"
            >
              {q}
            </button>
          ))}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as TerminalTheme)}
            className="bg-[#111] border border-white/[0.12] rounded px-2 py-0.5 text-[10px] text-neutral-200 font-sans"
          >
            <option value="fluent">Theme: Fluent</option>
            <option value="matrix">Theme: Matrix</option>
            <option value="cyber">Theme: Cyber</option>
            <option value="amber">Theme: Amber</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-1">
        {lines.map((line, i) => (
          <div key={i} className={`whitespace-pre-wrap leading-relaxed ${curStyle.text}`}>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runCommand(cmd);
          setCmd('');
        }}
        className="flex items-center gap-2 px-3.5 py-2.5 bg-black/40 border-t border-white/[0.08]"
      >
        <span className={`${curStyle.prompt} font-semibold shrink-0`}>{getPromptPrefix()}</span>
        <input
          type="text"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && cmdHistory.length > 0) {
              e.preventDefault();
              const nextIdx = Math.min(cmdHistory.length - 1, historyIdx + 1);
              setHistoryIdx(nextIdx);
              setCmd(cmdHistory[nextIdx]);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (historyIdx <= 0) {
                setHistoryIdx(-1);
                setCmd('');
              } else {
                const nextIdx = historyIdx - 1;
                setHistoryIdx(nextIdx);
                setCmd(cmdHistory[nextIdx]);
              }
            }
          }}
          autoFocus
          className="flex-1 bg-transparent text-white focus:outline-none"
          placeholder="Type a command (neofetch, tree, ls, mkdir, open store)..."
        />
      </form>
    </div>
  );
};

/* ============================================================================
 * 2. WINDOWS 11 AI PAINT & IMAGE STUDIO PRO
 *    (CANVAS DRAWING, AI PROMPT-TO-ART, AI SKETCH ENHANCE & LIVE FILTERS)
 * ========================================================================== */
interface PaintAppProps {
  onSaveImageToDesktop: (name: string, dataUrl: string) => void;
}

type PaintTool = 'brush' | 'spray' | 'line' | 'rect' | 'circle' | 'text' | 'eraser';

export const PaintApp: React.FC<PaintAppProps> = ({ onSaveImageToDesktop }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState<string>('#60cdff');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [tool, setTool] = useState<PaintTool>('brush');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [stampText, setStampText] = useState<string>('Windows 11 Studio');
  const [artName, setArtName] = useState<string>('AI_Masterpiece.png');
  const [savedNotice, setSavedNotice] = useState<string>('');

  // AI Image & Sketch Studio state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiModeLabel, setAiModeLabel] = useState<string>('');

  const COLORS = [
    '#ffffff',
    '#60cdff',
    '#0078d4',
    '#8b5cf6',
    '#ec4899',
    '#ef4444',
    '#f59e0b',
    '#fde047',
    '#10b981',
    '#14b8a6',
    '#a3a3a3',
    '#0f172a',
  ];

  const saveHistorySnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-14), img]);
    setRedoStack([]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#141414';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initial]);
  }, []);

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    ctx.putImageData(previous, 0, 0);
    setRedoStack((r) => [current, ...r]);
    setHistory((h) => h.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const next = redoStack[0];
    ctx.putImageData(next, 0, 0);
    setHistory((h) => [...h, next]);
    setRedoStack((r) => r.slice(1));
  };

  const fillCanvasBackground = (bgCol: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = bgCol;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistorySnapshot();
  };

  const applyCanvasFilter = (filterType: 'invert' | 'neon' | 'grayscale' | 'warm') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (filterType === 'invert') {
        d[i] = 255 - r;
        d[i + 1] = 255 - g;
        d[i + 2] = 255 - b;
      } else if (filterType === 'grayscale') {
        const avg = 0.299 * r + 0.587 * g + 0.114 * b;
        d[i] = avg;
        d[i + 1] = avg;
        d[i + 2] = avg;
      } else if (filterType === 'warm') {
        d[i] = Math.min(255, r * 1.18 + 14);
        d[i + 1] = Math.min(255, g * 1.05 + 4);
        d[i + 2] = Math.max(0, b * 0.85);
      } else if (filterType === 'neon') {
        d[i] = Math.min(255, r * 1.35);
        d[i + 1] = Math.min(255, g * 1.15);
        d[i + 2] = Math.min(255, b * 1.55 + 22);
      }
    }
    ctx.putImageData(imgData, 0, 0);
    saveHistorySnapshot();
    setSavedNotice(`Applied ${filterType.toUpperCase()} filter`);
    setTimeout(() => setSavedNotice(''), 1800);
  };

  const handleGenerateOrEnhanceWithAI = async (enhanceCurrentSketch: boolean) => {
    const cleanPrompt = aiPrompt.trim() || 'لوحة فنية ثلاثية الأبعاد عالية الدقة لمدينة مستقبلية في الليل';
    const canvas = canvasRef.current;
    if (!canvas || isAiGenerating) return;

    setIsAiGenerating(true);
    setAiModeLabel(enhanceCurrentSketch ? 'Enhancing Sketch with AI...' : 'Generating AI Art...');

    try {
      const sourceImageDataUrl = enhanceCurrentSketch ? canvas.toDataURL('image/png') : undefined;
      const res = await fetch('/api/copilot/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enhanceCurrentSketch
            ? `Transform and enhance this sketch into a polished, high-detail digital masterpiece: ${cleanPrompt}`
            : cleanPrompt,
          sourceImageDataUrl,
        }),
      });
      const data = await res.json();
      if (data?.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          saveHistorySnapshot();
          setSavedNotice(enhanceCurrentSketch ? 'AI Sketch Enhanced!' : 'AI Artwork Generated!');
          setTimeout(() => setSavedNotice(''), 2500);
        };
        img.src = data.imageUrl;
      }
    } catch {
      setSavedNotice('AI generation completed with local procedural studio.');
      setTimeout(() => setSavedNotice(''), 2200);
    } finally {
      setIsAiGenerating(false);
      setAiModeLabel('');
    }
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'text') {
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.max(16, brushSize * 3)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(stampText || 'Windows 11', x, y);
      saveHistorySnapshot();
      return;
    }

    setIsDrawing(true);
    setStartPos({ x, y });
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = tool === 'eraser' ? '#141414' : color;
    ctx.fillStyle = color;

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'spray') {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * brushSize * 2;
        ctx.fillRect(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 1.5, 1.5);
      }
    } else if (snapshot) {
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      } else if (tool === 'circle') {
        const rx = Math.abs(x - startPos.x) / 2;
        const ry = Math.abs(y - startPos.y) / 2;
        const cx = startPos.x + (x - startPos.x) / 2;
        const cy = startPos.y + (y - startPos.y) / 2;
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveHistorySnapshot();
  };

  const handleSaveToDesktop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const cleanName = artName.trim().endsWith('.png')
      ? artName.trim()
      : `${artName.trim() || 'Masterpiece'}.png`;
    onSaveImageToDesktop(cleanName, dataUrl);
    setSavedNotice('Saved to Desktop!');
    setTimeout(() => setSavedNotice(''), 2000);
  };

  const handleSetWallpaper = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    window.postMessage(
      {
        type: 'STORE_OS_BRIDGE',
        action: 'SET_WALLPAPER',
        imageUrl: dataUrl,
      },
      '*'
    );
    setSavedNotice('Applied as Wallpaper!');
    setTimeout(() => setSavedNotice(''), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#191919] text-[#f3f3f3] select-none">
      {/* Top Paint Studio Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#202020] border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'brush', label: 'Brush', icon: <Brush className="w-3.5 h-3.5" /> },
            { id: 'spray', label: 'Airbrush', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'line', label: 'Line', icon: <Minus className="w-3.5 h-3.5" /> },
            { id: 'rect', label: 'Rect', icon: <Square className="w-3.5 h-3.5" /> },
            { id: 'circle', label: 'Circle', icon: <Circle className="w-3.5 h-3.5" /> },
            { id: 'text', label: 'Text', icon: <Type className="w-3.5 h-3.5" /> },
            { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as PaintTool)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                tool === t.id
                  ? 'bg-[#0078d4] text-white'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <button
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="p-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-35"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-35"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fillCanvasBackground(color)}
            className="p-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] text-amber-300"
            title="Fill Entire Canvas with Active Color"
          >
            <PaintBucket className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowGrid((g) => !g)}
            className={`p-1.5 rounded-[4px] ${
              showGrid ? 'bg-[#0078d4] text-white' : 'bg-white/[0.06] text-neutral-300'
            }`}
            title="Toggle Pixel Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fillCanvasBackground('#141414')}
            className="p-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] text-rose-300"
            title="Clear Canvas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={artName}
            onChange={(e) => setArtName(e.target.value)}
            className="px-2.5 py-1 bg-[#141414] border border-white/[0.12] rounded-[4px] text-xs text-white w-36 focus:outline-none focus:border-[#60cdff]"
          />
          <button
            onClick={handleSaveToDesktop}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-[4px] text-xs font-medium whitespace-nowrap shrink-0"
          >
            {savedNotice ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedNotice || 'Save PNG'}</span>
          </button>
          <button
            onClick={handleSetWallpaper}
            className="px-2.5 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] text-[#60cdff] rounded-[4px] text-xs font-medium whitespace-nowrap shrink-0"
          >
            Set Wallpaper
          </button>
        </div>
      </div>

      {/* AI Image Generation & Sketch Enhancement Studio Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#161922] border-b border-sky-500/20">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Wand2 className="w-4 h-4 text-[#60cdff] shrink-0" />
          <input
            type="text"
            dir="auto"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleGenerateOrEnhanceWithAI(false);
              }
            }}
            placeholder="اكتب وصف لوحة أو مشهد لتوليده أو لتحسين رسمتك الحالية بالذكاء الاصطناعي..."
            className="flex-1 bg-[#0e1117] border border-white/[0.12] rounded-[4px] px-3 py-1.5 text-xs text-white placeholder-neutral-400 focus:outline-none focus:border-[#60cdff]"
          />
          <button
            onClick={() => void handleGenerateOrEnhanceWithAI(false)}
            disabled={isAiGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 text-xs font-medium text-white whitespace-nowrap shrink-0"
          >
            {isAiGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>توليد بالذكاء الاصطناعي</span>
          </button>
          <button
            onClick={() => void handleGenerateOrEnhanceWithAI(true)}
            disabled={isAiGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white whitespace-nowrap shrink-0"
            title="تحويل الرسمة الحالية على اللوحة إلى صورة احترافية"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>تحسين الرسمة (Sketch to Art)</span>
          </button>
        </div>

        {/* Instant Canvas Color Grading Filters */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-neutral-400 mr-1">Filters:</span>
          {[
            { id: 'neon', label: 'Neon HDR' },
            { id: 'warm', label: 'Warm Film' },
            { id: 'grayscale', label: 'Noir B&W' },
            { id: 'invert', label: 'Invert' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() =>
                applyCanvasFilter(f.id as 'invert' | 'neon' | 'grayscale' | 'warm')
              }
              className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.14] text-[11px] text-neutral-200 whitespace-nowrap shrink-0"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Color Swatches, Size Slider & Text Stamp Input */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 bg-[#1b1b1b] border-b border-white/[0.06] text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border transition-transform ${
                color === c ? 'border-white scale-115 shadow' : 'border-white/20'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-5 bg-transparent border-0 cursor-pointer"
            title="Custom Color"
          />
        </div>

        <div className="flex items-center gap-3">
          {aiModeLabel && (
            <span className="text-[11px] text-[#60cdff] font-medium">{aiModeLabel}</span>
          )}
          {tool === 'text' && (
            <input
              type="text"
              value={stampText}
              onChange={(e) => setStampText(e.target.value)}
              placeholder="Text to stamp..."
              className="px-2 py-0.5 bg-[#121212] border border-white/15 rounded text-xs text-white w-36"
            />
          )}
          <span className="text-[11px] text-neutral-400 font-mono tabular-nums">
            Size: {brushSize}px
          </span>
          <input
            type="range"
            min={1}
            max={36}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24 accent-[#0078d4]"
          />
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="flex-1 flex items-center justify-center p-4 bg-[#121212] overflow-auto">
        <div className="relative shadow-2xl rounded-[6px] overflow-hidden border border-white/[0.14]">
          <canvas
            ref={canvasRef}
            width={820}
            height={480}
            onPointerDown={startDraw}
            onPointerMove={moveDraw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            className="cursor-crosshair touch-none block"
          />
          {showGrid && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. WINDOWS 11 CALCULATOR PRO (STANDARD, SCIENTIFIC & UNIT CONVERTER)
 * ========================================================================== */
export const CalculatorApp: React.FC = () => {
  const [mode, setMode] = useState<'standard' | 'scientific' | 'converter'>('standard');
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [memory, setMemory] = useState<number>(0);
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  const [convCategory, setConvCategory] = useState<'data' | 'length' | 'temp'>('data');
  const [convInput, setConvInput] = useState<string>('1024');

  const handleDigit = (d: string) => {
    setDisplay((prev) => (prev === '0' || prev === 'Error' ? d : prev + d));
  };

  const handleOp = (op: string) => {
    setEquation(`${display} ${op} `);
    setDisplay('0');
  };

  const handleScientificFn = (fn: string) => {
    const val = parseFloat(display) || 0;
    let res = val;
    if (fn === 'sin') res = Math.sin((val * Math.PI) / 180);
    else if (fn === 'cos') res = Math.cos((val * Math.PI) / 180);
    else if (fn === 'tan') res = Math.tan((val * Math.PI) / 180);
    else if (fn === 'sqrt') res = Math.sqrt(val);
    else if (fn === 'sq') res = val * val;
    else if (fn === 'cube') res = val * val * val;
    else if (fn === 'inv') res = val !== 0 ? 1 / val : NaN;
    else if (fn === 'log') res = Math.log10(val);
    else if (fn === 'ln') res = Math.log(val);
    else if (fn === 'pi') res = Math.PI;
    else if (fn === 'e') res = Math.E;
    else if (fn === 'fact') {
      let f = 1;
      for (let i = 2; i <= Math.min(170, Math.floor(Math.abs(val))); i++) f *= i;
      res = f;
    }
    const formatted = Number.isFinite(res) ? String(Number(res.toFixed(8))) : 'Error';
    setHistory((prev) => [`${fn}(${val}) = ${formatted}`, ...prev.slice(0, 11)]);
    setDisplay(formatted);
  };

  const handleEqual = () => {
    if (!equation) return;
    try {
      const full = `${equation}${display}`;
      const sanitized = full.replace(/[^0-9+\-*/.%() ]/g, '');
      const result = Function(`"use strict"; return (${sanitized})`)();
      const formatted = Number.isFinite(result) ? String(Number(result.toFixed(8))) : 'Error';
      setHistory((prev) => [`${full} = ${formatted}`, ...prev.slice(0, 11)]);
      setDisplay(formatted);
      setEquation('');
    } catch {
      setDisplay('Error');
    }
  };

  const stdButtons = [
    ['C', 'CE', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['±', '0', '.', '='],
  ];

  const sciButtons = [
    ['sin', 'cos', 'tan', 'pi'],
    ['sqrt', 'sq', 'cube', 'inv'],
    ['log', 'ln', 'fact', 'e'],
  ];

  const numVal = parseFloat(convInput) || 0;

  return (
    <div className="flex flex-col h-full bg-[#202020] text-white p-3.5 select-none">
      <div className="flex items-center justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1 bg-[#161616] p-1 rounded-[6px] border border-white/[0.06]">
          {[
            { id: 'standard', label: 'Standard' },
            { id: 'scientific', label: 'Scientific' },
            { id: 'converter', label: 'Converter' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as typeof mode)}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                mode === m.id ? 'bg-[#0078d4] text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            navigator.clipboard?.writeText(display).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-neutral-300 flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {mode === 'converter' ? (
        <div className="flex-1 flex flex-col gap-3 bg-[#181818] border border-white/[0.07] rounded-[6px] p-3.5">
          <div className="flex gap-1.5">
            {[
              { id: 'data', label: 'Digital Storage' },
              { id: 'length', label: 'Length' },
              { id: 'temp', label: 'Temperature' },
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setConvCategory(c.id as typeof convCategory)}
                className={`flex-1 py-1.5 rounded text-xs font-medium whitespace-nowrap shrink-0 ${
                  convCategory === c.id
                    ? 'bg-[#0078d4] text-white'
                    : 'bg-white/[0.06] text-neutral-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[11px] text-neutral-400">Input Value</label>
            <input
              type="number"
              value={convInput}
              onChange={(e) => setConvInput(e.target.value)}
              className="w-full mt-1 bg-[#121212] border border-white/[0.12] rounded px-3 py-2 text-lg font-mono tabular-nums text-white focus:outline-none focus:border-[#60cdff]"
            />
          </div>

          <div className="space-y-2 pt-1 font-mono tabular-nums text-xs">
            {convCategory === 'data' && (
              <>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Megabytes (MB):</span>
                  <span className="text-[#60cdff] font-bold">{numVal.toLocaleString()} MB</span>
                </div>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Gigabytes (GB):</span>
                  <span className="text-emerald-400 font-bold">{(numVal / 1024).toFixed(4)} GB</span>
                </div>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Kilobytes (KB):</span>
                  <span className="text-amber-300 font-bold">{(numVal * 1024).toLocaleString()} KB</span>
                </div>
              </>
            )}
            {convCategory === 'length' && (
              <>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Meters (m):</span>
                  <span className="text-[#60cdff] font-bold">{numVal} m</span>
                </div>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Kilometers (km):</span>
                  <span className="text-emerald-400 font-bold">{(numVal / 1000).toFixed(4)} km</span>
                </div>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Feet (ft):</span>
                  <span className="text-amber-300 font-bold">{(numVal * 3.28084).toFixed(2)} ft</span>
                </div>
              </>
            )}
            {convCategory === 'temp' && (
              <>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Celsius (°C):</span>
                  <span className="text-[#60cdff] font-bold">{numVal} °C</span>
                </div>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Fahrenheit (°F):</span>
                  <span className="text-emerald-400 font-bold">
                    {((numVal * 9) / 5 + 32).toFixed(2)} °F
                  </span>
                </div>
                <div className="p-2.5 rounded bg-[#222] flex justify-between">
                  <span className="text-neutral-400">Kelvin (K):</span>
                  <span className="text-amber-300 font-bold">{(numVal + 273.15).toFixed(2)} K</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-[#161616] border border-white/[0.07] rounded-[6px] p-3.5 mb-2 text-right font-mono tabular-nums">
            <div className="flex items-center justify-between text-[11px] text-neutral-400 h-4">
              <span>{memory !== 0 ? `M: ${memory}` : ''}</span>
              <span>{equation}</span>
            </div>
            <div className="text-3xl font-semibold text-white truncate mt-1">{display}</div>
          </div>

          <div className="grid grid-cols-5 gap-1 mb-2">
            {[
              { lbl: 'MC', fn: () => setMemory(0) },
              { lbl: 'MR', fn: () => setDisplay(String(memory)) },
              { lbl: 'M+', fn: () => setMemory((m) => m + (parseFloat(display) || 0)) },
              { lbl: 'M-', fn: () => setMemory((m) => m - (parseFloat(display) || 0)) },
              { lbl: 'MS', fn: () => setMemory(parseFloat(display) || 0) },
            ].map((m) => (
              <button
                key={m.lbl}
                onClick={m.fn}
                className="py-1 rounded bg-white/[0.04] hover:bg-white/[0.1] text-[11px] text-neutral-300 font-mono"
              >
                {m.lbl}
              </button>
            ))}
          </div>

          {mode === 'scientific' && (
            <div className="grid grid-cols-4 gap-1.5 mb-1.5">
              {sciButtons.flat().map((fn) => (
                <button
                  key={fn}
                  onClick={() => handleScientificFn(fn)}
                  className="py-1.5 rounded-[4px] bg-[#262626] hover:bg-[#323232] border border-white/[0.06] text-xs font-mono text-[#60cdff]"
                >
                  {fn}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-1.5 flex-1">
            {stdButtons.flat().map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'C') {
                    setDisplay('0');
                    setEquation('');
                  } else if (btn === 'CE') {
                    setDisplay('0');
                  } else if (btn === '±') {
                    setDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
                  } else if (btn === '=') {
                    handleEqual();
                  } else if (['+', '-', '*', '/', '%'].includes(btn)) {
                    handleOp(btn);
                  } else {
                    handleDigit(btn);
                  }
                }}
                className={`rounded-[4px] font-medium text-sm transition-colors border ${
                  btn === '='
                    ? 'bg-[#0078d4] hover:bg-[#106ebe] border-[#60cdff]/30 text-white'
                    : ['+', '-', '*', '/', '%', 'C', 'CE'].includes(btn)
                    ? 'bg-[#2b2b2b] hover:bg-[#353535] border-white/[0.06] text-neutral-200'
                    : 'bg-[#323232] hover:bg-[#3c3c3c] border-white/[0.06] text-white'
                }`}
              >
                {btn}
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/[0.08] text-[11px] font-mono tabular-nums text-neutral-400 max-h-14 overflow-y-auto">
              {history.map((h, i) => (
                <div key={i}>{h}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ============================================================================
 * 4. WINDOWS 11 PHOTOS STUDIO PRO
 * ========================================================================== */
export const PhotosApp: React.FC<{ files: FileSystemItem[]; initialFileId?: string }> = ({
  files,
  initialFileId,
}) => {
  const imageFiles = files.filter((f) => f.parentId !== 'recyclebin' && f.type === 'image');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFileId || imageFiles[0]?.id || null
  );
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [showAdjustments, setShowAdjustments] = useState<boolean>(true);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturate, setSaturate] = useState<number>(100);
  const [sepia, setSepia] = useState<number>(0);
  const [hue, setHue] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const activeImage = files.find((f) => f.id === selectedId) || imageFiles[0];

  const resetFilters = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setSepia(0);
    setHue(0);
  };

  const applyPreset = (preset: 'vivid' | 'cyber' | 'vintage' | 'bw') => {
    if (preset === 'vivid') {
      setBrightness(108);
      setContrast(118);
      setSaturate(145);
      setSepia(0);
      setHue(0);
    } else if (preset === 'cyber') {
      setBrightness(105);
      setContrast(125);
      setSaturate(160);
      setSepia(0);
      setHue(210);
    } else if (preset === 'vintage') {
      setBrightness(102);
      setContrast(95);
      setSaturate(85);
      setSepia(55);
      setHue(0);
    } else if (preset === 'bw') {
      setBrightness(105);
      setContrast(130);
      setSaturate(0);
      setSepia(0);
      setHue(0);
    }
  };

  const handleSetAsWallpaper = () => {
    const url = activeImage?.imageUrl || activeImage?.mediaUrl;
    if (!url) return;
    window.postMessage(
      {
        type: 'STORE_OS_BRIDGE',
        action: 'SET_WALLPAPER',
        imageUrl: url,
      },
      '*'
    );
    setStatusMsg('Applied as Desktop Wallpaper!');
    setTimeout(() => setStatusMsg(''), 2200);
  };

  const filterCss = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;

  return (
    <div className="flex flex-col h-full bg-[#161616] text-[#f3f3f3] select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#202020] border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-[#60cdff]" />
          <span className="text-xs font-semibold text-white">
            {activeImage ? activeImage.name : 'Windows 11 Photos Studio'}
          </span>
          {statusMsg && <span className="text-[11px] text-emerald-400 font-medium">{statusMsg}</span>}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono tabular-nums px-1.5">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
            className="p-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12]"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFlipH((f) => !f)}
            className="p-1.5 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12]"
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowAdjustments((s) => !s)}
            className={`px-2.5 py-1.5 rounded-[4px] text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              showAdjustments ? 'bg-[#0078d4] text-white' : 'bg-white/[0.06] text-neutral-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Color &amp; Filters</span>
          </button>
          {activeImage && (
            <button
              onClick={handleSetAsWallpaper}
              className="px-2.5 py-1.5 rounded-[4px] bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-[#60cdff] whitespace-nowrap shrink-0"
            >
              Set as Wallpaper
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {imageFiles.length > 0 && (
          <div className="w-44 bg-[#1c1c1c] border-r border-white/[0.07] p-2 overflow-y-auto space-y-1 shrink-0">
            <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400">
              Gallery ({imageFiles.length})
            </div>
            {imageFiles.map((img) => (
              <button
                key={img.id}
                onClick={() => {
                  setSelectedId(img.id);
                  resetFilters();
                }}
                className={`w-full text-left px-2.5 py-2 rounded-[4px] text-xs truncate transition-colors ${
                  activeImage?.id === img.id
                    ? 'bg-[#0078d4]/25 text-[#60cdff] font-medium border border-[#60cdff]/30'
                    : 'text-neutral-300 hover:bg-white/[0.05]'
                }`}
              >
                {img.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-6 bg-[#111111] overflow-hidden">
          {activeImage && (activeImage.imageUrl || activeImage.mediaUrl) ? (
            <img
              src={activeImage.imageUrl || activeImage.mediaUrl}
              alt={activeImage.name}
              referrerPolicy="no-referrer"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
                filter: filterCss,
                transition: 'transform 150ms ease, filter 120ms ease',
              }}
              className="max-h-full max-w-full object-contain rounded shadow-2xl"
            />
          ) : (
            <div className="text-center max-w-sm space-y-2">
              <div
                className="w-64 h-40 mx-auto rounded-lg border border-white/[0.1] shadow-lg flex items-center justify-center"
                style={{
                  background:
                    'radial-gradient(circle at 35% 35%, #0078d4 0%, #00397a 50%, #04142c 100%)',
                  transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
                  filter: filterCss,
                }}
              >
                <span className="text-xs font-medium text-white/90">
                  Windows 11 Bloom Preview
                </span>
              </div>
              <p className="text-xs text-neutral-400 pt-2">
                Generate or save an artwork from AI Paint Studio to view and grade it here.
              </p>
            </div>
          )}
        </div>

        {showAdjustments && (
          <div className="w-60 bg-[#1c1c1c] border-l border-white/[0.08] p-3.5 overflow-y-auto space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Filter Presets</span>
              <button
                onClick={resetFilters}
                className="text-[11px] text-[#60cdff] hover:underline"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'vivid', label: 'Vivid HDR' },
                { id: 'cyber', label: 'Cyber Neon' },
                { id: 'vintage', label: 'Warm Film' },
                { id: 'bw', label: 'Noir B&W' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id as 'vivid' | 'cyber' | 'vintage' | 'bw')}
                  className="py-1.5 px-2 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-neutral-200 font-medium"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-2 border-t border-white/[0.07] text-xs font-mono tabular-nums">
              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Brightness</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={160}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-[#0078d4]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Contrast</span>
                  <span>{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={180}
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-[#0078d4]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Saturation</span>
                  <span>{saturate}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={saturate}
                  onChange={(e) => setSaturate(Number(e.target.value))}
                  className="w-full accent-[#0078d4]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                  <span>Hue Shift</span>
                  <span>{hue}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={hue}
                  onChange={(e) => setHue(Number(e.target.value))}
                  className="w-full accent-[#0078d4]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 5. REAL-TIME TASK MANAGER PRO 24H2
 *    (LIVE FPS, REAL JS HEAP/DOM METRICS, ECO MODE QoS, DETAILS & SPARKLINES)
 * ========================================================================== */
const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    id: 'acc-admin',
    name: 'Administrator',
    email: 'admin@windows11.local',
    role: 'Administrator',
    avatarColor: '#0078d4',
  },
];

export const TaskManagerApp: React.FC<{
  windows: WindowInstance[];
  virtualDesktops?: VirtualDesktop[];
  accounts?: UserAccount[];
  activeAccountId?: string;
  onCloseWindow: (id: string) => void;
  onFocusWindow: (id: string) => void;
  onToggleEfficiencyMode?: (id: string) => void;
  onLaunchApp?: (appId: AppId) => void;
  onSwitchAccount?: (accId: string) => void;
}> = ({
  windows,
  virtualDesktops = [],
  accounts = [],
  activeAccountId,
  onCloseWindow,
  onFocusWindow,
  onToggleEfficiencyMode,
  onLaunchApp,
  onSwitchAccount,
}) => {
  const [activeNav, setActiveNav] = useState<
    'processes' | 'performance' | 'details' | 'startup' | 'users'
  >('processes');
  const [perfMetric, setPerfMetric] = useState<'cpu' | 'memory' | 'disk' | 'gpu'>('cpu');
  const [selectedWinId, setSelectedWinId] = useState<string | null>(null);
  const [processSearch, setProcessSearch] = useState<string>('');
  const [isRunModalOpen, setIsRunModalOpen] = useState<boolean>(false);
  const [runInput, setRunInput] = useState<string>('');

  // Real-time browser & system metrics
  const [liveFps, setLiveFps] = useState<number>(60);
  const [domNodeCount, setDomNodeCount] = useState<number>(1240);
  const [jsHeapMb, setJsHeapMb] = useState<number>(64);
  const [cpuSeries, setCpuSeries] = useState<number[]>(() =>
    Array.from({ length: 30 }, (_, i) => 12 + ((i * 7) % 18))
  );
  const [memSeries, setMemSeries] = useState<number[]>(() =>
    Array.from({ length: 30 }, (_, i) => 28 + ((i * 3) % 10))
  );
  const [startupMap, setStartupMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('win11_startup_apps_v2');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      copilot: true,
      spotify: false,
      edge: true,
      vscode: false,
      taskmanager: false,
    };
  });

  const openWindows = windows.filter((w) => w.isOpen);

  // Real FPS counter using requestAnimationFrame
  useEffect(() => {
    let frames = 0;
    let lastTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      frames++;
      if (now - lastTime >= 1000) {
        setLiveFps(Math.min(144, Math.max(15, Math.round((frames * 1000) / (now - lastTime)))));
        frames = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Real DOM nodes & JS Heap + CPU/RAM telemetry interval
  useEffect(() => {
    const timer = setInterval(() => {
      const nodes = document.querySelectorAll('*').length;
      setDomNodeCount(nodes);

      const perfWithMem = performance as unknown as {
        memory?: { usedJSHeapSize: number };
      };
      const heapUsed = perfWithMem.memory?.usedJSHeapSize
        ? Math.round(perfWithMem.memory.usedJSHeapSize / (1024 * 1024))
        : Math.round(48 + nodes * 0.015 + openWindows.length * 14);
      setJsHeapMb(heapUsed);

      const ecoCount = openWindows.filter((w) => w.efficiencyMode).length;
      const baseCpu = Math.max(
        4,
        Math.min(96, 8 + openWindows.length * 6 - ecoCount * 3 + Math.round(Math.random() * 8))
      );
      const baseMem = Math.min(
        92,
        Math.round(((3.1 + openWindows.length * 0.42 - ecoCount * 0.12) / 16) * 100)
      );
      setCpuSeries((prev) => [...prev.slice(1), baseCpu]);
      setMemSeries((prev) => [...prev.slice(1), baseMem]);
    }, 1200);
    return () => clearInterval(timer);
  }, [openWindows]);

  const currentCpu = cpuSeries[cpuSeries.length - 1] || 14;
  const ecoWindowsCount = openWindows.filter((w) => w.efficiencyMode).length;
  const usedGb = Math.max(2.4, 3.1 + openWindows.length * 0.42 - ecoWindowsCount * 0.12).toFixed(1);
  const currentMemPct = memSeries[memSeries.length - 1] || 28;

  const filteredWindows = openWindows.filter(
    (w) =>
      !processSearch.trim() ||
      w.title.toLowerCase().includes(processSearch.toLowerCase()) ||
      w.appId.toLowerCase().includes(processSearch.toLowerCase())
  );

  const handleRunNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = runInput.trim().toLowerCase();
    if (!clean) return;
    const match = APP_DEFINITIONS.find(
      (a) => a.id === clean || a.name.toLowerCase().includes(clean)
    );
    if (match && onLaunchApp) {
      onLaunchApp(match.id);
      setIsRunModalOpen(false);
      setRunInput('');
    }
  };

  const toggleStartupApp = (id: string) => {
    setStartupMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('win11_startup_apps_v2', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const renderSvgSparkline = (values: number[], strokeColor: string, fillColor: string) => {
    const w = 520;
    const h = 150;
    const pts = values.map((v, idx) => {
      const x = (idx / Math.max(1, values.length - 1)) * w;
      const y = h - (Math.max(2, Math.min(100, v)) / 100) * (h - 16) - 8;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const areaPath = `M 0,${h} L ${pts.join(' L ')} L ${w},${h} Z`;
    const linePath = `M ${pts.join(' L ')}`;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40 rounded bg-[#141414] border border-white/[0.08]">
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1={0}
            y1={h * r}
            x2={w}
            y2={h * r}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />
        ))}
        <path d={areaPath} fill={fillColor} />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.2" />
      </svg>
    );
  };

  return (
    <div className="flex h-full bg-[#191919] text-[#f3f3f3] select-none font-sans overflow-hidden">
      {/* Left Navigation Rail */}
      <div className="w-48 bg-[#141414] border-r border-white/[0.07] p-2.5 flex flex-col justify-between shrink-0">
        <div className="space-y-1">
          {[
            { id: 'processes', label: 'Processes', icon: <Monitor className="w-4 h-4" /> },
            { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
            { id: 'details', label: 'Details & PID', icon: <Layers className="w-4 h-4" /> },
            { id: 'startup', label: 'Startup apps', icon: <Zap className="w-4 h-4" /> },
            { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
          ].map((item) => {
            const isAct = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id as typeof activeNav)}
                className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors ${
                  isAct
                    ? 'bg-white/[0.09] text-white'
                    : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200'
                }`}
              >
                {isAct && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#60cdff]" />
                )}
                <span className={isAct ? 'text-[#60cdff]' : ''}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Real-Time Hardware & Browser Telemetry Summary Card */}
        <div className="p-2.5 rounded-[6px] bg-[#1e1e1e] border border-white/[0.06] space-y-1.5 text-[11px] font-mono tabular-nums">
          <div className="flex justify-between text-neutral-400">
            <span>Live Frame Rate</span>
            <span className="text-emerald-400 font-semibold">{liveFps} FPS</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>CPU Load</span>
            <span className="text-[#60cdff]">{currentCpu}%</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>RAM / JS Heap</span>
            <span className="text-amber-300">{jsHeapMb} MB</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>DOM Elements</span>
            <span className="text-neutral-200">{domNodeCount}</span>
          </div>
        </div>
      </div>

      {/* Right Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Command Bar */}
        <div className="h-12 px-4 bg-[#202020] border-b border-white/[0.07] flex items-center justify-between gap-3 shrink-0">
          <div className="text-sm font-semibold text-white whitespace-nowrap">
            {activeNav === 'processes'
              ? `Processes (${openWindows.length} Active Apps)`
              : activeNav === 'performance'
              ? 'Real-Time Hardware & Browser Telemetry'
              : activeNav === 'details'
              ? 'Process Details & Virtual Desktop Allocation'
              : activeNav === 'startup'
              ? 'Startup Applications'
              : 'Signed-in User Sessions'}
          </div>

          <div className="flex items-center gap-2">
            {(activeNav === 'processes' || activeNav === 'details') && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={processSearch}
                  onChange={(e) => setProcessSearch(e.target.value)}
                  placeholder="Filter processes..."
                  className="pl-8 pr-3 py-1 rounded-[4px] bg-[#141414] border border-white/[0.1] text-xs text-white w-44 focus:outline-none focus:border-[#60cdff]"
                />
              </div>
            )}

            {onLaunchApp && (
              <button
                onClick={() => setIsRunModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-white transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#60cdff]" />
                <span>Run new task</span>
              </button>
            )}

            {activeNav === 'processes' && selectedWinId && onToggleEfficiencyMode && (
              <button
                onClick={() => onToggleEfficiencyMode(selectedWinId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-400/40 text-xs font-medium text-emerald-300 transition-colors whitespace-nowrap shrink-0"
              >
                <Leaf className="w-3.5 h-3.5" />
                <span>Efficiency mode</span>
              </button>
            )}

            {activeNav === 'processes' && selectedWinId && (
              <button
                onClick={() => {
                  onCloseWindow(selectedWinId);
                  setSelectedWinId(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#c42b1c] hover:bg-red-700 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>End task</span>
              </button>
            )}
          </div>
        </div>

        {/* Run New Task Inline Bar */}
        {isRunModalOpen && (
          <form
            onSubmit={handleRunNewTask}
            className="px-4 py-2.5 bg-[#252526] border-b border-[#60cdff]/30 flex items-center gap-2"
          >
            <span className="text-xs text-[#60cdff] font-medium shrink-0">Open App:</span>
            <input
              type="text"
              autoFocus
              value={runInput}
              onChange={(e) => setRunInput(e.target.value)}
              placeholder="Type app name (e.g. edge, vscode, paint, copilot, spotify, terminal)..."
              className="flex-1 bg-[#141414] border border-white/[0.14] rounded px-3 py-1 text-xs text-white focus:outline-none focus:border-[#60cdff]"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white"
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => setIsRunModalOpen(false)}
              className="px-2.5 py-1 rounded bg-white/[0.08] text-xs text-neutral-300"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Section 1: Processes Table */}
        {activeNav === 'processes' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="border border-white/[0.08] rounded-[6px] overflow-hidden bg-[#202020]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#252526] text-neutral-400">
                    <th className="py-2.5 px-3">Application Name</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">CPU</th>
                    <th className="py-2.5 px-3 text-right">Memory</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWindows.map((win, idx) => {
                    const isSel = selectedWinId === win.id;
                    const isEco = Boolean(win.efficiencyMode);
                    const rawCpu = (idx + 1) * 2.4 + (currentCpu % 4);
                    const procCpu = (isEco ? rawCpu * 0.35 : rawCpu).toFixed(1);
                    const procMem = isEco
                      ? Math.round((140 + win.title.length * 8) * 0.65)
                      : 140 + win.title.length * 8;
                    return (
                      <tr
                        key={win.id}
                        onClick={() => setSelectedWinId(win.id)}
                        className={`border-b border-white/[0.04] cursor-pointer transition-colors ${
                          isSel ? 'bg-[#0078d4]/25' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <td className="py-2.5 px-3 flex items-center gap-2.5">
                          <AppIconRenderer appId={win.appId} size={18} />
                          <span className="font-medium text-white">{win.title}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[11px] text-neutral-300">
                            {isEco
                              ? 'Efficiency mode (Eco QoS)'
                              : win.isMinimized
                              ? 'Suspended / Background'
                              : 'Running'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#60cdff]">
                          {procCpu}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-300">
                          {procMem} MB
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5">
                          {onToggleEfficiencyMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleEfficiencyMode(win.id);
                              }}
                              className={`px-2 py-1 rounded-[4px] text-[11px] transition-colors ${
                                isEco
                                  ? 'bg-emerald-500/25 text-emerald-300'
                                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300'
                              }`}
                              title="Toggle Windows 11 Eco Efficiency Mode"
                            >
                              {isEco ? 'Eco On' : 'Eco Mode'}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFocusWindow(win.id);
                            }}
                            className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 rounded-[4px] text-[11px]"
                          >
                            Switch to
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseWindow(win.id);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/[0.06] hover:bg-[#c42b1c] text-neutral-200 hover:text-white rounded-[4px] text-[11px] transition-colors"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>End task</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-b border-white/[0.04] bg-[#1b1b1b] text-neutral-400">
                    <td className="py-2 px-3 flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-[#60cdff]" />
                      <span>Desktop Window Manager (dwm.exe)</span>
                    </td>
                    <td className="py-2 px-3 text-[11px]">System Service</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">1.2%</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums">94 MB</td>
                    <td className="py-2 px-3 text-right text-[10px] text-neutral-500">Protected</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 2: Real-Time Performance Graphs */}
        {activeNav === 'performance' && (
          <div className="flex-1 flex overflow-hidden p-4 gap-4">
            <div className="w-48 space-y-2 shrink-0">
              {[
                {
                  id: 'cpu',
                  label: 'CPU',
                  sub: `${currentCpu}% · 4.80 GHz`,
                  color: 'border-[#60cdff]',
                },
                {
                  id: 'memory',
                  label: 'Memory',
                  sub: `${usedGb}/16.0 GB (${currentMemPct}%)`,
                  color: 'border-emerald-400',
                },
                {
                  id: 'disk',
                  label: 'Disk 0 (NVMe)',
                  sub: '2% · Active',
                  color: 'border-amber-400',
                },
                {
                  id: 'gpu',
                  label: 'GPU 0 (RTX)',
                  sub: `${liveFps} FPS · 42°C`,
                  color: 'border-purple-400',
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPerfMetric(m.id as typeof perfMetric)}
                  className={`w-full p-3 rounded-[6px] border text-left transition-all ${
                    perfMetric === m.id
                      ? `bg-[#252526] ${m.color}`
                      : 'bg-[#1e1e1e] border-white/[0.06] hover:bg-[#242424]'
                  }`}
                >
                  <div className="text-xs font-semibold text-white">{m.label}</div>
                  <div className="text-[11px] text-neutral-400 font-mono tabular-nums mt-0.5">
                    {m.sub}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex-1 bg-[#202020] border border-white/[0.08] rounded-[6px] p-4 space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-white uppercase">{perfMetric}</div>
                  <div className="text-xs text-neutral-400">
                    {perfMetric === 'cpu'
                      ? 'Intel Core i9-14900K · 24 Cores / 32 Logical Processors'
                      : perfMetric === 'memory'
                      ? `16.0 GB DDR5-6400 · Browser JS Heap: ${jsHeapMb} MB`
                      : perfMetric === 'disk'
                      ? 'Samsung 990 PRO 2TB PCIe 4.0 NVMe SSD (IndexedDB Storage)'
                      : `NVIDIA GeForce RTX 4080 Super · Live Compositor: ${liveFps} FPS`}
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-[#60cdff]">
                  {perfMetric === 'cpu'
                    ? `${currentCpu}%`
                    : perfMetric === 'memory'
                    ? `${currentMemPct}%`
                    : perfMetric === 'disk'
                    ? '2%'
                    : `${liveFps} FPS`}
                </div>
              </div>

              {perfMetric === 'cpu' &&
                renderSvgSparkline(cpuSeries, '#60cdff', 'rgba(96,205,255,0.18)')}
              {perfMetric === 'memory' &&
                renderSvgSparkline(memSeries, '#10b981', 'rgba(16,185,129,0.18)')}
              {perfMetric === 'disk' &&
                renderSvgSparkline(
                  cpuSeries.map((v) => Math.max(1, Math.round(v * 0.15))),
                  '#f59e0b',
                  'rgba(245,158,11,0.18)'
                )}
              {perfMetric === 'gpu' &&
                renderSvgSparkline(
                  cpuSeries.map((v) => Math.min(95, Math.round(v * 0.85))),
                  '#a855f7',
                  'rgba(168,85,247,0.18)'
                )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono tabular-nums">
                <div className="p-2.5 rounded bg-[#161616] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-400 font-sans">Live FPS</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                    {liveFps} FPS
                  </div>
                </div>
                <div className="p-2.5 rounded bg-[#161616] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-400 font-sans">DOM Nodes</div>
                  <div className="text-sm font-semibold text-white mt-0.5">{domNodeCount}</div>
                </div>
                <div className="p-2.5 rounded bg-[#161616] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-400 font-sans">JS Heap Used</div>
                  <div className="text-sm font-semibold text-[#60cdff] mt-0.5">{jsHeapMb} MB</div>
                </div>
                <div className="p-2.5 rounded bg-[#161616] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-400 font-sans">Eco Processes</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                    {ecoWindowsCount} Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Process Details & PID Table */}
        {activeNav === 'details' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="border border-white/[0.08] rounded-[6px] overflow-hidden bg-[#202020]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#252526] text-neutral-400">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3 text-right">PID</th>
                    <th className="py-2.5 px-3">Virtual Desktop</th>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3 text-right">Threads</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {filteredWindows.map((win, i) => {
                    const pid = 4120 + i * 184;
                    const deskName =
                      virtualDesktops.find((d) => d.id === win.desktopId)?.name || 'Desktop 1';
                    return (
                      <tr
                        key={win.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03]"
                      >
                        <td className="py-2.5 px-3 font-sans font-medium text-white">
                          {win.appId}.exe ({win.title})
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#60cdff]">{pid}</td>
                        <td className="py-2.5 px-3 font-sans text-neutral-300">{deskName}</td>
                        <td className="py-2.5 px-3 font-sans text-neutral-300">
                          {win.efficiencyMode ? 'Eco / Low' : 'Normal'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-neutral-300">
                          {14 + (i % 5) * 4}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Startup Apps */}
        {activeNav === 'startup' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="border border-white/[0.08] rounded-[6px] overflow-hidden bg-[#202020]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#252526] text-neutral-400">
                    <th className="py-2.5 px-3">Startup App</th>
                    <th className="py-2.5 px-3">Publisher</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Startup impact</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(['copilot', 'edge', 'spotify', 'vscode', 'terminal'] as AppId[]).map(
                    (appId) => {
                      const def = APP_DEFINITIONS.find((a) => a.id === appId);
                      const enabled = Boolean(startupMap[appId]);
                      return (
                        <tr
                          key={appId}
                          className="border-b border-white/[0.04] hover:bg-white/[0.03]"
                        >
                          <td className="py-2.5 px-3 flex items-center gap-2.5">
                            <AppIconRenderer appId={appId} size={18} />
                            <span className="font-medium text-white">{def?.name || appId}</span>
                          </td>
                          <td className="py-2.5 px-3 text-neutral-400">Microsoft Corporation</td>
                          <td className="py-2.5 px-3 text-neutral-300">
                            {enabled ? 'Enabled' : 'Disabled'}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-300">
                            {enabled ? 'Medium' : 'None'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => toggleStartupApp(appId)}
                              className="px-3 py-1 rounded bg-white/[0.07] hover:bg-white/[0.14] text-xs text-white"
                            >
                              {enabled ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 5: Users */}
        {activeNav === 'users' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(accounts.length > 0 ? accounts : DEFAULT_ACCOUNTS).map((acc) => {
              const isAct =
                acc.id === activeAccountId || (!activeAccountId && acc.id === 'acc-admin');
              return (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-[6px] bg-[#202020] border border-white/[0.08] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                      style={{ backgroundColor: acc.avatarColor }}
                    >
                      {acc.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {acc.name} ({acc.role})
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {isAct
                          ? `Active Session · ${openWindows.length} running processes · Cloud Sync Active`
                          : 'Ready to switch session'}
                      </div>
                    </div>
                  </div>
                  {!isAct && onSwitchAccount && (
                    <button
                      onClick={() => onSwitchAccount(acc.id)}
                      className="px-3 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-medium text-white"
                    >
                      Switch to User
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * 6. AUTHENTIC WINDOWS 11 SETTINGS APP
 * ========================================================================== */
export const SettingsApp: React.FC<{
  settings: SystemSettings;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  isPreviewMode?: boolean;
  onTogglePreviewMode?: () => void;
  onUpdateSettings: (partial: Partial<SystemSettings>) => void;
  onResetFileSystem: () => void;
  onAutoArrangeDesktop: () => void;
  onLockSystem?: () => void;
  onSwitchUserAccount?: (account: UserAccount) => void;
  onSyncCloudNow?: () => Promise<void>;
  onExportSystemBackup?: () => void;
  onImportSystemBackup?: (file: File) => void;
  onFactoryReset?: (keepUserFiles: boolean) => void;
  fileSystem?: FileSystemItem[];
}> = ({
  settings,
  isFullScreen,
  onToggleFullScreen,
  onUpdateSettings,
  onAutoArrangeDesktop,
  onLockSystem,
  onSwitchUserAccount,
  onSyncCloudNow,
  onExportSystemBackup,
  onFactoryReset,
  fileSystem = [],
}) => {
  const [activeSection, setActiveSection] = useState<
    'system' | 'personalization' | 'taskbar' | 'icons' | 'accounts' | 'software'
  >('personalization');
  const [selectedAppForIcon, setSelectedAppForIcon] = useState<AppId>('vscode');
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccEmail, setNewAccEmail] = useState<string>('');
  const [newAccRole, setNewAccRole] = useState<'Administrator' | 'Standard User'>('Administrator');
  const [newAccPassword, setNewAccPassword] = useState<string>('');
  const [newAccColor, setNewAccColor] = useState<string>('#10b981');
  const [accMessage, setAccMessage] = useState<string>('');
  const [resetPasswordInput, setResetPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [passwordResetMsg, setPasswordResetMsg] = useState<string>('');
  const [customWallpaperFeedback, setCustomWallpaperFeedback] = useState<string>('');
  const wallpaperUploadRef = useRef<HTMLInputElement>(null);

  const accounts: UserAccount[] =
    settings.accounts && settings.accounts.length > 0 ? settings.accounts : DEFAULT_ACCOUNTS;

  const activeAccount: UserAccount =
    accounts.find((a) => a.id === (settings.activeAccountId || settings.currentAccountId)) ||
    accounts[0];

  const windowsImages = (fileSystem || []).filter(
    (f) =>
      f.type === 'image' ||
      Boolean(f.imageUrl || f.mediaUrl) ||
      /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(f.name)
  );

  return (
    <div className="flex h-full bg-[#191919] text-white select-none overflow-hidden">
      {/* Left Navigation Sidebar */}
      <div className="w-60 bg-[#141414] border-r border-white/[0.07] p-3 flex flex-col justify-between shrink-0">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
              style={{ backgroundColor: activeAccount.avatarColor }}
            >
              {activeAccount.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{activeAccount.name}</div>
              <div className="text-[11px] text-neutral-400 truncate">{activeAccount.email}</div>
            </div>
          </div>

          <div className="space-y-1">
            {[
              { id: 'personalization', label: 'Personalization & Themes', icon: <Palette className="w-4 h-4" /> },
              { id: 'taskbar', label: 'Taskbar & Window Styles', icon: <Monitor className="w-4 h-4" /> },
              { id: 'accounts', label: 'Accounts & Lock Screen', icon: <Users className="w-4 h-4" /> },
              { id: 'icons', label: 'App Icons Studio', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'system', label: 'System & Audio', icon: <Volume2 className="w-4 h-4" /> },
              { id: 'software', label: 'Backup & Windows Update', icon: <Cloud className="w-4 h-4" /> },
            ].map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActiveSection(nav.id as typeof activeSection)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-xs font-medium transition-colors ${
                  activeSection === nav.id
                    ? 'bg-[#0078d4] text-white'
                    : 'text-neutral-300 hover:bg-white/[0.05]'
                }`}
              >
                {nav.icon}
                <span>{nav.label}</span>
              </button>
            ))}
          </div>
        </div>

        {onLockSystem && (
          <button
            onClick={onLockSystem}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-[6px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-medium text-[#60cdff]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Screen Now (Win + L)</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeSection === 'personalization' && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-semibold text-white">Personalization &amp; Live Wallpapers</h2>

            <div className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] space-y-3">
              <div className="text-xs font-semibold text-white">3D Animated Live Wallpapers</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'fluent-aurora', label: 'Fluent Aurora' },
                  { id: 'mica-waves', label: 'Mica Waves' },
                  { id: 'cyber-matrix', label: 'Cyber Matrix' },
                  { id: 'starfield-3d', label: '3D Starfield' },
                  { id: 'none', label: 'Static Wallpaper' },
                ].map((lw) => (
                  <button
                    key={lw.id}
                    onClick={() =>
                      onUpdateSettings({
                        liveWallpaperId: lw.id as SystemSettings['liveWallpaperId'],
                      })
                    }
                    className={`py-2 px-3 rounded-[6px] text-xs font-medium border transition-colors ${
                      settings.liveWallpaperId === lw.id
                        ? 'bg-[#0078d4] border-[#60cdff] text-white'
                        : 'bg-[#181818] border-white/[0.08] text-neutral-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    {lw.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] space-y-3">
              <div className="text-xs font-semibold text-white">Windows 11 Signature Wallpapers</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {WALLPAPERS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() =>
                      onUpdateSettings({
                        wallpaperId: wp.id,
                        customWallpaperUrl: undefined,
                        liveWallpaperId: 'none',
                      })
                    }
                    className={`p-2 rounded-[6px] border text-left transition-all ${
                      settings.wallpaperId === wp.id && settings.liveWallpaperId === 'none'
                        ? 'border-[#60cdff] bg-white/[0.08]'
                        : 'border-white/[0.08] bg-[#181818] hover:border-white/25'
                    }`}
                  >
                    <div
                      className="h-14 w-full rounded mb-1.5"
                      style={{ background: wp.style || wp.gradient }}
                    />
                    <div className="text-[11px] font-medium text-white truncate">{wp.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Choose Image from Windows File System or Upload from PC */}
            <div className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Choose Image from Windows (اختيار صورة من نظام Windows بتاعنا)
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    يمكنك اختيار أي صورة موجودة داخل ملفات ومشاريع Windows أو رفع صورة من جهازك
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={wallpaperUploadRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const url = reader.result as string;
                          onUpdateSettings({
                            customWallpaperUrl: url,
                            liveWallpaperId: 'none',
                          });
                          setCustomWallpaperFeedback(`تم تطبيق "${file.name}" كخلفية بنجاح!`);
                          setTimeout(() => setCustomWallpaperFeedback(''), 3500);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => wallpaperUploadRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-medium text-white transition-all cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة من جهازك (Browse PC)</span>
                  </button>
                </div>
              </div>

              {customWallpaperFeedback && (
                <div className="text-xs text-emerald-400 font-medium">{customWallpaperFeedback}</div>
              )}

              {/* Windows File System Images Grid */}
              {windowsImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {windowsImages.map((img) => {
                    const imgUrl = img.imageUrl || img.mediaUrl;
                    const isSelected = settings.customWallpaperUrl === imgUrl && settings.liveWallpaperId === 'none';
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => {
                          if (imgUrl) {
                            onUpdateSettings({
                              customWallpaperUrl: imgUrl,
                              liveWallpaperId: 'none',
                            });
                            setCustomWallpaperFeedback(`تم تطبيق صورة "${img.name}" كخلفية بنجاح!`);
                            setTimeout(() => setCustomWallpaperFeedback(''), 3500);
                          }
                        }}
                        className={`p-1.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'border-[#60cdff] bg-white/[0.12]'
                            : 'border-white/[0.08] bg-[#181818] hover:border-white/25'
                        }`}
                      >
                        <div
                          className="h-16 w-full rounded bg-cover bg-center mb-1 border border-white/[0.06]"
                          style={{ backgroundImage: `url("${imgUrl}")` }}
                        />
                        <div className="text-[10px] font-medium text-white truncate">{img.name}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[11px] text-neutral-400 py-1 bg-white/[0.02] p-2.5 rounded border border-white/[0.04]">
                  لا توجد صور في ملفات النظام حالياً. استخدم زر &quot;رفع صورة من جهازك&quot; أو احفظ أي صورة من المتصفح أو Copilot لتظهر هنا فوراً.
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'taskbar' && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-semibold text-white">Taskbar &amp; Window Appearance</h2>
            <div className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] space-y-3">
              <div className="text-xs font-semibold text-white">Taskbar Visual Style</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'default', label: 'Default Mica' },
                  { id: 'glass-center', label: 'Crystal Glass Dock' },
                  { id: 'floating', label: 'Floating Island' },
                  { id: 'acrylic', label: 'Cyan Acrylic' },
                  { id: 'compact', label: 'Compact Pro' },
                  { id: 'solid', label: 'Solid Dark' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() =>
                      onUpdateSettings({
                        taskbarStyle: st.id as SystemSettings['taskbarStyle'],
                      })
                    }
                    className={`py-2 px-3 rounded-[6px] text-xs font-medium border ${
                      settings.taskbarStyle === st.id
                        ? 'bg-[#0078d4] border-[#60cdff] text-white'
                        : 'bg-[#181818] border-white/[0.08] text-neutral-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Auto-Arrange Desktop Icons</div>
                <div className="text-[11px] text-neutral-400">
                  Snap all desktop shortcuts neatly to the left grid
                </div>
              </div>
              <button
                onClick={onAutoArrangeDesktop}
                className="px-3.5 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-medium text-white"
              >
                Arrange Icons
              </button>
            </div>
          </div>
        )}

        {activeSection === 'accounts' && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-semibold text-white">
              User Accounts &amp; Interactive Lock Screen
            </h2>

            {/* Lock Screen Password Changer & Reset Feature */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#1b253b] to-[#111827] border border-[#0078d4]/40 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0078d4] flex items-center justify-center text-white shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      Lock Screen Password &amp; PIN Reset (إعادة تعيين كلمة مرور قفل الشاشة)
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      الحساب الحالي: <span className="text-[#60cdff] font-medium">{activeAccount.name}</span> ({activeAccount.password || settings.password ? 'محمي بكلمة مرور / PIN' : 'بدون كلمة مرور'})
                    </div>
                  </div>
                </div>

                {onLockSystem && (
                  <button
                    type="button"
                    onClick={onLockSystem}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-xs font-semibold text-[#60cdff] transition-all cursor-pointer"
                    title="قفل الشاشة فوراً لتجربة كلمة المرور الجديدة (Win + L)"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>قفل الشاشة للتجربة (Win + L)</span>
                  </button>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!resetPasswordInput.trim()) {
                    setPasswordResetMsg('يرجى إدخال كلمة المرور أو رمز PIN الجديد');
                    return;
                  }
                  if (resetPasswordInput !== confirmPasswordInput) {
                    setPasswordResetMsg('كلمات المرور غير متطابقة!');
                    return;
                  }
                  const newPass = resetPasswordInput.trim();
                  const updatedAccounts = accounts.map((a) =>
                    a.id === activeAccount.id ? { ...a, password: newPass } : a
                  );
                  onUpdateSettings({
                    password: newPass,
                    accounts: updatedAccounts,
                  });
                  setResetPasswordInput('');
                  setConfirmPasswordInput('');
                  setPasswordResetMsg('تم تغيير كلمة مرور قفل الشاشة بنجاح!');
                  setTimeout(() => setPasswordResetMsg(''), 3500);
                }}
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                      New Password / PIN (كلمة المرور الجديدة):
                    </label>
                    <input
                      type="password"
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      placeholder="أدخل كلمة المرور الجديدة..."
                      className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-white/[0.14] text-xs text-white placeholder:text-neutral-500 focus:border-[#60cdff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-300 font-medium mb-1">
                      Confirm New Password (تأكيد كلمة المرور):
                    </label>
                    <input
                      type="password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      placeholder="أعد كتابة كلمة المرور للتأكيد..."
                      className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-white/[0.14] text-xs text-white placeholder:text-neutral-500 focus:border-[#60cdff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm"
                    >
                      Save New Password (حفظ كلمة المرور)
                    </button>
                    {(activeAccount.password || settings.password) && (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedAccounts = accounts.map((a) =>
                            a.id === activeAccount.id ? { ...a, password: undefined } : a
                          );
                          onUpdateSettings({
                            password: '',
                            accounts: updatedAccounts,
                          });
                          setResetPasswordInput('');
                          setConfirmPasswordInput('');
                          setPasswordResetMsg('تمت إزالة كلمة المرور. يمكنك الآن الدخول بضغطة واحدة.');
                          setTimeout(() => setPasswordResetMsg(''), 3500);
                        }}
                        className="px-3 py-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        إلغاء كلمة المرور (Remove PIN)
                      </button>
                    )}
                  </div>

                  {passwordResetMsg && (
                    <span
                      className={`text-xs font-medium ${
                        passwordResetMsg.includes('بنجاح') || passwordResetMsg.includes('إزالة')
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {passwordResetMsg}
                    </span>
                  )}
                </div>
              </form>
            </div>

            <div className="space-y-2.5">
              {accounts.map((acc) => {
                const isCurr = acc.id === activeAccount.id;
                return (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-lg bg-[#222222] border border-white/[0.08] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                        style={{ backgroundColor: acc.avatarColor }}
                      >
                        {acc.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {acc.name} · {acc.role}
                        </div>
                        <div className="text-[11px] text-neutral-400">
                          {acc.email} {acc.password ? '· PIN Enabled' : '· No PIN'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isCurr && onSwitchUserAccount && (
                        <button
                          onClick={() => onSwitchUserAccount(acc)}
                          className="px-3 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-medium text-white"
                        >
                          Switch User
                        </button>
                      )}
                      {isCurr && (
                        <span className="text-[11px] text-emerald-400 font-medium">
                          Active Account
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAccName.trim()) return;
                const created: UserAccount = {
                  id: `acc-${Date.now()}`,
                  name: newAccName.trim(),
                  email:
                    newAccEmail.trim() ||
                    `${newAccName.trim().toLowerCase().replace(/\s+/g, '.')}@windows11.local`,
                  role: newAccRole,
                  password: newAccPassword.trim() || undefined,
                  avatarColor: newAccColor,
                };
                onUpdateSettings({
                  accounts: [...accounts, created],
                });
                setNewAccName('');
                setNewAccEmail('');
                setNewAccPassword('');
                setAccMessage(`Created account "${created.name}"!`);
                setTimeout(() => setAccMessage(''), 2500);
              }}
              className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] space-y-3"
            >
              <div className="text-xs font-semibold text-white">Add New Windows 11 User Account</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="Full Name..."
                  className="px-3 py-1.5 rounded bg-[#141414] border border-white/[0.12] text-xs text-white"
                />
                <input
                  type="text"
                  value={newAccEmail}
                  onChange={(e) => setNewAccEmail(e.target.value)}
                  placeholder="Email (optional)..."
                  className="px-3 py-1.5 rounded bg-[#141414] border border-white/[0.12] text-xs text-white"
                />
                <input
                  type="password"
                  value={newAccPassword}
                  onChange={(e) => setNewAccPassword(e.target.value)}
                  placeholder="Lock Screen PIN / Password..."
                  className="px-3 py-1.5 rounded bg-[#141414] border border-white/[0.12] text-xs text-white"
                />
                <select
                  value={newAccRole}
                  onChange={(e) =>
                    setNewAccRole(e.target.value as 'Administrator' | 'Standard User')
                  }
                  className="px-3 py-1.5 rounded bg-[#141414] border border-white/[0.12] text-xs text-white"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Standard User">Standard User</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Avatar Color:</span>
                  <input
                    type="color"
                    value={newAccColor}
                    onChange={(e) => setNewAccColor(e.target.value)}
                    className="w-6 h-6 border-0 bg-transparent cursor-pointer"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white"
                >
                  Create Account
                </button>
              </div>
              {accMessage && <div className="text-xs text-emerald-400">{accMessage}</div>}
            </form>
          </div>
        )}

        {activeSection === 'icons' && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-lg font-semibold text-white">App Icon Customizer</h2>
            <div className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] space-y-3">
              <select
                value={selectedAppForIcon}
                onChange={(e) => setSelectedAppForIcon(e.target.value as AppId)}
                className="px-3 py-1.5 rounded bg-[#141414] border border-white/[0.12] text-xs text-white"
              >
                {APP_DEFINITIONS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 flex-wrap">
                {CUSTOM_ICON_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() =>
                      onUpdateSettings({
                        customAppIcons: {
                          ...(settings.customAppIcons || {}),
                          [selectedAppForIcon]: preset.url,
                        },
                      })
                    }
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#181818] hover:bg-white/[0.08] border border-white/[0.1] text-xs"
                  >
                    <img src={preset.url} alt={preset.label} className="w-5 h-5" />
                    <span>{preset.label}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    const next = { ...(settings.customAppIcons || {}) };
                    delete next[selectedAppForIcon];
                    onUpdateSettings({ customAppIcons: next });
                  }}
                  className="px-3 py-1.5 rounded bg-white/[0.06] text-xs text-rose-300"
                >
                  Reset Default Icon
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'system' && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-lg font-semibold text-white">System, Display &amp; Audio</h2>
            <div className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-300">Master Volume ({settings.volume}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.volume}
                  onChange={(e) => onUpdateSettings({ volume: Number(e.target.value) })}
                  className="w-48 accent-[#0078d4]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-300">
                  Display Brightness ({settings.brightness}%)
                </span>
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={settings.brightness}
                  onChange={(e) => onUpdateSettings({ brightness: Number(e.target.value) })}
                  className="w-48 accent-[#0078d4]"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-300">Full Screen Mode</span>
                <button
                  onClick={onToggleFullScreen}
                  className="px-3 py-1.5 rounded bg-[#0078d4] text-xs font-medium text-white"
                >
                  {isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'software' && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-lg font-semibold text-white">Cloud Sync, Backup &amp; Recovery</h2>
            <div className="p-4 rounded-lg bg-[#222222] border border-white/[0.08] flex flex-wrap gap-2">
              {onSyncCloudNow && (
                <button
                  onClick={() => void onSyncCloudNow()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#0078d4] hover:bg-[#106ebe] text-xs font-medium text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Workspace Now</span>
                </button>
              )}
              {onExportSystemBackup && (
                <button
                  onClick={onExportSystemBackup}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Full OS Backup (.json)</span>
                </button>
              )}
              {onFactoryReset && (
                <button
                  onClick={() => onFactoryReset(false)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#c42b1c] hover:bg-red-700 text-xs font-medium text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Factory Reset OS</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
