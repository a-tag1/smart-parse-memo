/** IndexedDB を使って FileSystemFileHandle を永続化するユーティリティ */

const DB_NAME    = 'smart-parse-memo-db';
const STORE_NAME = 'file-handles';
const DB_VERSION = 1;

export const HANDLE_KEY_TODAY    = 'today';
export const HANDLE_KEY_ARCHIVE  = 'archive';
export const HANDLE_KEY_MEMO     = 'memo';
export const LS_KEY_TODAY_NAME   = 'spm_today_name';
export const LS_KEY_ARCHIVE_NAME = 'spm_archive_name';
export const LS_KEY_MEMO_NAME    = 'spm_memo_name';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function saveHandle(key: string, handle: FileSystemFileHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(handle, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function loadHandle(key: string): Promise<FileSystemFileHandle | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key) as IDBRequest<FileSystemFileHandle | undefined>;
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = () => reject(req.error);
  });
}

export async function removeHandle(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
