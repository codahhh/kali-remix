/**
 * Tiny promise wrapper around IndexedDB.
 *
 * Only two object stores are used:
 *  - `fs`   : the virtual filesystem tree (single JSON document)
 *  - `meta` : small bookkeeping values
 *
 * The whole filesystem is intentionally small (hard-capped in fs.ts), so
 * storing it as one document keeps writes atomic and the code auditable.
 */

const DB_NAME = 'kali-web-os';
const DB_VERSION = 1;
const STORE_FS = 'fs';
const STORE_META = 'meta';

let dbPromise: Promise<IDBDatabase> | null = null;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

export function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB is not available in this browser'));
      return;
    }
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE_FS)) db.createObjectStore(STORE_FS);
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('Could not open IndexedDB'));
    open.onblocked = () => reject(new Error('IndexedDB open blocked by another tab'));
  });
  return dbPromise;
}

async function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let result: T;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    Promise.resolve(run(tx.objectStore(store)))
      .then((value) => {
        result = value;
      })
      .catch((error: unknown) => {
        try {
          tx.abort();
        } catch {
          /* ignore */
        }
        reject(error);
      });
  });
}

export async function idbGet<T>(store: 'fs' | 'meta', key: string): Promise<T | undefined> {
  return withStore(store, 'readonly', (s) => request(s.get(key)) as Promise<T | undefined>);
}

export async function idbSet(store: 'fs' | 'meta', key: string, value: unknown): Promise<void> {
  await withStore(store, 'readwrite', (s) => request(s.put(value, key)) as Promise<unknown>);
}

export async function idbDelete(store: 'fs' | 'meta', key: string): Promise<void> {
  await withStore(store, 'readwrite', (s) => request(s.delete(key)) as Promise<unknown>);
}

export const FS_RECORD_KEY = 'tree';

export const IdbStore = {
  FS: STORE_FS,
  META: STORE_META,
} as const;
