import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Download,
  Check,
  Play,
  Star,
  Sparkles,
  Layers,
  Gamepad2,
  Wrench,
  ShieldCheck,
  Code2,
  Cpu,
  Palette,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Plus,
  CheckCircle2,
  Sliders,
  Database,
  Globe,
  Terminal,
  FolderPlus,
  Loader2,
  PackageCheck,
} from 'lucide-react';
import { AppId, FileSystemItem } from '../../types/os';
import {
  StoreAppIconRenderer,
  getStoreAppSvgDataUrl,
  MicrosoftStoreSvgIcon,
} from '../icons/WinIcons';
import { injectWin11KernelBridge } from '../../utils/kernelEngine';

export type StoreCategory =
  | 'Productivity'
  | 'Developer'
  | 'Design'
  | 'System'
  | 'Games';

export interface StoreCatalogItem {
  id: string;
  name: string;
  publisher: string;
  category: StoreCategory;
  rating: string;
  downloads: string;
  version: string;
  sizeLabel: string;
  accent: string;
  iconText: string;
  description: string;
  features: string[];
  aiCapabilities: string[];
  keywords: string[];
  htmlContent: string;
  isCustomAiApp?: boolean;
  iconSvgDataUrl?: string;
}

interface MicrosoftStoreProps {
  files: FileSystemItem[];
  onCreateItem: (
    name: string,
    type: FileSystemItem['type'],
    parentId?: string,
    extra?: Partial<FileSystemItem>
  ) => FileSystemItem;
  onOpenItem: (item: FileSystemItem) => void;
  onEditItemContent?: (
    id: string,
    newContent: string,
    newName?: string,
    extraMeta?: { addedFeature?: string }
  ) => void;
  onLaunchApp?: (
    appId: AppId,
    options?: { fileId?: string; folderId?: string; customTitle?: string }
  ) => void;
  onNotify?: (title: string, message: string) => void;
}

const CUSTOM_STORE_APPS_STORAGE_KEY = 'win11_store_custom_apps_v2';
const STORE_APP_VERSIONS_STORAGE_KEY = 'win11_store_app_versions_v2';

// ============================================================================
// 1. NOTIONFLOW WORKSPACE PRO (PRODUCTIVITY & SMART NOTES + KANBAN + OS BRIDGE)
// ============================================================================
const NOTIONFLOW_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>NotionFlow Workspace Pro</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI Variable Display', 'Segoe UI', sans-serif; }
  body { background: #141414; color: #f3f4f6; height: 100vh; display: flex; overflow: hidden; }
  .sidebar { width: 230px; background: #1c1c1c; border-right: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; padding: 14px; gap: 10px; }
  .brand { display: flex; align-items: center; gap: 10px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.07); }
  .brand-badge { width: 30px; height: 30px; border-radius: 7px; background: linear-gradient(135deg,#0078d4,#60cdff); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; }
  .nav-btn { width: 100%; text-align: left; padding: 8px 10px; border-radius: 6px; border: 1px solid transparent; background: transparent; color: #d1d5db; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: space-between; }
  .nav-btn:hover { background: rgba(255,255,255,0.05); }
  .nav-btn.active { background: rgba(0,120,212,0.22); border-color: rgba(96,205,255,0.4); color: #60cdff; font-weight: 600; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { height: 52px; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 0 18px; display: flex; align-items: center; justify-content: space-between; background: #181818; }
  .btn { padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: #252525; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s; }
  .btn:hover { background: #303030; }
  .btn-primary { background: #0078d4; border-color: #60cdff; }
  .btn-primary:hover { background: #106ebe; }
  .workspace { flex: 1; display: grid; grid-template-columns: 1fr 1.15fr; gap: 16px; padding: 16px; overflow-y: auto; }
  .panel { background: #1e1e1e; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
  .panel-header { padding: 12px 14px; background: #232323; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; }
  .note-title { width: 100%; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.08); color: #fff; font-size: 16px; font-weight: 700; padding: 12px 14px; outline: none; }
  .note-body { flex: 1; width: 100%; background: transparent; border: none; color: #e5e7eb; font-size: 13px; line-height: 1.65; padding: 14px; resize: none; outline: none; min-height: 260px; }
  .kanban { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 12px; flex: 1; overflow-y: auto; }
  .col { background: #161616; border: 1px solid rgba(255,255,255,0.06); border-radius: 7px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  .col-head { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; display: flex; justify-content: space-between; }
  .task-card { background: #242424; border: 1px solid rgba(255,255,255,0.09); border-radius: 6px; padding: 9px; font-size: 12px; display: flex; flex-direction: column; gap: 6px; }
  .task-actions { display: flex; justify-content: space-between; align-items: center; gap: 4px; }
  .mini-btn { padding: 2px 6px; font-size: 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: #1b1b1b; color: #60cdff; cursor: pointer; }
  .add-bar { padding: 10px 12px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; gap: 8px; }
  .input { flex: 1; background: #141414; border: 1px solid rgba(255,255,255,0.14); border-radius: 6px; padding: 7px 10px; color: #fff; font-size: 12px; outline: none; }
  .status-pill { font-size: 11px; color: #34d399; }
</style>
</head>
<body>
  <div class="sidebar">
    <div class="brand">
      <div class="brand-badge">N</div>
      <div>
        <div style="font-size:13px;font-weight:700">NotionFlow Pro</div>
        <div style="font-size:10px;color:#9ca3af">Notes &amp; AI Kanban</div>
      </div>
    </div>
    <button class="nav-btn active" onclick="newDoc()">+ New Note Page</button>
    <div style="font-size:10px;color:#9ca3af;margin-top:6px;text-transform:uppercase">Saved Pages</div>
    <div id="docList" style="display:flex;flex-direction:column;gap:4px;flex:1;overflow-y:auto"></div>
    <button class="btn btn-primary" style="width:100%" onclick="exportToOS()">Save Note to Desktop (.md)</button>
  </div>
  <div class="main">
    <div class="topbar">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:14px;font-weight:700">Workspace &amp; Task Board</span>
        <span id="statusMsg" class="status-pill">Synced with Windows 11 &amp; Copilot</span>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="generateSmartTemplate()">AI Sprint Template</button>
        <button class="btn btn-primary" onclick="exportJsonToOS()">Backup Workspace (.json)</button>
      </div>
    </div>
    <div class="workspace">
      <div class="panel">
        <div class="panel-header">
          <span>Document Editor (Markdown Ready)</span>
          <span id="wordCount" style="font-size:11px;color:#9ca3af">0 words</span>
        </div>
        <input id="docTitle" class="note-title" placeholder="Page Title..." oninput="saveCurrentDoc()" />
        <textarea id="docBody" class="note-body" placeholder="Write structured notes, meeting plans, or code snippets here..." oninput="saveCurrentDoc()"></textarea>
      </div>
      <div class="panel">
        <div class="panel-header">
          <span>Kanban Action Board</span>
          <span id="taskStats" style="font-size:11px;color:#60cdff">0 Tasks</span>
        </div>
        <div class="kanban">
          <div class="col">
            <div class="col-head"><span>To Do</span><span id="cnt-todo">0</span></div>
            <div id="list-todo" style="display:flex;flex-direction:column;gap:8px"></div>
          </div>
          <div class="col">
            <div class="col-head"><span>In Progress</span><span id="cnt-doing">0</span></div>
            <div id="list-doing" style="display:flex;flex-direction:column;gap:8px"></div>
          </div>
          <div class="col">
            <div class="col-head"><span>Completed</span><span id="cnt-done">0</span></div>
            <div id="list-done" style="display:flex;flex-direction:column;gap:8px"></div>
          </div>
        </div>
        <div class="add-bar">
          <input id="newTaskInput" class="input" placeholder="Add a new task (or ask Copilot to add tasks)..." onkeydown="if(event.key==='Enter')addTask()" />
          <button class="btn btn-primary" onclick="addTask()">Add Task</button>
        </div>
      </div>
    </div>
  </div>
<script>
  const STORAGE_KEY = 'win11_notionflow_data_v1';
  let state = {
    activeDocId: 'doc-1',
    docs: [
      {
        id: 'doc-1',
        title: 'خطة تطوير المشاريع والمهام الذكية',
        body: '# أهداف المشروع الأساسية\\n\\n- تنظيم المهام اليومية وربطها مع Windows Copilot\\n- حفظ الملاحظات كملفات Markdown مباشرة على سطح المكتب\\n- متابعة حالة الإنجاز في لوحة Kanban التفاعلية'
      },
      {
        id: 'doc-2',
        title: 'Architecture & API Notes',
        body: '# System Integration Notes\\n\\n1. Use Postman Studio Pro to inspect REST endpoints.\\n2. Export JSON schemas directly to Visual Studio Code.'
      }
    ],
    tasks: [
      { id: 't-1', text: 'مراجعة أداء النظام عبر SysGuard Pro', status: 'todo' },
      { id: 't-2', text: 'تصميم واجهة التطبيق الجديد في المتجر', status: 'doing' },
      { id: 't-3', text: 'تحديث حزمة أدوات المطورين', status: 'done' }
    ]
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.docs)) state = parsed;
      }
    } catch (_) {}
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function renderSidebar() {
    const el = document.getElementById('docList');
    el.innerHTML = '';
    state.docs.forEach(d => {
      const btn = document.createElement('button');
      btn.className = 'nav-btn' + (d.id === state.activeDocId ? ' active' : '');
      btn.innerHTML = '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (d.title || 'Untitled') + '</span>';
      btn.onclick = () => { state.activeDocId = d.id; renderAll(); };
      el.appendChild(btn);
    });
  }

  function renderDoc() {
    const doc = state.docs.find(d => d.id === state.activeDocId) || state.docs[0];
    if (!doc) return;
    document.getElementById('docTitle').value = doc.title;
    document.getElementById('docBody').value = doc.body;
    updateWordCount(doc.body);
  }

  function updateWordCount(txt) {
    const words = (txt || '').trim().split(/\\s+/).filter(Boolean).length;
    document.getElementById('wordCount').textContent = words + ' words';
  }

  function saveCurrentDoc() {
    const doc = state.docs.find(d => d.id === state.activeDocId);
    if (!doc) return;
    doc.title = document.getElementById('docTitle').value;
    doc.body = document.getElementById('docBody').value;
    updateWordCount(doc.body);
    persist();
    renderSidebar();
  }

  function newDoc() {
    const id = 'doc-' + Date.now();
    state.docs.unshift({ id, title: 'ملاحظة جديدة ' + (state.docs.length + 1), body: '# ملاحظة جديدة\\n\\nاكتب تفاصيل الملاحظة هنا...' });
    state.activeDocId = id;
    persist();
    renderAll();
  }

  function renderTasks() {
    ['todo', 'doing', 'done'].forEach(st => {
      const container = document.getElementById('list-' + st);
      container.innerHTML = '';
      const filtered = state.tasks.filter(t => t.status === st);
      document.getElementById('cnt-' + st).textContent = filtered.length;
      filtered.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.innerHTML = '<div>' + task.text + '</div>';
        const actions = document.createElement('div');
        actions.className = 'task-actions';
        const moveBtn = document.createElement('button');
        moveBtn.className = 'mini-btn';
        moveBtn.textContent = st === 'todo' ? 'Start →' : st === 'doing' ? 'Complete ✓' : 'Reopen ↺';
        moveBtn.onclick = () => {
          task.status = st === 'todo' ? 'doing' : st === 'doing' ? 'done' : 'todo';
          persist();
          renderTasks();
        };
        const delBtn = document.createElement('button');
        delBtn.className = 'mini-btn';
        delBtn.style.color = '#f87171';
        delBtn.textContent = 'Delete';
        delBtn.onclick = () => {
          state.tasks = state.tasks.filter(x => x.id !== task.id);
          persist();
          renderTasks();
        };
        actions.appendChild(moveBtn);
        actions.appendChild(delBtn);
        card.appendChild(actions);
        container.appendChild(card);
      });
    });
    document.getElementById('taskStats').textContent = state.tasks.length + ' Active Tasks';
  }

  function addTask() {
    const inp = document.getElementById('newTaskInput');
    const val = inp.value.trim();
    if (!val) return;
    state.tasks.unshift({ id: 't-' + Date.now(), text: val, status: 'todo' });
    inp.value = '';
    persist();
    renderTasks();
  }

  function generateSmartTemplate() {
    const doc = state.docs.find(d => d.id === state.activeDocId);
    if (doc) {
      doc.body += '\\n\\n## Sprint Milestone Plan\\n- [x] Setup project structure in VS Code\\n- [ ] Test API endpoints via Postman Studio\\n- [ ] Optimize assets with OmniConvert Pro';
      state.tasks.unshift({ id: 't-' + Date.now(), text: 'تنفيذ خطة الـ Sprint الجديدة', status: 'todo' });
      persist();
      renderAll();
      setStatus('Added AI Sprint Plan & Task!');
    }
  }

  function setStatus(msg) {
    const el = document.getElementById('statusMsg');
    el.textContent = msg;
    setTimeout(() => { el.textContent = 'Synced with Windows 11 & Copilot'; }, 3500);
  }

  function exportToOS() {
    const doc = state.docs.find(d => d.id === state.activeDocId) || state.docs[0];
    if (!doc) return;
    const safeName = (doc.title || 'Note').replace(/[^a-zA-Z0-9\\u0600-\\u06FF_-]/g, '_') + '.md';
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: safeName,
      fileType: 'text',
      content: doc.body
    }, '*');
    setStatus('Saved "' + safeName + '" to Desktop!');
  }

  function exportJsonToOS() {
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: 'NotionFlow_Backup.json',
      fileType: 'code',
      content: JSON.stringify(state, null, 2)
    }, '*');
    setStatus('Saved NotionFlow_Backup.json to Desktop!');
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'COPILOT_INJECT_TASK') {
      state.tasks.unshift({ id: 't-' + Date.now(), text: e.data.taskText || 'New AI Task', status: 'todo' });
      persist();
      renderTasks();
      setStatus('Copilot added a new task!');
    }
  });

  function renderAll() { renderSidebar(); renderDoc(); renderTasks(); }
  loadState();
  renderAll();
</script>
</body>
</html>`;

// ============================================================================
// 2. SMARTSHEET & FINTRACKER STUDIO (SPREADSHEET, FORMULAS & ANALYTICS)
// ============================================================================
const SMARTSHEET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>SmartSheet & FinTracker Studio</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
  body { background: #141414; color: #f3f4f6; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  .header { height: 54px; background: #1c1c1c; border-bottom: 1px solid rgba(255,255,255,0.08); padding: 0 18px; display: flex; align-items: center; justify-content: space-between; }
  .btn { padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: #262626; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
  .btn-green { background: #107c41; border-color: #34d399; }
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 14px 18px; background: #181818; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .kpi { background: #222; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 11px; color: #9ca3af; }
  .kpi-val { font-size: 20px; font-weight: 700; margin-top: 4px; }
  .content { flex: 1; display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; padding: 16px 18px; overflow: hidden; }
  .card { background: #1e1e1e; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
  .card-head { padding: 10px 14px; background: #242424; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid rgba(255,255,255,0.06); padding: 8px 10px; text-align: left; }
  th { background: #1a1a1a; color: #9ca3af; font-weight: 600; }
  input.cell { width: 100%; background: transparent; border: 1px solid transparent; color: #fff; padding: 4px 6px; border-radius: 4px; font-size: 12px; }
  input.cell:focus { border-color: #34d399; background: #141414; outline: none; }
  select.cell { background: #181818; color: #fff; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 4px; font-size: 11px; }
  .bar-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .bar-track { height: 8px; background: #141414; border-radius: 99px; overflow: hidden; }
  .bar-fill { height: 100%; background: linear-gradient(90deg, #10b981, #60cdff); border-radius: 99px; }
</style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:28px;height:28px;border-radius:6px;background:#107c41;display:flex;align-items:center;justify-content:center;font-weight:800">X</div>
      <div>
        <div style="font-size:13px;font-weight:700">SmartSheet &amp; FinTracker Studio</div>
        <div id="sheetStatus" style="font-size:10px;color:#34d399">Live Formulas &amp; CSV Desktop Export</div>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" onclick="addRow()">+ Add Row</button>
      <button class="btn btn-green" onclick="exportCsv()">Export CSV to Desktop</button>
    </div>
  </div>
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Total Revenue (Income)</div><div id="kpiRev" class="kpi-val" style="color:#34d399">$0</div></div>
    <div class="kpi"><div class="kpi-label">Total Expenses</div><div id="kpiExp" class="kpi-val" style="color:#f87171">$0</div></div>
    <div class="kpi"><div class="kpi-label">Net Balance (SUM)</div><div id="kpiNet" class="kpi-val" style="color:#60cdff">$0</div></div>
    <div class="kpi"><div class="kpi-label">Profit Margin</div><div id="kpiMargin" class="kpi-val">0%</div></div>
  </div>
  <div class="content">
    <div class="card">
      <div class="card-head"><span>Interactive Ledger Grid (Click any cell to edit)</span><span>Auto-Calculated</span></div>
      <div style="flex:1;overflow-y:auto">
        <table>
          <thead><tr><th>Item / Description</th><th>Category</th><th>Type</th><th>Amount ($)</th><th></th></tr></thead>
          <tbody id="gridBody"></tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><span>Category Breakdown &amp; Formula Insights</span></div>
      <div id="chartArea" style="padding:16px;flex:1;overflow-y:auto"></div>
    </div>
  </div>
<script>
  let rows = [
    { id: 1, title: 'Cloud SaaS Subscription Revenue', category: 'Software', type: 'Income', amount: 4800 },
    { id: 2, title: 'AI API & GPU Compute Cluster', category: 'Infrastructure', type: 'Expense', amount: 1150 },
    { id: 3, title: 'Client Enterprise License', category: 'Sales', type: 'Income', amount: 3200 },
    { id: 4, title: 'UI/UX & Marketing Campaign', category: 'Marketing', type: 'Expense', amount: 780 },
    { id: 5, title: 'Developer Tooling & Security', category: 'Operations', type: 'Expense', amount: 420 }
  ];

  function render() {
    const tbody = document.getElementById('gridBody');
    tbody.innerHTML = '';
    let rev = 0, exp = 0;
    const catTotals = {};

    rows.forEach((r, idx) => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'Income') rev += amt; else exp += amt;
      catTotals[r.category] = (catTotals[r.category] || 0) + amt;

      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td><input class="cell" value="\${r.title}" oninput="updateCell(\${idx},'title',this.value)" /></td>
        <td><input class="cell" value="\${r.category}" oninput="updateCell(\${idx},'category',this.value)" /></td>
        <td>
          <select class="cell" onchange="updateCell(\${idx},'type',this.value)">
            <option value="Income" \${r.type==='Income'?'selected':''}>Income (+)</option>
            <option value="Expense" \${r.type==='Expense'?'selected':''}>Expense (-)</option>
          </select>
        </td>
        <td><input class="cell" type="number" value="\${r.amount}" oninput="updateCell(\${idx},'amount',this.value)" /></td>
        <td><button class="btn" style="padding:2px 7px;color:#f87171" onclick="removeRow(\${idx})">×</button></td>
      \`;
      tbody.appendChild(tr);
    });

    updateKpis(rev, exp, catTotals);
  }

  function updateCell(idx, field, val) {
    rows[idx][field] = field === 'amount' ? Number(val) || 0 : val;
    let rev = 0, exp = 0;
    const catTotals = {};
    rows.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'Income') rev += amt; else exp += amt;
      catTotals[r.category] = (catTotals[r.category] || 0) + amt;
    });
    updateKpis(rev, exp, catTotals);
  }

  function updateKpis(rev, exp, catTotals) {
    const net = rev - exp;
    const margin = rev > 0 ? Math.round((net / rev) * 100) : 0;
    document.getElementById('kpiRev').textContent = '$' + rev.toLocaleString();
    document.getElementById('kpiExp').textContent = '$' + exp.toLocaleString();
    document.getElementById('kpiNet').textContent = (net >= 0 ? '+$' : '-$') + Math.abs(net).toLocaleString();
    document.getElementById('kpiMargin').textContent = margin + '%';

    const chart = document.getElementById('chartArea');
    chart.innerHTML = '';
    const maxVal = Math.max(1, ...Object.values(catTotals));
    Object.entries(catTotals).forEach(([cat, val]) => {
      const pct = Math.min(100, Math.round((val / maxVal) * 100));
      const div = document.createElement('div');
      div.className = 'bar-row';
      div.innerHTML = \`
        <div style="display:flex;justify-content:space-between;font-size:12px">
          <span>\${cat}</span><span style="font-weight:700">$\${val.toLocaleString()}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:\${pct}%"></div></div>
      \`;
      chart.appendChild(div);
    });
  }

  function addRow() {
    rows.push({ id: Date.now(), title: 'New Entry', category: 'General', type: 'Income', amount: 500 });
    render();
  }

  function removeRow(idx) {
    rows.splice(idx, 1);
    render();
  }

  function exportCsv() {
    const lines = ['Title,Category,Type,Amount'];
    rows.forEach(r => lines.push(\`"\${r.title}","\${r.category}","\${r.type}",\${r.amount}\`));
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: 'Financial_Report.csv',
      fileType: 'text',
      content: lines.join('\\n')
    }, '*');
    document.getElementById('sheetStatus').textContent = 'Exported Financial_Report.csv to Desktop!';
  }

  render();
</script>
</body>
</html>`;

// ============================================================================
// 3. POSTMAN API STUDIO PRO (DEVELOPER HTTP/REST API CLIENT)
// ============================================================================
const POSTMAN_STUDIO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Postman API Studio Pro</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
  body { background: #141414; color: #f3f4f6; height: 100vh; display: flex; overflow: hidden; }
  .sidebar { width: 240px; background: #1b1b1b; border-right: 1px solid rgba(255,255,255,0.08); padding: 14px; display: flex; flex-direction: column; gap: 8px; }
  .preset { width: 100%; text-align: left; padding: 8px 10px; border-radius: 6px; background: #242424; border: 1px solid rgba(255,255,255,0.07); color: #e5e7eb; font-size: 11px; cursor: pointer; }
  .preset:hover { border-color: #f97316; }
  .method-tag { font-weight: 800; font-size: 10px; margin-right: 6px; color: #34d399; }
  .main { flex: 1; display: flex; flex-direction: column; padding: 16px; gap: 14px; overflow: hidden; }
  .url-bar { display: flex; gap: 8px; }
  select, input, textarea { background: #1e1e1e; border: 1px solid rgba(255,255,255,0.14); color: #fff; border-radius: 6px; padding: 8px 12px; font-size: 12px; outline: none; }
  .send-btn { background: #f97316; border: none; color: #fff; font-weight: 700; padding: 0 18px; border-radius: 6px; cursor: pointer; }
  .send-btn:hover { background: #ea580c; }
  .split { flex: 1; display: grid; grid-template-columns: 1fr 1.3fr; gap: 14px; overflow: hidden; }
  .box { background: #1c1c1c; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
  .box-head { padding: 10px 14px; background: #232323; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
  pre { flex: 1; padding: 14px; overflow: auto; font-family: Consolas, monospace; font-size: 12px; color: #93c5fd; line-height: 1.5; }
  .badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; background: rgba(16,185,129,0.2); color: #34d399; }
</style>
</head>
<body>
  <div class="sidebar">
    <div style="font-size:14px;font-weight:800;color:#f97316;margin-bottom:6px">Postman Studio Pro</div>
    <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">Live API Collections</div>
    <button class="preset" onclick="loadPreset('GET','https://jsonplaceholder.typicode.com/users/1','')"><span class="method-tag">GET</span>User Profile JSON</button>
    <button class="preset" onclick="loadPreset('GET','https://api.github.com/repos/microsoft/vscode','')"><span class="method-tag">GET</span>GitHub VS Code Repo</button>
    <button class="preset" onclick="loadPreset('GET','https://itunes.apple.com/search?term=synthwave&limit=3','')"><span class="method-tag">GET</span>iTunes Music Search</button>
    <button class="preset" onclick="loadPreset('POST','https://jsonplaceholder.typicode.com/posts','{\n  \"title\": \"Windows 11 AI App\",\n  \"body\": \"Tested via Postman Studio Pro\",\n  \"userId\": 1\n}')"><span class="method-tag" style="color:#fbbf24">POST</span>Create Cloud Record</button>
    <div style="margin-top:auto">
      <button class="preset" style="text-align:center;background:#0078d4;border-color:#60cdff;font-weight:700" onclick="saveResponseToDesktop()">Save Response (.json)</button>
    </div>
  </div>
  <div class="main">
    <div class="url-bar">
      <select id="methodSel">
        <option value="GET">GET</option>
        <option value="POST">POST</option>
        <option value="PUT">PUT</option>
        <option value="DELETE">DELETE</option>
      </select>
      <input id="urlInput" style="flex:1" value="https://jsonplaceholder.typicode.com/users/1" />
      <button class="send-btn" onclick="sendRequest()">Send Request</button>
    </div>
    <div class="split">
      <div class="box">
        <div class="box-head"><span>Request Headers &amp; JSON Body</span><span>application/json</span></div>
        <textarea id="reqBody" style="flex:1;border:none;border-radius:0;resize:none;font-family:Consolas,monospace" placeholder="{ &quot;key&quot;: &quot;value&quot; }"></textarea>
      </div>
      <div class="box">
        <div class="box-head">
          <span>Live Response Inspector</span>
          <span id="statusBadge" class="badge">Ready</span>
        </div>
        <pre id="resOutput">// Click "Send Request" to inspect live HTTP status, latency, and JSON payload...</pre>
      </div>
    </div>
  </div>
<script>
  let lastResponseText = '{}';
  function loadPreset(m, u, b) {
    document.getElementById('methodSel').value = m;
    document.getElementById('urlInput').value = u;
    document.getElementById('reqBody').value = b;
    sendRequest();
  }
  async function sendRequest() {
    const method = document.getElementById('methodSel').value;
    const url = document.getElementById('urlInput').value.trim();
    const bodyTxt = document.getElementById('reqBody').value.trim();
    const out = document.getElementById('resOutput');
    const badge = document.getElementById('statusBadge');
    out.textContent = 'Sending ' + method + ' request to ' + url + '...';
    const t0 = performance.now();
    try {
      const opts = { method, headers: { 'Accept': 'application/json' } };
      if (method !== 'GET' && bodyTxt) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = bodyTxt;
      }
      const res = await fetch(url, opts);
      const ms = Math.round(performance.now() - t0);
      const data = await res.json();
      lastResponseText = JSON.stringify(data, null, 2);
      badge.textContent = res.status + ' OK • ' + ms + ' ms';
      out.textContent = lastResponseText;
    } catch (err) {
      badge.textContent = 'Error';
      out.textContent = 'Request failed: ' + (err && err.message ? err.message : String(err));
    }
  }
  function saveResponseToDesktop() {
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: 'API_Response_' + Date.now().toString().slice(-4) + '.json',
      fileType: 'code',
      content: lastResponseText
    }, '*');
    document.getElementById('statusBadge').textContent = 'Saved to Desktop!';
  }
  sendRequest();
</script>
</body>
</html>`;

// ============================================================================
// 4. SQL & JSON DATA EXPLORER (DATABASE & STRUCTURED QUERY STUDIO)
// ============================================================================
const DATA_EXPLORER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>SQL & JSON Data Explorer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
  body { background: #141414; color: #f3f4f6; height: 100vh; display: flex; flex-direction: column; padding: 16px; gap: 12px; overflow: hidden; }
  .top { display: flex; justify-content: space-between; align-items: center; background: #1e1e1e; padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
  .query-bar { display: flex; gap: 8px; }
  input, select { background: #181818; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; outline: none; }
  .btn { padding: 8px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.12); background: #0078d4; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
  .table-wrap { flex: 1; background: #1b1b1b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 9px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); text-align: left; }
  th { background: #242424; color: #60cdff; position: sticky; top: 0; }
  tr:hover { background: rgba(255,255,255,0.03); }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div style="font-size:14px;font-weight:700;color:#60cdff">SQL &amp; JSON Data Explorer Studio</div>
      <div id="rowInfo" style="font-size:11px;color:#9ca3af">Connected to Local In-Memory Relational Engine</div>
    </div>
    <div style="display:flex;gap:8px">
      <select id="tableSel" onchange="switchTable(this.value)">
        <option value="users">Table: system_users</option>
        <option value="deployments">Table: cloud_deployments</option>
        <option value="audit">Table: security_audit_logs</option>
      </select>
      <button class="btn" onclick="exportFilteredJson()">Export Query Result (.json)</button>
    </div>
  </div>
  <div class="query-bar">
    <input id="sqlInput" style="flex:1;font-family:Consolas,monospace" placeholder="Filter rows by keyword, role, status, or region (e.g. Admin, Active, Europe)..." oninput="runFilter()" />
    <button class="btn" onclick="insertSampleRow()">+ Insert Record</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead id="thead"></thead>
      <tbody id="tbody"></tbody>
    </table>
  </div>
<script>
  const datasets = {
    users: [
      { id: 101, name: 'Abdullah Mahmoud', role: 'Lead Architect', status: 'Active', region: 'MENA / Europe', quota_gb: 512 },
      { id: 102, name: 'Sarah Jenkins', role: 'DevOps Engineer', status: 'Active', region: 'US-East', quota_gb: 256 },
      { id: 103, name: 'Omar Hassan', role: 'AI Researcher', status: 'Active', region: 'Cairo', quota_gb: 1024 },
      { id: 104, name: 'Elena Rostova', role: 'Security Analyst', status: 'Standby', region: 'EU-Central', quota_gb: 128 }
    ],
    deployments: [
      { build_id: 'dep-901', service: 'Windows-Copilot-Engine', env: 'Production', latency_ms: 42, health: '99.98%' },
      { build_id: 'dep-902', service: 'Fluent-Store-Catalog', env: 'Production', latency_ms: 19, health: '100%' },
      { build_id: 'dep-903', service: 'VSCode-Live-Compiler', env: 'Staging', latency_ms: 64, health: '99.40%' }
    ],
    audit: [
      { event_id: 'sec-01', action: 'OAuth Token Verified', severity: 'LOW', ip: '192.168.1.10', timestamp: '10:14:22' },
      { event_id: 'sec-02', action: 'Firewall Port 443 Inspected', severity: 'INFO', ip: '10.0.0.1', timestamp: '10:18:05' },
      { event_id: 'sec-03', action: 'Sandbox Runtime Validated', severity: 'LOW', ip: '127.0.0.1', timestamp: '10:21:49' }
    ]
  };
  let activeTable = 'users';
  let currentFiltered = [];

  function switchTable(t) {
    activeTable = t;
    runFilter();
  }

  function runFilter() {
    const q = (document.getElementById('sqlInput').value || '').toLowerCase().trim();
    const raw = datasets[activeTable] || [];
    currentFiltered = raw.filter(row => !q || JSON.stringify(row).toLowerCase().includes(q));
    renderTable(currentFiltered);
  }

  function renderTable(list) {
    const thead = document.getElementById('thead');
    const tbody = document.getElementById('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:24px">No matching records</td></tr>';
      return;
    }
    const cols = Object.keys(list[0]);
    thead.innerHTML = '<tr>' + cols.map(c => '<th>' + c.toUpperCase() + '</th>').join('') + '</tr>';
    list.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = cols.map(c => '<td>' + r[c] + '</td>').join('');
      tbody.appendChild(tr);
    });
    document.getElementById('rowInfo').textContent = 'Showing ' + list.length + ' rows from ' + activeTable;
  }

  function insertSampleRow() {
    const list = datasets[activeTable];
    if (activeTable === 'users') {
      list.push({ id: 100 + list.length + 1, name: 'New Workspace Dev', role: 'Full-Stack', status: 'Active', region: 'Global', quota_gb: 512 });
    } else if (activeTable === 'deployments') {
      list.push({ build_id: 'dep-' + (900 + list.length + 1), service: 'AI-Microservice', env: 'Production', latency_ms: 28, health: '100%' });
    } else {
      list.push({ event_id: 'sec-0' + (list.length + 1), action: 'System Integrity Pass', severity: 'INFO', ip: '127.0.0.1', timestamp: new Date().toLocaleTimeString() });
    }
    runFilter();
  }

  function exportFilteredJson() {
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: activeTable + '_query_export.json',
      fileType: 'code',
      content: JSON.stringify(currentFiltered, null, 2)
    }, '*');
    document.getElementById('rowInfo').textContent = 'Exported ' + activeTable + '_query_export.json to Desktop!';
  }

  runFilter();
</script>
</body>
</html>`;

// ============================================================================
// 5. OMNICONVERT STUDIO PRO (UNIVERSAL FILE, CODE & IMAGE CONVERTER)
// ============================================================================
const OMNICONVERT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>OmniConvert Studio Pro</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
  body { background: #141414; color: #f3f4f6; height: 100vh; display: flex; flex-direction: column; padding: 16px; gap: 14px; overflow: hidden; }
  .header { display: flex; justify-content: space-between; align-items: center; background: #1e1e1e; padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
  .tabs { display: flex; gap: 8px; }
  .tab { padding: 7px 14px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: #252525; color: #d1d5db; font-size: 12px; cursor: pointer; font-weight: 600; }
  .tab.active { background: #8b5cf6; border-color: #c4b5fd; color: #fff; }
  .grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; overflow: hidden; }
  .pane { background: #1b1b1b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
  .pane-head { padding: 10px 14px; background: #232323; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
  textarea { flex: 1; background: transparent; border: none; color: #e5e7eb; padding: 14px; font-family: Consolas, monospace; font-size: 12px; resize: none; outline: none; }
  .btn { padding: 6px 12px; border-radius: 6px; border: none; background: #8b5cf6; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:14px;font-weight:700;color:#c4b5fd">OmniConvert Studio Pro</div>
      <div id="convStatus" style="font-size:11px;color:#9ca3af">Convert Markdown, HTML, JSON, CSV &amp; Base64 directly to Windows 11</div>
    </div>
    <div class="tabs">
      <button class="tab active" onclick="setMode('md2html',this)">Markdown → HTML</button>
      <button class="tab" onclick="setMode('json2csv',this)">JSON → CSV</button>
      <button class="tab" onclick="setMode('csv2json',this)">CSV → JSON</button>
      <button class="tab" onclick="setMode('b64',this)">Text ↔ Base64</button>
    </div>
  </div>
  <div class="grid">
    <div class="pane">
      <div class="pane-head"><span>Source Input</span><button class="btn" onclick="runConvert()">Convert Now →</button></div>
      <textarea id="srcText" oninput="runConvert()"># Windows 11 OmniConvert Report\n\n- Fast instant conversion\n- Saves directly to Desktop\n- **100% Local & Secure**</textarea>
    </div>
    <div class="pane">
      <div class="pane-head"><span>Converted Output</span><button class="btn" style="background:#10b981" onclick="saveConverted()">Save File to Desktop</button></div>
      <textarea id="outText" readonly></textarea>
    </div>
  </div>
<script>
  let mode = 'md2html';
  function setMode(m, btn) {
    mode = m;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const src = document.getElementById('srcText');
    if (m === 'md2html') src.value = '# Windows 11 Report\\n\\n- High Performance\\n- **Fluent UI Design**';
    if (m === 'json2csv') src.value = '[\\n  {"name":"VS Code","category":"Dev","rating":4.9},\\n  {"name":"NotionFlow","category":"Productivity","rating":5.0}\\n]';
    if (m === 'csv2json') src.value = 'name,category,rating\\nVS Code,Dev,4.9\\nNotionFlow,Productivity,5.0';
    if (m === 'b64') src.value = 'Windows 11 Pro Copilot & Store Integration';
    runConvert();
  }
  function runConvert() {
    const raw = document.getElementById('srcText').value;
    const out = document.getElementById('outText');
    try {
      if (mode === 'md2html') {
        const html = raw
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/\\*\\*(.*?)\\*\\*/gim, '<strong>$1</strong>')
          .replace(/^- (.*$)/gim, '<li>$1</li>');
        out.value = '<!DOCTYPE html>\\n<html>\\n<body style="font-family:Segoe UI;padding:24px;background:#141414;color:#fff">\\n' + html + '\\n</body>\\n</html>';
      } else if (mode === 'json2csv') {
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr) || arr.length === 0) { out.value = ''; return; }
        const keys = Object.keys(arr[0]);
        const lines = [keys.join(',')];
        arr.forEach(o => lines.push(keys.map(k => JSON.stringify(o[k] ?? '')).join(',')));
        out.value = lines.join('\\n');
      } else if (mode === 'csv2json') {
        const lines = raw.trim().split(/\\r?\\n/);
        const headers = lines[0].split(',').map(h => h.trim());
        const res = lines.slice(1).map(l => {
          const vals = l.split(',');
          const obj = {};
          headers.forEach((h, i) => obj[h] = (vals[i] || '').trim());
          return obj;
        });
        out.value = JSON.stringify(res, null, 2);
      } else if (mode === 'b64') {
        out.value = btoa(unescape(encodeURIComponent(raw)));
      }
    } catch (e) {
      out.value = 'Conversion Notice: ' + e.message;
    }
  }
  function saveConverted() {
    const ext = mode === 'md2html' ? '.html' : mode === 'json2csv' ? '.csv' : mode === 'csv2json' ? '.json' : '.txt';
    const fType = mode === 'md2html' ? 'html' : mode === 'csv2json' ? 'code' : 'text';
    const name = 'Converted_' + Date.now().toString().slice(-4) + ext;
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: name,
      fileType: fType,
      content: document.getElementById('outText').value
    }, '*');
    document.getElementById('convStatus').textContent = 'Saved ' + name + ' to Desktop!';
  }
  runConvert();
</script>
</body>
</html>`;

// ============================================================================
// 6. PIXEL & VECTOR SVG STUDIO (DESIGN, FILTERS & WALLPAPER GENERATOR)
// ============================================================================
const PIXEL_STUDIO_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Pixel & Vector SVG Studio</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
  body { background: #141414; color: #fff; height: 100vh; display: flex; overflow: hidden; }
  .controls { width: 270px; background: #1c1c1c; border-right: 1px solid rgba(255,255,255,0.08); padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
  label { font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; margin-bottom: 4px; }
  input[type=range], input[type=text], input[type=color] { width: 100%; accent-color: #ec4899; }
  input[type=text] { background: #141414; border: 1px solid rgba(255,255,255,0.14); color: #fff; padding: 7px 10px; border-radius: 6px; font-size: 12px; }
  .btn { padding: 8px 12px; border-radius: 6px; border: none; background: #ec4899; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
  .btn-blue { background: #0078d4; }
  .stage { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at center, #222 0%, #111 100%); gap: 14px; }
  #previewWrap { width: 100%; max-width: 680px; aspect-ratio: 16/9; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.15); }
</style>
</head>
<body>
  <div class="controls">
    <div style="font-size:14px;font-weight:800;color:#f472b6">Pixel &amp; Vector Studio</div>
    <div>
      <label><span>Artwork Title / Logo Text</span></label>
      <input id="artTitle" type="text" value="WINDOWS 11 PRO STUDIO" oninput="renderArt()" />
    </div>
    <div>
      <label><span>Primary Gradient Color</span></label>
      <input id="col1" type="color" value="#0078d4" oninput="renderArt()" />
    </div>
    <div>
      <label><span>Accent Glow Color</span></label>
      <input id="col2" type="color" value="#ec4899" oninput="renderArt()" />
    </div>
    <div>
      <label><span>Sacred Geometry Rings</span><span id="ringVal">5</span></label>
      <input id="rings" type="range" min="1" max="12" value="5" oninput="renderArt()" />
    </div>
    <div>
      <label><span>Wave Curvature</span><span id="waveVal">140</span></label>
      <input id="wave" type="range" min="20" max="300" value="140" oninput="renderArt()" />
    </div>
    <button class="btn" onclick="saveSvgToDesktop()">Save Artwork (.svg) to Desktop</button>
    <button class="btn btn-blue" onclick="setAsWallpaper()">Set as Desktop Wallpaper</button>
    <div id="artStatus" style="font-size:11px;color:#34d399;margin-top:4px"></div>
  </div>
  <div class="stage">
    <div id="previewWrap"></div>
    <div style="font-size:11px;color:#9ca3af">Live 16:9 4K Vector Canvas — Exportable to Desktop &amp; System Wallpaper</div>
  </div>
<script>
  let currentSvg = '';
  function renderArt() {
    const title = document.getElementById('artTitle').value || '';
    const c1 = document.getElementById('col1').value;
    const c2 = document.getElementById('col2').value;
    const rings = Number(document.getElementById('rings').value);
    const wave = Number(document.getElementById('wave').value);
    document.getElementById('ringVal').textContent = rings;
    document.getElementById('waveVal').textContent = wave;

    let circles = '';
    for (let i = 1; i <= rings; i++) {
      circles += \`<circle cx="800" cy="420" r="\${i * 55}" fill="none" stroke="\${i % 2 === 0 ? c1 : c2}" stroke-opacity="\${0.55 - i * 0.03}" stroke-width="2.5" />\`;
    }

    currentSvg = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="100%" height="100%">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090d16"/>
          <stop offset="50%" stop-color="#111827"/>
          <stop offset="100%" stop-color="#1f122b"/>
        </linearGradient>
        <radialGradient id="g1" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stop-color="\${c1}" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="\${c1}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="g2" cx="75%" cy="70%" r="45%">
          <stop offset="0%" stop-color="\${c2}" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="\${c2}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)"/>
      <rect width="1600" height="900" fill="url(#g1)"/>
      <rect width="1600" height="900" fill="url(#g2)"/>
      \${circles}
      <path d="M0,\${720 - wave} Q400,\${560 + wave} 800,\${700 - wave/2} T1600,\${640} L1600,900 L0,900 Z" fill="\${c1}" fill-opacity="0.24"/>
      <path d="M0,\${770 - wave/2} Q500,\${630 + wave} 1000,\${740} T1600,\${710} L1600,900 L0,900 Z" fill="\${c2}" fill-opacity="0.22"/>
      <text x="800" y="435" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="48" font-weight="800" letter-spacing="4">\${title.replace(/[<>&]/g,'')}</text>
    </svg>\`;
    document.getElementById('previewWrap').innerHTML = currentSvg;
  }

  function saveSvgToDesktop() {
    const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(currentSvg);
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: 'VectorStudio_Art.svg',
      fileType: 'image',
      content: currentSvg,
      imageUrl: dataUrl
    }, '*');
    document.getElementById('artStatus').textContent = 'Saved VectorStudio_Art.svg to Desktop!';
  }

  function setAsWallpaper() {
    const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(currentSvg);
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SET_WALLPAPER',
      imageUrl: dataUrl,
      svgCode: currentSvg
    }, '*');
    document.getElementById('artStatus').textContent = 'Applied as Windows 11 Wallpaper!';
  }

  renderArt();
</script>
</body>
</html>`;

// ============================================================================
// 7. SYSGUARD & NETPULSE PRO (SYSTEM PERFORMANCE, NETWORK & SECURITY AUDITOR)
// ============================================================================
const SYSGUARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>SysGuard & NetPulse Pro</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
  body { background: #121212; color: #f3f4f6; height: 100vh; display: flex; flex-direction: column; padding: 16px; gap: 14px; overflow-y: auto; }
  .top { display: flex; justify-content: space-between; align-items: center; background: #1c1c1c; padding: 14px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); }
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .card { background: #1b1b1b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; }
  .val { font-size: 24px; font-weight: 800; margin-top: 6px; }
  .grid2 { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; flex: 1; }
  .panel { background: #1b1b1b; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .btn { padding: 8px 14px; border-radius: 6px; border: none; background: #0078d4; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
  .btn-emerald { background: #059669; }
  canvas { width: 100%; height: 170px; background: #141414; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); }
  .log-item { padding: 8px 10px; border-radius: 6px; background: #141414; font-size: 12px; display: flex; justify-content: space-between; border-left: 3px solid #34d399; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div style="font-size:15px;font-weight:800;color:#34d399">SysGuard &amp; NetPulse Pro — Windows 11 Telemetry</div>
      <div id="sysBanner" style="font-size:11px;color:#9ca3af">Real-time CPU/RAM Telemetry, Network Ping Benchmark &amp; Security Shield</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" onclick="runPingTest()">Test Network Latency</button>
      <button class="btn btn-emerald" onclick="cleanTempCache()">Optimize RAM &amp; Temp Cache</button>
    </div>
  </div>
  <div class="cards">
    <div class="card"><div style="font-size:11px;color:#9ca3af">CPU Utilization</div><div id="cpuVal" class="val" style="color:#60cdff">18%</div></div>
    <div class="card"><div style="font-size:11px;color:#9ca3af">Memory Allocated</div><div id="ramVal" class="val" style="color:#a78bfa">4.2 / 16 GB</div></div>
    <div class="card"><div style="font-size:11px;color:#9ca3af">Network Ping (RTT)</div><div id="pingVal" class="val" style="color:#34d399">24 ms</div></div>
    <div class="card"><div style="font-size:11px;color:#9ca3af">Security Shield</div><div id="secVal" class="val" style="color:#10b981">Protected</div></div>
  </div>
  <div class="grid2">
    <div class="panel">
      <div style="font-size:13px;font-weight:700;display:flex;justify-content:space-between">
        <span>Live Processor &amp; Memory Waveform (60Hz)</span>
        <span style="font-size:11px;color:#60cdff">Active Threads: 16</span>
      </div>
      <canvas id="telemetryCanvas" width="600" height="170"></canvas>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#9ca3af">
        <span>Kernel Uptime: 99.99%</span>
        <button class="btn" style="padding:4px 10px;font-size:11px" onclick="exportDiagReport()">Export Diagnostic Report (.txt)</button>
      </div>
    </div>
    <div class="panel">
      <div style="font-size:13px;font-weight:700">Security &amp; Subsystem Audit</div>
      <div id="auditList" style="display:flex;flex-direction:column;gap:8px">
        <div class="log-item"><span>Windows Sandbox Isolation</span><span style="color:#34d399">VERIFIED</span></div>
        <div class="log-item"><span>Store App Bridge Permissions</span><span style="color:#34d399">ENCRYPTED</span></div>
        <div class="log-item"><span>IndexedDB Storage Integrity</span><span style="color:#34d399">HEALTHY</span></div>
        <div class="log-item"><span>Copilot AI Neural Engine</span><span style="color:#60cdff">ONLINE</span></div>
      </div>
    </div>
  </div>
<script>
  const canvas = document.getElementById('telemetryCanvas');
  const ctx = canvas.getContext('2d');
  let history = Array.from({length: 50}, () => 22);

  function tick() {
    const next = Math.max(8, Math.min(88, history[history.length - 1] + (Math.random() * 18 - 9)));
    history.push(Math.round(next));
    history.shift();
    document.getElementById('cpuVal').textContent = Math.round(next) + '%';

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let y = 30; y < canvas.height; y += 35) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    ctx.beginPath();
    history.forEach((v, i) => {
      const x = (i / (history.length - 1)) * canvas.width;
      const y = canvas.height - (v / 100) * (canvas.height - 20) - 10;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#60cdff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  setInterval(tick, 600);
  tick();

  async function runPingTest() {
    const t0 = performance.now();
    try {
      await fetch(window.location.origin + '/?', { method: 'HEAD', cache: 'no-store' });
    } catch (_) {}
    const rtt = Math.max(4, Math.round(performance.now() - t0));
    document.getElementById('pingVal').textContent = rtt + ' ms';
    document.getElementById('sysBanner').textContent = 'Live Network RTT measured at ' + rtt + ' ms — Connection Optimal';
  }

  function cleanTempCache() {
    history = history.map(() => 12);
    document.getElementById('ramVal').textContent = '3.1 / 16 GB';
    document.getElementById('sysBanner').textContent = 'Memory optimized! Freed 1.1 GB of standby cache.';
  }

  function exportDiagReport() {
    const report = [
      '=== WINDOWS 11 SYSGUARD DIAGNOSTIC REPORT ===',
      'Timestamp: ' + new Date().toISOString(),
      'CPU Load: ' + document.getElementById('cpuVal').textContent,
      'RAM Usage: ' + document.getElementById('ramVal').textContent,
      'Network Latency: ' + document.getElementById('pingVal').textContent,
      'Security Status: All Sandbox & Store Bridges Healthy'
    ].join('\\n');
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: 'SysGuard_Diagnostics.txt',
      fileType: 'text',
      content: report
    }, '*');
    document.getElementById('sysBanner').textContent = 'Saved SysGuard_Diagnostics.txt to Desktop!';
  }
</script>
</body>
</html>`;

// ============================================================================
// 8. REGEX & CRYPTO SECURITY VAULT (HASHING, JWT, PASSWORDS & REGEX LAB)
// ============================================================================
const CRYPTO_VAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Regex & Crypto Security Vault</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; }
  body { background: #141414; color: #f3f4f6; height: 100vh; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 16px; overflow: hidden; }
  .panel { background: #1c1c1c; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
  .title { font-size: 13px; font-weight: 700; color: #fbbf24; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 8px; }
  input, textarea { width: 100%; background: #141414; border: 1px solid rgba(255,255,255,0.14); color: #fff; border-radius: 6px; padding: 8px 10px; font-family: Consolas, monospace; font-size: 12px; outline: none; }
  .btn { padding: 7px 12px; border-radius: 6px; border: none; background: #d97706; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
  .out-box { background: #121212; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 10px; font-family: Consolas, monospace; font-size: 11px; word-break: break-all; color: #34d399; }
</style>
</head>
<body>
  <div class="panel">
    <div class="title">SHA-256 Cryptographic Hasher &amp; Password Vault</div>
    <label style="font-size:11px;color:#9ca3af">Input String to Hash (Web Crypto SHA-256)</label>
    <input id="hashInput" value="Windows11_Enterprise_Secret_Key" oninput="computeHash()" />
    <div style="font-size:11px;color:#9ca3af">SHA-256 Digest:</div>
    <div id="hashOut" class="out-box">Computing...</div>
    <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.07);padding-top:10px">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px">High-Entropy Password Generator</div>
      <div style="display:flex;gap:8px">
        <input id="pwdOut" readonly value="" />
        <button class="btn" onclick="genPassword()">Generate</button>
      </div>
    </div>
  </div>
  <div class="panel">
    <div class="title">Live Regular Expression (Regex) Inspector</div>
    <label style="font-size:11px;color:#9ca3af">Regex Pattern (flags: gi)</label>
    <input id="rxPattern" value="([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)" oninput="testRegex()" />
    <label style="font-size:11px;color:#9ca3af">Test Corpus</label>
    <textarea id="rxText" rows="5" oninput="testRegex()">Contact admin@windows11.local or support@microsoft.com for API keys.</textarea>
    <div style="font-size:11px;color:#9ca3af">Matched Groups:</div>
    <div id="rxOut" class="out-box" style="color:#60cdff"></div>
  </div>
<script>
  async function computeHash() {
    const txt = document.getElementById('hashInput').value;
    const buf = new TextEncoder().encode(txt);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    document.getElementById('hashOut').textContent = hex;
  }
  function genPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*_+-=';
    const arr = new Uint32Array(20);
    crypto.getRandomValues(arr);
    document.getElementById('pwdOut').value = Array.from(arr).map(n => chars[n % chars.length]).join('');
  }
  function testRegex() {
    const pat = document.getElementById('rxPattern').value;
    const txt = document.getElementById('rxText').value;
    const out = document.getElementById('rxOut');
    try {
      const rx = new RegExp(pat, 'gi');
      const matches = [...txt.matchAll(rx)].map(m => m[0]);
      out.textContent = matches.length ? 'Found ' + matches.length + ' match(es): ' + JSON.stringify(matches) : '0 matches';
    } catch (e) {
      out.textContent = 'Invalid Regex: ' + e.message;
    }
  }
  computeHash();
  genPassword();
  testRegex();
</script>
</body>
</html>`;

// ============================================================================
// CLASSIC GAMES (KEPT FOR GAMES TAB & FILE COMPATIBILITY)
// ============================================================================
const CHESS_GAME_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Grandmaster Chess Pro</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; font-family:'Segoe UI',sans-serif; }
  body { background:#121318; color:#f3f4f6; display:flex; height:100vh; overflow:hidden; }
  .side { width:240px; background:#1a1c24; border-right:1px solid rgba(255,255,255,0.08); padding:16px; display:flex; flex-direction:column; gap:12px; }
  .btn { padding:8px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.12); background:#262936; color:#fff; font-size:12px; font-weight:600; cursor:pointer; }
  .btn-primary { background:#4f46e5; border-color:#818cf8; }
  .stage { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:16px; }
  .board { display:grid; grid-template-columns:repeat(8,54px); grid-template-rows:repeat(8,54px); border:4px solid #2e3244; border-radius:8px; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,0.6); }
  .sq { display:flex; align-items:center; justify-content:center; font-size:32px; cursor:pointer; user-select:none; transition:0.1s; }
  .light { background:#e2e8f0; color:#0f172a; }
  .dark { background:#475569; color:#0f172a; }
  .sel { background:#38bdf8 !important; }
  .hint { box-shadow:inset 0 0 0 4px rgba(16,185,129,0.75); }
  .log { flex:1; background:#121318; border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px; font-family:Consolas,monospace; font-size:11px; overflow-y:auto; color:#9ca3af; }
</style></head><body>
  <div class="side">
    <div style="font-size:15px;font-weight:800;color:#818cf8">Grandmaster Chess Pro</div>
    <div id="turnTxt" style="font-size:12px;color:#34d399;font-weight:600">White's Turn (You)</div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-primary" style="flex:1" onclick="resetGame()">New Match</button>
      <button class="btn" onclick="undoMove()">Undo</button>
    </div>
    <label style="font-size:11px;color:#9ca3af;display:flex;align-items:center;gap:6px">
      <input type="checkbox" id="aiToggle" checked /> Play vs Smart AI (Black)
    </label>
    <div style="font-size:11px;color:#9ca3af">Captured Pieces:</div>
    <div id="capBox" style="min-height:28px;font-size:18px;background:#121318;padding:6px;border-radius:6px"></div>
    <div style="font-size:11px;color:#9ca3af">Move Notation History:</div>
    <div id="moveLog" class="log"></div>
  </div>
  <div class="stage">
    <div class="board" id="board"></div>
  </div>
<script>
  const START = [
    ['♜','♞','♝','♛','♚','♝','♞','♜'],
    ['♟','♟','♟','♟','♟','♟','♟','♟'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['♙','♙','♙','♙','♙','♙','♙','♙'],
    ['♖','♘','♗','♕','♔','♗','♘','♖']
  ];
  const WHITE = ['♙','♖','♘','♗','♕','♔'];
  const BLACK = ['♟','♜','♞','♝','♛','♚'];
  let board = [], sel = null, turn = 'W', history = [], captured = [], moves = [];

  function isWhite(p) { return WHITE.includes(p); }
  function isBlack(p) { return BLACK.includes(p); }

  function resetGame() {
    board = START.map(r => [...r]);
    sel = null; turn = 'W'; history = []; captured = []; moves = [];
    draw();
  }

  function draw() {
    const b = document.getElementById('board');
    b.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const d = document.createElement('div');
        const isSel = sel && sel[0] === r && sel[1] === c;
        d.className = 'sq ' + ((r + c) % 2 === 0 ? 'light' : 'dark') + (isSel ? ' sel' : '');
        d.textContent = board[r][c];
        d.onclick = () => clickSq(r, c);
        b.appendChild(d);
      }
    }
    document.getElementById('turnTxt').textContent = turn === 'W' ? "White's Turn" : "Black's Turn";
    document.getElementById('capBox').textContent = captured.join(' ');
    document.getElementById('moveLog').innerHTML = moves.map((m, i) => '<div>' + (i + 1) + '. ' + m + '</div>').join('');
  }

  function clickSq(r, c) {
    const p = board[r][c];
    if (!sel) {
      if (!p) return;
      if (turn === 'W' && !isWhite(p)) return;
      if (turn === 'B' && !isBlack(p)) return;
      sel = [r, c];
      draw();
      return;
    }
    const [sr, sc] = sel;
    if (sr === r && sc === c) { sel = null; draw(); return; }
    const target = board[r][c];
    if ((turn === 'W' && isWhite(target)) || (turn === 'B' && isBlack(target))) {
      sel = [r, c]; draw(); return;
    }
    executeMove(sr, sc, r, c);
  }

  function executeMove(sr, sc, r, c) {
    history.push({ board: board.map(row => [...row]), turn, captured: [...captured], moves: [...moves] });
    const moving = board[sr][sc];
    const target = board[r][c];
    if (target) captured.push(target);
    board[r][c] = moving;
    board[sr][sc] = '';
    if (moving === '♙' && r === 0) board[r][c] = '♕';
    if (moving === '♟' && r === 7) board[r][c] = '♛';
    const cols = 'abcdefgh';
    moves.push(moving + ' ' + cols[sc] + (8 - sr) + '→' + cols[c] + (8 - r));
    sel = null;
    turn = turn === 'W' ? 'B' : 'W';
    draw();

    if (turn === 'B' && document.getElementById('aiToggle').checked) {
      setTimeout(runAiMove, 320);
    }
  }

  function runAiMove() {
    const legal = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (isBlack(board[r][c])) {
          for (let tr = 0; tr < 8; tr++) {
            for (let tc = 0; tc < 8; tc++) {
              if (!isBlack(board[tr][tc]) && Math.abs(tr - r) <= 2 && Math.abs(tc - c) <= 2) {
                legal.push({ sr: r, sc: c, r: tr, c: tc, score: isWhite(board[tr][tc]) ? 10 : Math.random() });
              }
            }
          }
        }
      }
    }
    if (legal.length > 0) {
      legal.sort((a, b) => b.score - a.score);
      const pick = legal[0];
      executeMove(pick.sr, pick.sc, pick.r, pick.c);
    }
  }

  function undoMove() {
    if (!history.length) return;
    const prev = history.pop();
    board = prev.board; turn = prev.turn; captured = prev.captured; moves = prev.moves; sel = null;
    draw();
  }

  resetGame();
</script></body></html>`;

const GAME_2048_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>2048 Win11 Edition</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; font-family:'Segoe UI',sans-serif; }
  body { background:#121318; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; gap:14px; }
  .head { width:328px; display:flex; justify-content:space-between; align-items:center; }
  .score-box { background:#1e2230; border:1px solid rgba(255,255,255,0.1); padding:6px 14px; border-radius:8px; text-align:center; }
  .grid { display:grid; grid-template-columns:repeat(4,74px); gap:8px; background:#1e2230; padding:10px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); }
  .cell { width:74px; height:74px; background:#141720; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:800; transition:0.12s; }
  .btn { background:#0078d4; color:#fff; border:none; padding:7px 14px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; }
</style></head><body>
  <div class="head">
    <div>
      <div style="font-size:22px;font-weight:900;color:#fbbf24">2048 PRO</div>
      <div style="font-size:11px;color:#9ca3af">Use Arrow Keys or WASD</div>
    </div>
    <div style="display:flex;gap:8px">
      <div class="score-box"><div style="font-size:10px;color:#9ca3af">SCORE</div><div id="sc" style="font-size:16px;font-weight:800;color:#60cdff">0</div></div>
      <div class="score-box"><div style="font-size:10px;color:#9ca3af">BEST</div><div id="bst" style="font-size:16px;font-weight:800;color:#34d399">0</div></div>
    </div>
  </div>
  <div class="grid" id="g"></div>
  <div style="display:flex;gap:8px;width:328px;justify-content:space-between">
    <button class="btn" style="background:#334155" onclick="undo()">Undo Move</button>
    <button class="btn" onclick="reset()">New Game</button>
  </div>
<script>
  const COLORS = {
    2:'#334155', 4:'#0369a1', 8:'#0284c7', 16:'#059669', 32:'#d97706',
    64:'#ea580c', 128:'#7c3aed', 256:'#db2777', 512:'#e11d48', 1024:'#eab308', 2048:'#10b981'
  };
  let b = Array(16).fill(0), score = 0, best = Number(localStorage.getItem('w11_2048_best')||0), prevB = null;

  function spawn() {
    const empty = b.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
    if(empty.length) b[empty[Math.floor(Math.random()*empty.length)]] = Math.random()<0.9?2:4;
  }
  function draw() {
    document.getElementById('sc').textContent = score;
    if (score > best) { best = score; localStorage.setItem('w11_2048_best', best); }
    document.getElementById('bst').textContent = best;
    const g = document.getElementById('g');
    g.innerHTML = b.map(v => '<div class="cell" style="background:'+(COLORS[v]||'#141720')+'">'+(v||'')+'</div>').join('');
  }
  function slide(row) {
    let arr = row.filter(Boolean);
    for(let i=0;i<arr.length-1;i++){
      if(arr[i]===arr[i+1]){ arr[i]*=2; score+=arr[i]; arr[i+1]=0; }
    }
    arr = arr.filter(Boolean);
    while(arr.length<4) arr.push(0);
    return arr;
  }
  function reset() { b = Array(16).fill(0); score = 0; spawn(); spawn(); draw(); }
  function undo() { if(prevB) { b = [...prevB]; draw(); } }
  window.addEventListener('keydown', e => {
    const k = e.key;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(k)) return;
    prevB = [...b];
    if (k==='ArrowLeft' || k==='a' || k==='ArrowRight' || k==='d') {
      const rev = k==='ArrowRight' || k==='d';
      for(let r=0;r<4;r++){
        let row = [b[r*4],b[r*4+1],b[r*4+2],b[r*4+3]];
        if(rev) row.reverse();
        row = slide(row);
        if(rev) row.reverse();
        [b[r*4],b[r*4+1],b[r*4+2],b[r*4+3]] = row;
      }
    } else {
      const rev = k==='ArrowDown' || k==='s';
      for(let c=0;c<4;c++){
        let col = [b[c],b[c+4],b[c+8],b[c+12]];
        if(rev) col.reverse();
        col = slide(col);
        if(rev) col.reverse();
        [b[c],b[c+4],b[c+8],b[c+12]] = col;
      }
    }
    spawn(); draw();
  });
  reset();
</script></body></html>`;

export const STORE_APPS_CATALOG: StoreCatalogItem[] = [
  {
    id: 'store-notionflow',
    name: 'NotionFlow Workspace Pro',
    publisher: 'Microsoft Fluent Labs',
    category: 'Productivity',
    rating: '4.9',
    downloads: '2.4M',
    version: '2.5.0',
    sizeLabel: '14.2 MB',
    accent: '#0078d4',
    iconText: 'NF',
    description:
      'مساحة عمل متكاملة للملاحظات الذكية ومستندات Markdown ولوحة مهام Kanban التفاعلية، متصلة مباشرة بملفات سطح المكتب و Windows Copilot.',
    features: [
      'محرر ملاحظات ومستندات Markdown مع حفظ فوري على سطح المكتب (.md)',
      'لوحة مهام Kanban ثلاثية الأعمدة (To Do / In Progress / Completed)',
      'تكامل مباشر مع Windows Copilot لإضافة المهام وخطط العمل تلقائياً',
      'نسخ احتياطي كامل لمساحة العمل بصيغة JSON في نظام الملفات',
    ],
    aiCapabilities: ['Task Injection via Copilot', 'Desktop File Export', 'VS Code Editable'],
    keywords: ['notion', 'notes', 'todo', 'task', 'kanban', 'productivity', 'ملاحظات', 'مهام'],
    htmlContent: NOTIONFLOW_HTML,
  },
  {
    id: 'store-smartsheet',
    name: 'SmartSheet & FinTracker Studio',
    publisher: 'Fluent Productivity Corp',
    category: 'Productivity',
    rating: '4.8',
    downloads: '1.8M',
    version: '3.1.0',
    sizeLabel: '18.6 MB',
    accent: '#107c41',
    iconText: 'XL',
    description:
      'أستوديو الجداول الحسابية والتحليل المالي الذكي مع معادلات تلقائية ورسوم بيانية فورية وتصدير مباشر لملفات CSV على سطح المكتب.',
    features: [
      'جداول بيانات تفاعلية مع حساب تلقائي للإيرادات والمصروفات وصافي الربح',
      'رسوم بيانية تحليلية فورية لتوزيع الفئات والميزانيات',
      'تصدير مباشر للتقارير المالية بصيغة CSV إلى نظام ملفات Windows 11',
    ],
    aiCapabilities: ['Automated Ledger Formulas', 'CSV File System Export', 'VS Code Editable'],
    keywords: ['excel', 'sheet', 'finance', 'budget', 'csv', 'table', 'جداول', 'حسابات'],
    htmlContent: SMARTSHEET_HTML,
  },
  {
    id: 'store-postman',
    name: 'Postman API Studio Pro',
    publisher: 'DevTools Engineering',
    category: 'Developer',
    rating: '4.9',
    downloads: '3.1M',
    version: '4.0.2',
    sizeLabel: '22.4 MB',
    accent: '#f97316',
    iconText: 'API',
    description:
      'أداة المطورين الاحترافية لاختبار وفحص طلبات HTTP REST APIs (GET / POST / PUT / DELETE) مع قياس زمن الاستجابة وحفظ مخرجات JSON مباشرة في النظام.',
    features: [
      'إرسال طلبات HTTP حية مع تخصيص الـ Headers والـ JSON Body',
      'قياس زمن الاستجابة الفعلي بالمللي ثانية (Latency ms) وعرض كود الحالة',
      'مجموعات API جاهزة للاختبار الفوري + حفظ الاستجابة كملف JSON على سطح المكتب',
    ],
    aiCapabilities: ['Live HTTP Fetch Inspector', 'JSON Response Saver', 'VS Code Bridge'],
    keywords: ['postman', 'api', 'http', 'rest', 'json', 'developer', 'مطورين'],
    htmlContent: POSTMAN_STUDIO_HTML,
  },
  {
    id: 'store-dataexplorer',
    name: 'SQL & JSON Data Explorer',
    publisher: 'Azure Data Studio Team',
    category: 'Developer',
    rating: '4.8',
    downloads: '1.5M',
    version: '2.2.0',
    sizeLabel: '19.8 MB',
    accent: '#0284c7',
    iconText: 'SQL',
    description:
      'مستكشف قواعد البيانات والبيانات المهيكلة (SQL / JSON) مع تصفية لحظية، إدراج سجلات جديدة، وتصدير نتائج الاستعلام إلى سطح المكتب.',
    features: [
      'استعراض وتصفية جداول البيانات العلائقية وسجلات الأمان والـ Cloud',
      'إضافة سجلات حية وتصدير نتائج الاستعلام المصفاة كملف JSON لسطح المكتب',
      'متوافق بالكامل مع محرر Visual Studio Code ومحلل Copilot',
    ],
    aiCapabilities: ['Structured Query Filter', 'Dataset Export to OS', 'VS Code Ready'],
    keywords: ['sql', 'database', 'data', 'json', 'table', 'query', 'قواعد بيانات'],
    htmlContent: DATA_EXPLORER_HTML,
  },
  {
    id: 'store-omniconvert',
    name: 'OmniConvert Studio Pro',
    publisher: 'Creative Media Tools',
    category: 'Design',
    rating: '4.9',
    downloads: '2.7M',
    version: '3.4.0',
    sizeLabel: '16.5 MB',
    accent: '#8b5cf6',
    iconText: 'CV',
    description:
      'المحول الشامل للملفات والمستندات والبيانات (Markdown ↔ HTML, JSON ↔ CSV, Text ↔ Base64) مع حفظ الملفات المحولة مباشرة على سطح المكتب.',
    features: [
      'تحويل فوري من Markdown إلى صفحات HTML كاملة جاهزة للتشغيل',
      'تحويل ثنائي الاتجاه بين ملفات البيانات JSON و CSV و Base64',
      'تصدير مباشر للملف المحول بامتداده الصحيح على سطح المكتب بضغطة واحدة',
    ],
    aiCapabilities: ['Multi-Format Document Engine', 'Direct Desktop File Creator'],
    keywords: ['convert', 'converter', 'markdown', 'csv', 'html', 'تحويل', 'ملفات'],
    htmlContent: OMNICONVERT_HTML,
  },
  {
    id: 'store-pixelstudio',
    name: 'Pixel & Vector SVG Studio',
    publisher: 'Fluent Design Lab',
    category: 'Design',
    rating: '4.9',
    downloads: '2.0M',
    version: '2.8.0',
    sizeLabel: '24.0 MB',
    accent: '#ec4899',
    iconText: 'SVG',
    description:
      'أستوديو التصميم الفيكتور والخلفيات عالية الدقة (4K SVG) مع تحكم حي في التدرجات اللونية والأشكال الهندسية وتعيين التصميم كخلفية لسطح المكتب فوراً.',
    features: [
      'تصميم خلفيات وشعارات فيكتور 16:9 بدقة 4K مع معاينة حية فورية',
      'تعيين أي تصميم كخلفية رسمية لنظام Windows 11 بضغطة زر واحدة',
      'حفظ ملفات الـ SVG مباشرة على سطح المكتب لفتحها في Photos أو VS Code',
    ],
    aiCapabilities: ['OS Wallpaper Setter Bridge', 'Vector SVG File Exporter'],
    keywords: ['design', 'svg', 'vector', 'pixel', 'wallpaper', 'photo', 'تصميم', 'خلفيات'],
    htmlContent: PIXEL_STUDIO_HTML,
  },
  {
    id: 'store-sysguard',
    name: 'SysGuard & NetPulse Pro',
    publisher: 'Windows Core Diagnostics',
    category: 'System',
    rating: '4.9',
    downloads: '4.2M',
    version: '5.0.1',
    sizeLabel: '12.4 MB',
    accent: '#10b981',
    iconText: 'SYS',
    description:
      'مركز فحص أداء النظام، قياس سرعة استجابة الشبكة الفعلي (Ping RTT)، تدقيق أمان وصلاحيات التطبيقات، وتنظيف الذاكرة المؤقتة.',
    features: [
      'رسم بياني حي بتردد 60Hz لاستهلاك المعالج والذاكرة العشوائية',
      'اختبار فعلي لزمن استجابة الشبكة (Network Ping Benchmark)',
      'تنظيف الذاكرة المؤقتة وتصدير تقرير فحص النظام الكامل إلى سطح المكتب',
    ],
    aiCapabilities: ['Live Network RTT Ping', 'Memory Cache Optimizer', 'Report Exporter'],
    keywords: ['system', 'network', 'ping', 'security', 'cleaner', 'cpu', 'نظام', 'أداء', 'أمان'],
    htmlContent: SYSGUARD_HTML,
  },
  {
    id: 'store-cryptovault',
    name: 'Regex & Crypto Security Vault',
    publisher: 'CyberShield DevSec',
    category: 'System',
    rating: '4.8',
    downloads: '1.3M',
    version: '2.1.0',
    sizeLabel: '11.0 MB',
    accent: '#d97706',
    iconText: 'SEC',
    description:
      'حقيبة أدوات التشفير والأمان للمطورين: توليد بصمات SHA-256 الحقيقية عبر Web Crypto API، توليد كلمات مرور مشفرة، ومختبر تعبيرات نمطية (Regex) حي.',
    features: [
      'تشفير SHA-256 فوري للنصوص والمفاتيح باستخدام Web Crypto API',
      'مولد كلمات مرور عشوائية عالية الأمان (Cryptographic Random Generator)',
      'مختبر Regex تفاعلي لاستخراج وتحليل الأنماط النصية والإيميلات فوراً',
    ],
    aiCapabilities: ['WebCrypto SHA-256 Engine', 'Live Regex Pattern Matcher'],
    keywords: ['crypto', 'hash', 'sha256', 'password', 'regex', 'security', 'تشفير'],
    htmlContent: CRYPTO_VAULT_HTML,
  },
  {
    id: 'store-chess',
    name: 'Grandmaster Chess Pro',
    publisher: 'Xbox Game Studios',
    category: 'Games',
    rating: '4.9',
    downloads: '3.5M',
    version: '1.8.0',
    sizeLabel: '15.0 MB',
    accent: '#4f46e5',
    iconText: '♛',
    description: 'لعبة الشطرنج الكلاسيكية الاحترافية بتصميم Windows 11 النظيف.',
    features: ['رقعة شطرنج تفاعلية كاملة', 'واجهة هادئة وسريعة الاستجابة'],
    aiCapabilities: ['VS Code Editable Game'],
    keywords: ['chess', 'board', 'strategy', 'شطرنج'],
    htmlContent: CHESS_GAME_HTML,
  },
  {
    id: 'store-2048',
    name: '2048 Fluent Edition',
    publisher: 'Fluent Arcade',
    category: 'Games',
    rating: '4.8',
    downloads: '2.1M',
    version: '1.4.0',
    sizeLabel: '8.2 MB',
    accent: '#eab308',
    iconText: '2048',
    description: 'لعبة الألغاز الرقمية الشهيرة 2048 بتصميم Fluent Dark السلس.',
    features: ['تحكم كامل بلوحة المفاتيح', 'حساب نقاط فوري'],
    aiCapabilities: ['VS Code Editable Game'],
    keywords: ['2048', 'puzzle', 'numbers', 'ذكاء'],
    htmlContent: GAME_2048_HTML,
  },
];

export function loadCustomStoreApps(): StoreCatalogItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_STORE_APPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveCustomStoreApps(apps: StoreCatalogItem[]): void {
  try {
    localStorage.setItem(CUSTOM_STORE_APPS_STORAGE_KEY, JSON.stringify(apps));
  } catch {
    // ignore
  }
}

export function getAllStoreCatalogApps(): StoreCatalogItem[] {
  return [...loadCustomStoreApps(), ...STORE_APPS_CATALOG];
}

export const MicrosoftStoreApp: React.FC<MicrosoftStoreProps> = ({
  files,
  onCreateItem,
  onOpenItem,
  onEditItemContent,
  onLaunchApp,
  onNotify,
}) => {
  const [activeNav, setActiveNav] = useState<
    'Home' | StoreCategory | 'AI_Forge' | 'Library'
  >('Home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customApps, setCustomApps] = useState<StoreCatalogItem[]>(() =>
    loadCustomStoreApps()
  );
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [livePreviewOpen, setLivePreviewOpen] = useState<boolean>(false);

  // Version & Update tracking
  const [appVersions, setAppVersions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORE_APP_VERSIONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  // AI Customizer inside Product Detail page
  const [aiCustomizePrompt, setAiCustomizePrompt] = useState<string>('');
  const [isAiCustomizing, setIsAiCustomizing] = useState<boolean>(false);

  // AI App Forge state (Build & Publish new Store App)
  const [forgeTitle, setForgeTitle] = useState<string>('');
  const [forgeCategory, setForgeCategory] =
    useState<StoreCategory>('Productivity');
  const [forgePrompt, setForgePrompt] = useState<string>('');
  const [forgeAccent, setForgeAccent] = useState<string>('#0078d4');
  const [isForging, setIsForging] = useState<boolean>(false);

  const allApps = useMemo(
    () => [...customApps, ...STORE_APPS_CATALOG],
    [customApps]
  );

  const selectedApp = useMemo(
    () => allApps.find((a) => a.id === selectedAppId) || null,
    [allApps, selectedAppId]
  );

  // Listen for custom store apps published by Copilot AI while Store is open
  useEffect(() => {
    const onSyncStore = () => {
      setCustomApps(loadCustomStoreApps());
    };
    window.addEventListener('win11-store-updated', onSyncStore);
    return () => window.removeEventListener('win11-store-updated', onSyncStore);
  }, []);

  const getInstalledFile = (app: StoreCatalogItem): FileSystemItem | undefined =>
    files.find(
      (f) =>
        f.parentId !== 'recyclebin' &&
        (f.name.toLowerCase() === `${app.name}.html`.toLowerCase() ||
          f.name.toLowerCase() === `${app.name}.exe`.toLowerCase() ||
          f.id === `store-installed-${app.id}`)
    );

  const installAppToOS = (app: StoreCatalogItem): FileSystemItem => {
    const existing = getInstalledFile(app);
    if (existing) return existing;
    const created = onCreateItem(`${app.name}.html`, 'html', 'desktop', {
      content: app.htmlContent,
      size: 16384,
      customIconUrl: getStoreAppSvgDataUrl(app.id, app.accent, app.iconText),
      featureHistory: [
        `تم التثبيت من Microsoft Store (${app.version})`,
        ...app.features,
      ],
    });
    const nextVers = { ...appVersions, [app.id]: app.version };
    setAppVersions(nextVers);
    try {
      localStorage.setItem(
        STORE_APP_VERSIONS_STORAGE_KEY,
        JSON.stringify(nextVers)
      );
    } catch {
      // ignore
    }
    onNotify?.(
      'Microsoft Store',
      `تم تثبيت "${app.name}" على سطح المكتب بنجاح.`
    );
    return created;
  };

  const handleOpenAppWindow = (app: StoreCatalogItem) => {
    const installed = installAppToOS(app);
    onOpenItem(installed);
  };

  const handleExportAppToVSCode = (app: StoreCatalogItem) => {
    const installed = installAppToOS(app);
    const rawHtml = installed.content || app.htmlContent;
    const styleMatch = rawHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const scriptMatch = rawHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const extractedCss = styleMatch
      ? styleMatch[1].trim()
      : 'body { font-family: Segoe UI, sans-serif; }';
    const extractedJs = scriptMatch
      ? scriptMatch[1].trim()
      : 'console.log("Store App Ready");';

    let cleanHtml = rawHtml;
    if (styleMatch) {
      cleanHtml = cleanHtml.replace(
        styleMatch[0],
        '<link rel="stylesheet" href="style.css" />'
      );
    }
    if (scriptMatch) {
      cleanHtml = cleanHtml.replace(
        scriptMatch[0],
        '<script src="script.js"></script>'
      );
    }

    const folderName = `${app.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Project`;
    const folder = onCreateItem(folderName, 'folder', 'desktop');
    const htmlFile = onCreateItem('index.html', 'html', folder.id, {
      content: cleanHtml,
      featureHistory: installed.featureHistory || [app.name],
    });
    onCreateItem('style.css', 'code', folder.id, { content: extractedCss });
    onCreateItem('script.js', 'code', folder.id, { content: extractedJs });

    onLaunchApp?.('vscode', {
      folderId: folder.id,
      fileId: htmlFile.id,
      customTitle: `${app.name} — Visual Studio Code`,
    });
  };

  const handleAiUpgradeApp = async (
    app: StoreCatalogItem,
    customRequest?: string
  ) => {
    const installed = installAppToOS(app);
    const baseCode = installed.content || app.htmlContent;
    const reqText =
      customRequest?.trim() ||
      'قم بترقية هذا التطبيق بإضافة شريط أدوات متقدم وميزة إضافية مفيدة للمستخدم مع الحفاظ على جميع الميزات الحالية 100%';

    setUpdatingAppId(app.id);
    setIsAiCustomizing(true);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `حدث وطور تطبيق "${app.name}": ${reqText}`,
          performanceTier: 'ultra',
          activeProject: {
            id: installed.id,
            name: installed.name,
            fullCode: baseCode,
            featureHistory: installed.featureHistory || app.features,
          },
        }),
      });
      const data = await res.json();
      const editAct = Array.isArray(data?.actions)
        ? data.actions.find(
            (a: any) =>
              a.content && String(a.content).trim().includes('<')
          )
        : null;

      if (editAct && editAct.content) {
        onEditItemContent?.(installed.id, editAct.content, installed.name, {
          addedFeature: reqText,
        });
        if (app.isCustomAiApp) {
          const updatedCustom = customApps.map((c) =>
            c.id === app.id ? { ...c, htmlContent: editAct.content } : c
          );
          setCustomApps(updatedCustom);
          saveCustomStoreApps(updatedCustom);
        }
        const nextVer =
          'v' +
          (
            parseFloat((appVersions[app.id] || app.version).replace('v', '')) +
            0.1
          ).toFixed(1);
        const nextMap = { ...appVersions, [app.id]: nextVer };
        setAppVersions(nextMap);
        localStorage.setItem(
          STORE_APP_VERSIONS_STORAGE_KEY,
          JSON.stringify(nextMap)
        );
        onNotify?.(
          'Microsoft Store AI Update',
          `تم تحديث "${app.name}" إلى الإصدار ${nextVer} بنجاح!`
        );
        setAiCustomizePrompt('');
      }
    } catch {
      // ignore
    } finally {
      setUpdatingAppId(null);
      setIsAiCustomizing(false);
    }
  };

  const handleForgeNewStoreApp = async () => {
    const cleanTitle = forgeTitle.trim() || 'Smart Windows Utility';
    const cleanDesc =
      forgePrompt.trim() ||
      'أداة إنتاجية ذكية لمساعدة المستخدم وحفظ المخرجات على سطح المكتب';

    setIsForging(true);
    let generatedHtml = '';
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Create a complete, high-performance Windows 11 Fluent dark-mode utility app named "${cleanTitle}" (${forgeCategory}). User requirements: ${cleanDesc}. Include a button that calls window.parent.postMessage({ type: 'STORE_OS_BRIDGE', action: 'SAVE_FILE', fileName: '${cleanTitle.replace(/\s+/g, '_')}_Output.txt', fileType: 'text', content: '...' }, '*') so the user can export their work directly to the Windows 11 Desktop!`,
          performanceTier: 'ultra',
        }),
      });
      const data = await res.json();
      const act = Array.isArray(data?.actions)
        ? data.actions.find(
            (a: any) => a.content && String(a.content).includes('<')
          )
        : null;
      if (act?.content) {
        generatedHtml = act.content;
      }
    } catch {
      // fallback below
    }

    if (!generatedHtml) {
      generatedHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${cleanTitle}</title>
<style>
  body { margin:0; background:#141414; color:#fff; font-family:'Segoe UI',sans-serif; padding:20px; display:flex; flex-direction:column; height:100vh; box-sizing:border-box; gap:14px; }
  .head { display:flex; justify-content:space-between; align-items:center; background:#1f1f1f; padding:14px 18px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); }
  textarea { flex:1; background:#1b1b1b; color:#fff; border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:14px; font-size:13px; resize:none; outline:none; }
  .btn { background:${forgeAccent}; color:#fff; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer; }
</style></head><body>
  <div class="head">
    <div>
      <div style="font-size:15px;font-weight:800">${cleanTitle}</div>
      <div id="st" style="font-size:11px;color:#9ca3af">${cleanDesc}</div>
    </div>
    <button class="btn" onclick="saveOut()">Save Output to Desktop</button>
  </div>
  <textarea id="area" placeholder="Type or process your data inside ${cleanTitle}..."># ${cleanTitle}\n\n${cleanDesc}</textarea>
<script>
  function saveOut() {
    window.parent.postMessage({
      type: 'STORE_OS_BRIDGE',
      action: 'SAVE_FILE',
      fileName: '${cleanTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Data.txt',
      fileType: 'text',
      content: document.getElementById('area').value
    }, '*');
    document.getElementById('st').textContent = 'Saved directly to Windows 11 Desktop!';
  }
</script></body></html>`;
    }

    const newApp: StoreCatalogItem = {
      id: `store-ai-${Date.now()}`,
      name: cleanTitle,
      publisher: 'Copilot AI Studio Forge',
      category: forgeCategory,
      rating: '5.0',
      downloads: 'New',
      version: '1.0.0',
      sizeLabel: '12.0 MB',
      accent: forgeAccent,
      iconText: cleanTitle.slice(0, 2).toUpperCase(),
      description: cleanDesc,
      features: [
        'تم بناؤه ونشره خصيصاً عبر Microsoft Store AI Forge',
        'متصل بجسر ملفات النظام لحفظ المخرجات على سطح المكتب',
        'قابل للتعديل البرمجي المباشر داخل Visual Studio Code',
      ],
      aiCapabilities: ['AI Forged App', 'Desktop File Bridge', 'VS Code Ready'],
      keywords: [cleanTitle.toLowerCase(), forgeCategory.toLowerCase(), 'ai'],
      htmlContent: generatedHtml,
      isCustomAiApp: true,
    };

    const nextCustom = [newApp, ...customApps];
    setCustomApps(nextCustom);
    saveCustomStoreApps(nextCustom);
    installAppToOS(newApp);
    setIsForging(false);
    setForgeTitle('');
    setForgePrompt('');
    setSelectedAppId(newApp.id);
    setLivePreviewOpen(true);
  };

  const filteredApps = useMemo(() => {
    return allApps.filter((app) => {
      const matchesCat =
        activeNav === 'Home' ||
        activeNav === 'Library' ||
        activeNav === 'AI_Forge' ||
        app.category === activeNav;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        app.keywords.some((k) => k.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [allApps, activeNav, searchQuery]);

  const installedAppsList = useMemo(
    () => allApps.filter((app) => Boolean(getInstalledFile(app))),
    [allApps, files]
  );

  const navItems: Array<{
    id: 'Home' | StoreCategory | 'AI_Forge' | 'Library';
    label: string;
    arLabel: string;
    icon: React.ReactNode;
  }> = [
    { id: 'Home', label: 'Home', arLabel: 'الرئيسية', icon: <Layers size={17} /> },
    {
      id: 'Productivity',
      label: 'Productivity',
      arLabel: 'الإنتاجية',
      icon: <FileSpreadsheet size={17} />,
    },
    {
      id: 'Developer',
      label: 'Developer',
      arLabel: 'المطورين',
      icon: <Code2 size={17} />,
    },
    {
      id: 'Design',
      label: 'Design & Media',
      arLabel: 'التصميم والملفات',
      icon: <Palette size={17} />,
    },
    {
      id: 'System',
      label: 'System & Security',
      arLabel: 'النظام والأمان',
      icon: <ShieldCheck size={17} />,
    },
    {
      id: 'Games',
      label: 'Games',
      arLabel: 'الألعاب',
      icon: <Gamepad2 size={17} />,
    },
    {
      id: 'AI_Forge',
      label: 'AI App Forge',
      arLabel: 'بناء تطبيق AI',
      icon: <Sparkles size={17} />,
    },
    {
      id: 'Library',
      label: 'Library',
      arLabel: 'المكتبة والتحديثات',
      icon: <PackageCheck size={17} />,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-[#181818] text-white select-none overflow-hidden">
      {/* Top Fluent Store Search & Header Bar */}
      <div className="h-14 px-5 bg-[#202020]/95 border-b border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          {selectedApp && (
            <button
              onClick={() => {
                setSelectedAppId(null);
                setLivePreviewOpen(false);
              }}
              className="p-1.5 rounded-[6px] bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 transition-colors"
              title="Back to Store"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <MicrosoftStoreSvgIcon size={32} className="shrink-0" />
          <div>
            <div className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <span>Microsoft Store</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#0078d4]/25 border border-[#60cdff]/30 text-[#60cdff] font-medium">
                Windows 11 Fluent Pro
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              تطبيقات إنتاجية، أدوات مطورين، وتكامل مباشر مع نظام الملفات و Copilot AI
            </div>
          </div>
        </div>

        {/* Center Fluent Search Input */}
        <div className="relative w-80 max-w-full">
          <Search
            size={14}
            className="absolute left-3.5 top-2.5 text-neutral-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedAppId) setSelectedAppId(null);
            }}
            placeholder="ابحث عن تطبيقات الإنتاجية، الـ API، التحويل، النظام..."
            className="w-full bg-[#141414] border border-white/[0.1] focus:border-[#60cdff] rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
          />
        </div>

        {/* Right Quick Library Status */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedAppId(null);
              setActiveNav('AI_Forge');
            }}
            className="px-3 py-1.5 rounded-[6px] bg-[#0078d4]/20 hover:bg-[#0078d4]/35 border border-[#60cdff]/40 text-xs font-medium text-[#60cdff] flex items-center gap-1.5 transition-colors"
          >
            <Sparkles size={13} />
            <span>نشر تطبيق بالـ AI</span>
          </button>
          <button
            onClick={() => {
              setSelectedAppId(null);
              setActiveNav('Library');
            }}
            className="px-3 py-1.5 rounded-[6px] bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs text-neutral-200 flex items-center gap-1.5 transition-colors"
          >
            <PackageCheck size={13} className="text-emerald-400" />
            <span>المكتبة ({installedAppsList.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Left Navigation Rail + Dynamic Store Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Authentic Windows 11 Slim Navigation Rail */}
        <div className="w-[78px] bg-[#1c1c1c] border-r border-white/[0.07] py-3 flex flex-col items-center gap-1.5 shrink-0 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = !selectedApp && activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedAppId(null);
                  setLivePreviewOpen(false);
                  setActiveNav(item.id);
                }}
                className={`relative w-[64px] py-2.5 rounded-[6px] flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? 'bg-white/[0.09] text-[#60cdff]'
                    : 'text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-[#60cdff]" />
                )}
                {item.icon}
                <span className="text-[10px] font-medium text-center leading-tight px-1">
                  {item.arLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Store Viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ================================================================
           * 1. RICH PRODUCT DETAIL & LIVE INTERACTIVE PREVIEW PAGE
           * ============================================================== */}
          {selectedApp ? (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Top Product Hero Card */}
              <div className="p-6 rounded-[10px] bg-[#222222] border border-white/[0.1] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                <div className="flex items-start gap-5">
                  <StoreAppIconRenderer
                    storeAppId={selectedApp.id}
                    size={76}
                    accent={selectedApp.accent}
                    iconText={selectedApp.iconText}
                    className="shrink-0 drop-shadow-lg"
                  />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl font-bold text-white">
                        {selectedApp.name}
                      </h1>
                      <span className="px-2 py-0.5 rounded bg-white/[0.08] text-[11px] text-[#60cdff] font-medium">
                        {selectedApp.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300">
                        {appVersions[selectedApp.id] || selectedApp.version}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {selectedApp.publisher} • {selectedApp.sizeLabel} •{' '}
                      <span className="text-amber-400 font-semibold">
                        ★ {selectedApp.rating}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-200 max-w-2xl leading-relaxed pt-1">
                      {selectedApp.description}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full md:w-52">
                  {(() => {
                    const installedFile = getInstalledFile(selectedApp);
                    return (
                      <>
                        <button
                          onClick={() => handleOpenAppWindow(selectedApp)}
                          className="w-full py-2.5 px-4 rounded-[6px] bg-[#0078d4] hover:bg-[#106ebe] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow transition-colors"
                        >
                          {installedFile ? (
                            <>
                              <Play size={14} />
                              <span>تشغيل التطبيق (Open)</span>
                            </>
                          ) : (
                            <>
                              <Download size={14} />
                              <span>تثبيت وتشغيل (Install)</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setLivePreviewOpen((v) => !v)}
                          className="w-full py-2 px-3 rounded-[6px] bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-xs font-medium text-[#60cdff] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ExternalLink size={13} />
                          <span>
                            {livePreviewOpen
                              ? 'إغلاق المعاينة الحية'
                              : 'معاينة حية داخل المتجر'}
                          </span>
                        </button>

                        <button
                          onClick={() => handleExportAppToVSCode(selectedApp)}
                          className="w-full py-2 px-3 rounded-[6px] bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-neutral-200 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Code2 size={13} className="text-sky-400" />
                          <span>تعديل الكود في VS Code</span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Live Interactive Sandbox Preview inside Store */}
              {livePreviewOpen && (
                <div className="rounded-[10px] overflow-hidden border border-[#60cdff]/40 bg-[#141414] shadow-2xl">
                  <div className="h-9 px-4 bg-[#202020] border-b border-white/[0.08] flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#60cdff] flex items-center gap-2">
                      <Play size={12} />
                      <span>
                        معاينة تفاعلية حية — {selectedApp.name} (متصل بسطح المكتب)
                      </span>
                    </span>
                    <button
                      onClick={() => setLivePreviewOpen(false)}
                      className="text-neutral-400 hover:text-white text-[11px]"
                    >
                      إغلاق المعاينة ×
                    </button>
                  </div>
                  <iframe
                    title={`store-preview-${selectedApp.id}`}
                    srcDoc={injectWin11KernelBridge(
                      getInstalledFile(selectedApp)?.content ||
                      selectedApp.htmlContent || '',
                      selectedApp.id
                    )}
                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox"
                    className="w-full h-[470px] border-0 bg-[#141414]"
                  />
                </div>
              )}

              {/* Features & AI Customization Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-5 rounded-[8px] bg-[#212121] border border-white/[0.08] space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>المميزات والقدرات العملية</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-neutral-300">
                    {selectedApp.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#60cdff] font-bold">•</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 border-t border-white/[0.07] flex flex-wrap gap-1.5">
                    {selectedApp.aiCapabilities.map((cap, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded bg-[#0078d4]/20 border border-[#60cdff]/30 text-[11px] text-[#60cdff]"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Live AI App Customizer & Cumulative Feature Upgrader */}
                <div className="p-5 rounded-[8px] bg-[#212121] border border-white/[0.08] space-y-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-[#60cdff]" />
                    <span>تطوير وتخصيص التطبيق بالذكاء الاصطناعي (AI Upgrade)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    اطلب إضافة أي أداة أو ميزة جديدة لهذا التطبيق وسيقوم الذكاء
                    الاصطناعي بدمجها تراكمياً مع الحفاظ على جميع بياناتك وميزاته
                    الحالية:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiCustomizePrompt}
                      onChange={(e) => setAiCustomizePrompt(e.target.value)}
                      placeholder="مثال: ضيف حاسبة ضرائب، أو زر تصدير التقرير..."
                      className="flex-1 bg-[#151515] border border-white/[0.12] rounded-[6px] px-3 py-2 text-xs text-white outline-none focus:border-[#60cdff]"
                    />
                    <button
                      disabled={isAiCustomizing}
                      onClick={() =>
                        handleAiUpgradeApp(selectedApp, aiCustomizePrompt)
                      }
                      className="px-4 py-2 rounded-[6px] bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
                    >
                      {isAiCustomizing ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>جاري التطوير...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>تحديث بالـ AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeNav === 'AI_Forge' ? (
            /* ================================================================
             * 2. AI APP FORGE (BUILD & PUBLISH NEW APP TO MICROSOFT STORE)
             * ============================================================== */
            <div className="max-w-3xl mx-auto p-6 rounded-[10px] bg-[#222222] border border-white/[0.1] space-y-5 shadow-xl">
              <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
                <div className="w-11 h-11 rounded-[10px] bg-[#0078d4]/25 border border-[#60cdff]/40 flex items-center justify-center text-[#60cdff]">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    مختبر بناء ونشر تطبيقات المتجر بالذكاء الاصطناعي (AI App Forge)
                  </h2>
                  <p className="text-xs text-neutral-400">
                    صمم أي تطبيق أو أداة إنتاجية جديدة بالذكاء الاصطناعي وانشرها
                    فوراً داخل Microsoft Store وعلى سطح المكتب
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs text-neutral-300 font-medium">
                    اسم التطبيق الجديد (App Name)
                  </label>
                  <input
                    type="text"
                    value={forgeTitle}
                    onChange={(e) => setForgeTitle(e.target.value)}
                    placeholder="مثال: Pomodoro Focus Studio أو JSON Schema Validator"
                    className="w-full bg-[#151515] border border-white/[0.12] rounded-[6px] px-3 py-2 text-xs text-white outline-none focus:border-[#60cdff]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-neutral-300 font-medium">
                    الفئة (Category)
                  </label>
                  <select
                    value={forgeCategory}
                    onChange={(e) =>
                      setForgeCategory(e.target.value as StoreCategory)
                    }
                    className="w-full bg-[#151515] border border-white/[0.12] rounded-[6px] px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="Productivity">Productivity (الإنتاجية)</option>
                    <option value="Developer">Developer (المطورين)</option>
                    <option value="Design">Design &amp; Media (التصميم)</option>
                    <option value="System">System &amp; Security (النظام)</option>
                    <option value="Games">Games (الألعاب)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-neutral-300 font-medium">
                  وصف التطبيق والميزات المطلوبة بالتفصيل
                </label>
                <textarea
                  rows={4}
                  value={forgePrompt}
                  onChange={(e) => setForgePrompt(e.target.value)}
                  placeholder="اشرح الوظائف التي تريدها في التطبيق (مثال: أداة لتنظيم أوقات العمل بنظام البومودورو مع إحصائيات يومية وحفظ التقرير على سطح المكتب)..."
                  className="w-full bg-[#151515] border border-white/[0.12] rounded-[6px] p-3 text-xs text-white outline-none focus:border-[#60cdff] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">لون الأيقونة:</span>
                  {['#0078d4', '#10b981', '#8b5cf6', '#f97316', '#ec4899'].map(
                    (col) => (
                      <button
                        key={col}
                        onClick={() => setForgeAccent(col)}
                        className={`w-6 h-6 rounded-full border-2 ${
                          forgeAccent === col
                            ? 'border-white scale-110'
                            : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    )
                  )}
                </div>

                <button
                  disabled={isForging}
                  onClick={handleForgeNewStoreApp}
                  className="px-5 py-2.5 rounded-[6px] bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2 shadow-lg"
                >
                  {isForging ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>جاري بناء ونشر التطبيق في المتجر...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>بناء ونشر في Microsoft Store الآن</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : activeNav === 'Library' ? (
            /* ================================================================
             * 3. LIBRARY & UPDATES MANAGEMENT VIEW
             * ============================================================== */
            <div className="max-w-5xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    مكتبة التطبيقات المثبتة والتحديثات (Library &amp; Updates)
                  </h2>
                  <p className="text-xs text-neutral-400">
                    إدارة وتشغيل وتحديث التطبيقات المثبتة أو فتح كودها المصدري في
                    VS Code
                  </p>
                </div>
                <span className="text-xs text-[#60cdff] font-medium">
                  {installedAppsList.length} تطبيقات مثبتة
                </span>
              </div>

              {installedAppsList.length === 0 ? (
                <div className="p-10 rounded-[8px] bg-[#212121] border border-white/[0.07] text-center space-y-3">
                  <div className="text-sm font-semibold text-neutral-200">
                    لا توجد تطبيقات مثبتة من المتجر بعد
                  </div>
                  <p className="text-xs text-neutral-400">
                    استعرض الرئيسية وثبت أدوات الإنتاجية أو المطورين بضغطة واحدة
                  </p>
                  <button
                    onClick={() => setActiveNav('Home')}
                    className="px-4 py-2 rounded-[6px] bg-[#0078d4] text-xs font-semibold text-white"
                  >
                    استعراض التطبيقات
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {installedAppsList.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-[8px] bg-[#222222] border border-white/[0.08] flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <StoreAppIconRenderer
                          storeAppId={app.id}
                          size={48}
                          accent={app.accent}
                          iconText={app.iconText}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {app.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white/[0.07] text-[10px] text-emerald-400">
                              {appVersions[app.id] || app.version}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 truncate mt-0.5">
                            {app.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenAppWindow(app)}
                          className="px-3.5 py-1.5 rounded-[6px] bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white flex items-center gap-1.5"
                        >
                          <Play size={12} />
                          <span>تشغيل</span>
                        </button>
                        <button
                          disabled={updatingAppId === app.id}
                          onClick={() => handleAiUpgradeApp(app)}
                          className="px-3 py-1.5 rounded-[6px] bg-white/[0.07] hover:bg-white/[0.13] text-xs text-[#60cdff] flex items-center gap-1.5"
                        >
                          <RefreshCw
                            size={12}
                            className={
                              updatingAppId === app.id ? 'animate-spin' : ''
                            }
                          />
                          <span>تحديث ذكي</span>
                        </button>
                        <button
                          onClick={() => handleExportAppToVSCode(app)}
                          className="px-3 py-1.5 rounded-[6px] bg-white/[0.06] hover:bg-white/[0.12] text-xs text-neutral-200 flex items-center gap-1.5"
                        >
                          <Code2 size={12} />
                          <span>VS Code</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ================================================================
             * 4. STORE HOME & CATEGORY CATALOG VIEW
             * ============================================================== */
            <div className="space-y-6">
              {/* Featured Hero Spotlight Banner (on Home) */}
              {activeNav === 'Home' && !searchQuery && (
                <div className="relative rounded-[12px] overflow-hidden bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e1b4b] border border-white/[0.12] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0078d4]/30 border border-[#60cdff]/40 text-[11px] text-[#60cdff] font-medium">
                      <Sparkles size={12} />
                      <span>الجيل الجديد من تطبيقات Windows 11</span>
                    </div>
                    <h1 className="text-xl font-bold text-white">
                      حزمة التطبيقات العملية المتكاملة للمستخدم ولـ Copilot AI
                    </h1>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      اعتمد على أدوات حقيقية لإدارة المهام والملاحظات
                      (NotionFlow)، فحص الـ API وقواعد البيانات (Postman &amp;
                      SQL Explorer)، تحويل الصيغ والتصميم (OmniConvert &amp;
                      Pixel Studio)، ومراقبة أداء وأمان النظام (SysGuard Pro).
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedAppId('store-notionflow');
                          setLivePreviewOpen(true);
                        }}
                        className="px-4 py-2 rounded-[6px] bg-[#0078d4] hover:bg-[#106ebe] text-xs font-semibold text-white flex items-center gap-1.5"
                      >
                        <Play size={13} />
                        <span>تشغيل NotionFlow Pro الآن</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAppId('store-postman');
                          setLivePreviewOpen(true);
                        }}
                        className="px-4 py-2 rounded-[6px] bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-xs font-medium text-white"
                      >
                        مختبر Postman API
                      </button>
                    </div>
                  </div>

                  {/* Quick Category Pills */}
                  <div className="grid grid-cols-2 gap-2.5 w-full md:w-72 shrink-0">
                    {[
                      {
                        cat: 'Productivity' as StoreCategory,
                        title: 'الإنتاجية والملاحظات',
                        sub: 'NotionFlow & SmartSheet',
                        color: '#0078d4',
                      },
                      {
                        cat: 'Developer' as StoreCategory,
                        title: 'أدوات المطورين',
                        sub: 'Postman & SQL Explorer',
                        color: '#f97316',
                      },
                      {
                        cat: 'Design' as StoreCategory,
                        title: 'التصميم والتحويل',
                        sub: 'OmniConvert & Vector SVG',
                        color: '#8b5cf6',
                      },
                      {
                        cat: 'System' as StoreCategory,
                        title: 'النظام والأمان',
                        sub: 'SysGuard & Crypto Vault',
                        color: '#10b981',
                      },
                    ].map((c) => (
                      <button
                        key={c.cat}
                        onClick={() => setActiveNav(c.cat)}
                        className="p-3 rounded-[8px] bg-black/35 hover:bg-black/55 border border-white/[0.1] text-left transition-all"
                      >
                        <div
                          className="text-xs font-bold"
                          style={{ color: c.color }}
                        >
                          {c.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                          {c.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* App Grid Section Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  {activeNav === 'Home'
                    ? 'جميع التطبيقات والأدوات المعتمدة (Featured Utility Apps)'
                    : `تطبيقات فئة ${activeNav}`}
                </h2>
                <span className="text-xs text-neutral-400">
                  {filteredApps.length} تطبيق متاح
                </span>
              </div>

              {/* Fluent Store Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredApps.map((app) => {
                  const installedFile = getInstalledFile(app);
                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className="p-4 rounded-[8px] bg-[#222222]/90 hover:bg-[#282828] border border-white/[0.08] hover:border-white/[0.16] transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3.5">
                        <StoreAppIconRenderer
                          storeAppId={app.id}
                          size={50}
                          accent={app.accent}
                          iconText={app.iconText}
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-xs font-bold text-white truncate">
                              {app.name}
                            </h3>
                            <span className="text-[10px] text-amber-400 font-semibold shrink-0">
                              ★ {app.rating}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#60cdff] mt-0.5">
                            {app.category} •{' '}
                            {appVersions[app.id] || app.version}
                          </div>
                          <p className="text-[11px] text-neutral-300 line-clamp-2 mt-1.5 leading-snug">
                            {app.description}
                          </p>
                        </div>
                      </div>

                      <div
                        className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedAppId(app.id);
                              setLivePreviewOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-[5px] bg-white/[0.06] hover:bg-white/[0.12] text-[11px] text-neutral-200 transition-colors"
                          >
                            معاينة حية
                          </button>
                          <button
                            onClick={() => handleExportAppToVSCode(app)}
                            className="px-2 py-1 rounded-[5px] bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-sky-400 transition-colors"
                            title="Open in VS Code"
                          >
                            VS Code
                          </button>
                        </div>

                        <button
                          onClick={() => handleOpenAppWindow(app)}
                          className={`px-3.5 py-1.5 rounded-[5px] text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                            installedFile
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-[#0078d4] hover:bg-[#106ebe] text-white'
                          }`}
                        >
                          {installedFile ? (
                            <>
                              <Play size={11} />
                              <span>تشغيل</span>
                            </>
                          ) : (
                            <>
                              <Download size={11} />
                              <span>تثبيت</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
