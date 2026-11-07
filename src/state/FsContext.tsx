import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  computeStats,
  createSeedTree,
  emptyTree,
  FsError,
  type FsStats,
  type FsTree,
} from '../lib/fs';
import { FS_RECORD_KEY, idbDelete, idbGet, idbSet } from '../lib/idb';
import { useToast } from './ToastContext';
import { useT } from './PreferencesContext';

export type FsStatus = 'loading' | 'ready' | 'error';

interface FsContextValue {
  status: FsStatus;
  tree: FsTree;
  stats: FsStats;
  /** Latest tree, safe to read inside event handlers. */
  getTree: () => FsTree;
  /** Persist and publish a new tree (used after a successful pure operation). */
  commit: (next: FsTree) => void;
  /** Convenience wrapper that surfaces errors via toast and returns success. */
  mutate: (fn: (tree: FsTree) => FsTree) => boolean;
  /** Replace the whole tree (import). */
  replaceTree: (next: FsTree) => Promise<boolean>;
  resetTree: () => Promise<void>;
  reload: () => Promise<void>;
  loadError: string | null;
  lastSavedAt: number | null;
  memoryOnly: boolean;
}

const FsContext = createContext<FsContextValue | null>(null);

export function FsProvider({ children }: { children: ReactNode }): ReactNode {
  const [tree, setTree] = useState<FsTree>(() => createSeedTree());
  const [status, setStatus] = useState<FsStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [memoryOnly, setMemoryOnly] = useState(false);
  const treeRef = useRef(tree);
  const mounted = useRef(true);
  const { push } = useToast();
  const t = useT();

  const publish = useCallback((next: FsTree) => {
    treeRef.current = next;
    if (mounted.current) setTree(next);
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      const stored = await idbGet<FsTree>('fs', FS_RECORD_KEY);
      if (mounted.current) {
        if (stored && typeof stored === 'object' && stored['/']) {
          publish(stored);
        } else {
          const seeded = createSeedTree();
          publish(seeded);
          await idbSet('fs', FS_RECORD_KEY, seeded);
        }
        setStatus('ready');
        setMemoryOnly(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'IndexedDB unavailable';
      if (mounted.current) {
        publish(createSeedTree());
        setStatus('ready');
        setLoadError(message);
        setMemoryOnly(true);
      }
    }
  }, [publish]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const persist = useCallback(async (next: FsTree): Promise<boolean> => {
    try {
      await idbSet('fs', FS_RECORD_KEY, next);
      if (mounted.current) {
        setLastSavedAt(Date.now());
        setMemoryOnly(false);
        setStatus('ready');
      }
      return true;
    } catch {
      if (mounted.current) {
        setMemoryOnly(true);
        push(t('toast.fsError'), 'error');
      }
      return false;
    }
  }, [push, t]);

  const commit = useCallback(
    (next: FsTree) => {
      publish(next);
      void persist(next);
    },
    [persist, publish],
  );

  const mutate = useCallback(
    (fn: (current: FsTree) => FsTree): boolean => {
      try {
        const next = fn(treeRef.current);
        if (next !== treeRef.current) commit(next);
        return true;
      } catch (error) {
        if (error instanceof FsError) {
          push(t('toast.fsError') + ' · ' + error.code, 'error');
        } else {
          push(t('common.error'), 'error');
        }
        return false;
      }
    },
    [commit, push, t],
  );

  const replaceTree = useCallback(
    async (next: FsTree) => {
      publish(next);
      return persist(next);
    },
    [persist, publish],
  );

  const resetTree = useCallback(async () => {
    const seeded = createSeedTree();
    publish(seeded);
    try {
      await idbSet('fs', FS_RECORD_KEY, seeded);
      if (mounted.current) setLastSavedAt(Date.now());
    } catch {
      if (mounted.current) setMemoryOnly(true);
    }
  }, [publish]);

  const reload = useCallback(async () => {
    try {
      await idbDelete('fs', FS_RECORD_KEY);
    } catch {
      /* ignore */
    }
    const seeded = emptyTree();
    publish(seeded);
    await load();
  }, [load, publish]);

  const stats = useMemo(() => computeStats(tree), [tree]);

  const value = useMemo<FsContextValue>(
    () => ({
      status,
      tree,
      stats,
      getTree: () => treeRef.current,
      commit,
      mutate,
      replaceTree,
      resetTree,
      reload,
      loadError,
      lastSavedAt,
      memoryOnly,
    }),
    [status, tree, stats, commit, mutate, replaceTree, resetTree, reload, loadError, lastSavedAt, memoryOnly],
  );

  return <FsContext.Provider value={value}>{children}</FsContext.Provider>;
}

export function useFs(): FsContextValue {
  const ctx = useContext(FsContext);
  if (!ctx) throw new Error('useFs must be used inside FsProvider');
  return ctx;
}
