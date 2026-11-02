/**
 * Reads the player's local KovaaK's stats folder through the File System
 * Access API (Chrome / Edge). The folder handle is kept in IndexedDB so it only
 * has to be picked once; the browser re-asks for read permission when needed.
 *
 * The folder is the only complete record of a session: the KovaaK's web API
 * lists new high scores (last 10) and all-time bests, never ordinary runs.
 */

import { localRunFromStats, parseStatsFilename, type LocalRunPayload } from '@/lib/kovaaksStats';

const DB_NAME = 'aim-master-local';
const STORE = 'handles';
const KEY = 'kovaaks-stats-dir';

type PermissionMode = { mode: 'read' | 'readwrite' };

interface FsaDirectoryHandle extends FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  queryPermission(descriptor: PermissionMode): Promise<PermissionState>;
  requestPermission(descriptor: PermissionMode): Promise<PermissionState>;
}

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: 'read' | 'readwrite' }) => Promise<FsaDirectoryHandle>;
};

export interface LocalStatsStatus {
  supported: boolean;
  linked: boolean;
  folderName: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export class LocalStatsService {
  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof (window as PickerWindow).showDirectoryPicker === 'function' &&
      typeof indexedDB !== 'undefined'
    );
  }

  static async getHandle(): Promise<FsaDirectoryHandle | null> {
    if (!LocalStatsService.isSupported()) return null;
    try {
      return await idbGet<FsaDirectoryHandle>(KEY);
    } catch {
      return null;
    }
  }

  static async status(): Promise<LocalStatsStatus> {
    const supported = LocalStatsService.isSupported();
    const handle = supported ? await LocalStatsService.getHandle() : null;
    return { supported, linked: !!handle, folderName: handle?.name ?? null };
  }

  /**
   * Ask the player to pick the stats folder. Must run from a user gesture.
   * Returns the folder name, or null when cancelled / unsupported.
   */
  static async link(): Promise<{ folderName: string; statsFiles: number } | null> {
    const picker = (window as PickerWindow).showDirectoryPicker;
    if (!picker) return null;
    let handle: FsaDirectoryHandle;
    try {
      handle = await picker.call(window, { id: 'kovaaks-stats', mode: 'read' });
    } catch {
      return null; // cancelled
    }
    let statsFiles = 0;
    for await (const [name] of handle.entries()) {
      if (parseStatsFilename(name)) statsFiles++;
      if (statsFiles >= 50) break;
    }
    await idbSet(KEY, handle);
    return { folderName: handle.name, statsFiles };
  }

  static async unlink(): Promise<void> {
    try {
      await idbDelete(KEY);
    } catch {
      // nothing to do
    }
  }

  /**
   * Runs whose file stamp is at or after `sinceMs`, oldest first. Never throws:
   * an unlinked folder, a denied permission or an unreadable file yields fewer
   * runs, not an error. `requestPermission` is only honoured inside a user
   * gesture (the Sync & Debrief click); elsewhere the browser's answer stands.
   */
  static async readRunsSince(sinceMs: number, opts: { requestPermission?: boolean } = {}): Promise<LocalRunPayload[]> {
    const handle = await LocalStatsService.getHandle();
    if (!handle) return [];

    try {
      let permission = await handle.queryPermission({ mode: 'read' });
      if (permission !== 'granted' && opts.requestPermission !== false) {
        permission = await handle.requestPermission({ mode: 'read' });
      }
      if (permission !== 'granted') {
        console.log('[LocalStats] read permission not granted');
        return [];
      }
    } catch (err) {
      console.log('[LocalStats] permission check failed', err);
      return [];
    }

    const runs: LocalRunPayload[] = [];
    try {
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind !== 'file') continue;
        const parsed = parseStatsFilename(name);
        if (!parsed || parsed.playedAtMs < sinceMs) continue;
        try {
          const file = await (entry as FileSystemFileHandle).getFile();
          const run = localRunFromStats(name, await file.text());
          if (run) runs.push(run);
        } catch (err) {
          console.log('[LocalStats] could not read', name, err);
        }
      }
    } catch (err) {
      console.log('[LocalStats] folder listing failed', err);
    }

    runs.sort((a, b) => a.playedAt.localeCompare(b.playedAt));
    return runs;
  }
}
