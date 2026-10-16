import { AIContextualMemory, FileSystemItem, SpotifyTrack, SystemSettings } from '../types/os';

const STORAGE_KEYS = {
  FILES: 'win11_os_files_v5',
  SETTINGS: 'win11_os_settings_v5',
  SPOTIFY: 'win11_os_spotify_v5',
  MEMORY: 'win11_os_ai_memory_v5',
  CHAT: 'win11_os_copilot_chat_v5',
};

const DB_NAME = 'Win11ProPersistentDB';
const DB_VERSION = 2;
const STORE_NAME = 'kv_store';

function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function dedupeFilesList(items: FileSystemItem[]): FileSystemItem[] {
  if (!Array.isArray(items)) return [];
  const byId = new Map<string, FileSystemItem>();
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) continue;
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

export function sanitizeChatMessagesList<T extends { id?: string }>(messages: T[]): T[] {
  if (!Array.isArray(messages)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  messages.forEach((msg, index) => {
    if (!msg || typeof msg !== 'object') return;
    let id = typeof msg.id === 'string' && msg.id.trim() ? msg.id : `msg-${Date.now()}-${index}`;
    if (seen.has(id)) {
      id = `${id}-dup-${index}-${Math.random().toString(36).slice(2, 6)}`;
    }
    seen.add(id);
    out.push({ ...msg, id });
  });
  return out;
}

export function loadInitialFilesSync(fallback: FileSystemItem[]): FileSystemItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FILES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return dedupeFilesList(parsed);
      }
    }
  } catch {
    // ignore
  }
  return dedupeFilesList(fallback);
}

export async function loadFilesAsync(fallback: FileSystemItem[]): Promise<FileSystemItem[]> {
  const fromIdb = await idbGet<FileSystemItem[]>(STORAGE_KEYS.FILES);
  if (Array.isArray(fromIdb) && fromIdb.length > 0) {
    return dedupeFilesList(fromIdb);
  }
  return loadInitialFilesSync(fallback);
}

export async function saveFilesAsync(files: FileSystemItem[]): Promise<void> {
  const clean = dedupeFilesList(files);
  try {
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(clean));
  } catch {
    // ignore quota errors
  }
  await idbSet(STORAGE_KEYS.FILES, clean);
}

export function loadInitialSettingsSync(fallback: SystemSettings): SystemSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...fallback, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return fallback;
}

export async function loadSettingsAsync(fallback: SystemSettings): Promise<SystemSettings> {
  const fromIdb = await idbGet<SystemSettings>(STORAGE_KEYS.SETTINGS);
  if (fromIdb && typeof fromIdb === 'object') {
    return { ...fallback, ...fromIdb };
  }
  return loadInitialSettingsSync(fallback);
}

export async function saveSettingsAsync(settings: SystemSettings): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore
  }
  await idbSet(STORAGE_KEYS.SETTINGS, settings);
}

export function loadInitialSpotifySync(fallback: SpotifyTrack[]): SpotifyTrack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SPOTIFY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return fallback;
}

export async function saveSpotifyAsync(tracks: SpotifyTrack[]): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEYS.SPOTIFY, JSON.stringify(tracks));
  } catch {
    // ignore
  }
  await idbSet(STORAGE_KEYS.SPOTIFY, tracks);
}

export function loadInitialAIMemorySync(): AIContextualMemory {
  const fallback: AIContextualMemory = {
    preferredLanguage: 'ar',
    voiceTtsEnabled: false,
    maxContextChars: 48000,
    usedContextChars: 0,
    items: [],
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return { ...fallback, ...parsed };
    }
  } catch {
    // ignore
  }
  return fallback;
}

export async function saveAIMemoryAsync(memory: AIContextualMemory): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(memory));
  } catch {
    // ignore
  }
  await idbSet(STORAGE_KEYS.MEMORY, memory);
}

export function loadInitialCopilotChatSync<T extends { id?: string }>(fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizeChatMessagesList(parsed);
      }
    }
  } catch {
    // ignore
  }
  return sanitizeChatMessagesList(fallback);
}

export async function loadCopilotChatAsync<T extends { id?: string }>(fallback: T[]): Promise<T[]> {
  const fromIdb = await idbGet<T[]>(STORAGE_KEYS.CHAT);
  if (Array.isArray(fromIdb) && fromIdb.length > 0) {
    return sanitizeChatMessagesList(fromIdb);
  }
  return loadInitialCopilotChatSync(fallback);
}

export async function saveCopilotChatAsync<T extends { id?: string }>(messages: T[]): Promise<void> {
  const clean = sanitizeChatMessagesList(messages);
  try {
    localStorage.setItem(STORAGE_KEYS.CHAT, JSON.stringify(clean));
  } catch {
    // ignore
  }
  await idbSet(STORAGE_KEYS.CHAT, clean);
}

export async function clearAllOSPersistentStorage(): Promise<void> {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
  const db = await openIDB();
  if (db) {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch {
      // ignore
    }
  }
}

export const clearAllWindowsPersistence = clearAllOSPersistentStorage;
export const saveFilesPersistence = saveFilesAsync;
export const saveSettingsPersistence = saveSettingsAsync;
export const saveSpotifyPersistence = saveSpotifyAsync;
export const loadAIMemorySync = loadInitialAIMemorySync;
export const loadCopilotChatSync = loadInitialCopilotChatSync;
export const sanitizeChatMessages = sanitizeChatMessagesList;
export const saveAIMemoryPersistence = saveAIMemoryAsync;
export const saveCopilotChatPersistence = saveCopilotChatAsync;
export const MAX_AI_MEMORY_CHARS = 1000000;

export async function loadAIMemoryAsync(): Promise<AIContextualMemory> {
  const fromIdb = await idbGet<AIContextualMemory>(STORAGE_KEYS.MEMORY);
  if (fromIdb && typeof fromIdb === 'object') {
    return fromIdb;
  }
  return loadInitialAIMemorySync();
}

export async function loadFromIndexedDB<T>(key: string): Promise<T | null> {
  return idbGet<T>(key);
}

export async function saveWindowsPersistence(windows: unknown[]): Promise<void> {
  try {
    localStorage.setItem('win11_os_windows_v5', JSON.stringify(windows));
  } catch {
    // ignore
  }
  await idbSet('win11_os_windows_v5', windows);
}

export function normalizeCleanDesktopLayout(items: FileSystemItem[], resetAll = false): FileSystemItem[] {
  const deduped = dedupeFilesList(items);
  if (resetAll) return deduped;
  return deduped;
}

export async function loadAccountProfileSnapshot(accId: string): Promise<any> {
  return idbGet(`win11_profile_${accId}`);
}

export async function saveAccountProfileSnapshot(accId: string, profile: any): Promise<number> {
  await idbSet(`win11_profile_${accId}`, profile);
  return Date.now();
}
