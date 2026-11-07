import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCopy,
  Copy,
  FilePlus2,
  FolderPlus,
  FolderSearch,
  HardDrive,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Scissors,
  Search,
  Trash2,
  Upload,
  FolderInput,
  Terminal,
} from 'lucide-react';
import { usePreferences } from '../../state/PreferencesContext';
import { useFs } from '../../state/FsContext';
import { useToast } from '../../state/ToastContext';
import { useWindows } from '../../state/WindowContext';
import {
  FsError,
  copy,
  listDir,
  mkdir,
  move,
  remove,
  rename,
  writeFile,
  type FsNode,
  type FsTree,
} from '../../lib/fs';
import { HOME } from '../../lib/seed';
import {
  baseName,
  extensionOf,
  joinPath,
  normalizePath,
  isSameOrInside,
  parentPath,
  tildify,
  validateName,
} from '../../lib/paths';
import { humanFileSize, iconForFile } from '../../apps/files/fileIcons';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { InputDialog } from '../../components/ui/InputDialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState, Spinner } from '../../components/ui/Feedback';
import { Badge, Segmented } from '../../components/ui/Controls';
import { MoveDialog } from './MoveDialog';
import type { AppProps } from '../registry';
import type { TranslationKey, Translator } from '../../lib/i18n';

type ViewMode = 'grid' | 'list';
type SortMode = 'name' | 'date' | 'size';
type DialogKind = 'new-folder' | 'new-file' | 'rename' | null;

interface ClipboardState {
  mode: 'copy' | 'cut';
  path: string;
}

const PLACES: Array<{ path: string; labelKey: TranslationKey }> = [
  { path: HOME, labelKey: 'common.home' },
  { path: `${HOME}/Documents`, labelKey: 'files.placeDocuments' },
  { path: `${HOME}/Lessons`, labelKey: 'files.placeLessons' },
  { path: `${HOME}/Logs`, labelKey: 'files.placeLogs' },
  { path: `${HOME}/projects`, labelKey: 'files.placeProjects' },
  { path: '/', labelKey: 'files.root' },
];

function describeFsError(error: unknown, t: (key: TranslationKey) => string): string {
  if (error instanceof FsError) {
    const map: Partial<Record<string, TranslationKey>> = {
      ENOENT: 'terminal.noSuchFile',
      ENOTDIR: 'terminal.notADirectory',
      EISDIR: 'terminal.isADirectory',
      EEXIST: 'files.nameTaken',
      ENOTEMPTY: 'terminal.notEmpty',
      EINVAL: 'files.invalidName',
      ENOSPC: 'terminal.noSpace',
      ETOOMANY: 'terminal.tooMany',
    };
    const key = map[error.code];
    return key ? t(key) : error.code;
  }
  return t('common.error');
}

function uniqueName(tree: FsTree, dir: string, name: string, suffix: string): string {
  const ext = extensionOf(name);
  const stem = ext ? name.slice(0, -(ext.length + 1)) : name;
  const candidates = [
    `${stem} ${suffix}${ext ? `.${ext}` : ''}`,
    `${stem} ${suffix} 2${ext ? `.${ext}` : ''}`,
    `${stem} ${suffix} 3${ext ? `.${ext}` : ''}`,
    `${stem} ${suffix} 4${ext ? `.${ext}` : ''}`,
  ];
  for (const candidate of candidates) {
    if (!tree[joinPath(dir, candidate)]) return candidate;
  }
  return `${stem} ${suffix} ${Date.now().toString(36)}${ext ? `.${ext}` : ''}`;
}

export function FilesApp({ initialProps }: AppProps): ReactNode {
  const { t, lang } = usePreferences();
  const { status, tree, commit, getTree, stats: fsStats, memoryOnly } = useFs();
  const { push } = useToast();
  const { openApp } = useWindows();

  const requestedInitial =
    typeof initialProps.path === 'string' ? normalizePath(initialProps.path) : HOME;
  const [path, setPath] = useState(requestedInitial);
  const [navStack, setNavStack] = useState<string[]>([requestedInitial]);
  const [navIndex, setNavIndex] = useState(0);
  const [view, setView] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortMode>('name');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastInitialPath = useRef(requestedInitial);

  const navigate = useCallback(
    (target: string) => {
      const normalized = normalizePath(target);
      if (getTree()[normalized]?.type !== 'dir') return;
      const truncated = navStack.slice(0, navIndex + 1);
      const next = [...truncated, normalized];
      setNavStack(next);
      setNavIndex(next.length - 1);
      setPath(normalized);
      setSelected(null);
      setQuery('');
      setMenuFor(null);
    },
    [getTree, navIndex, navStack],
  );

  // Honour a new path passed to an existing Files window.
  useEffect(() => {
    const requested = typeof initialProps.path === 'string' ? normalizePath(initialProps.path) : null;
    if (!requested || requested === lastInitialPath.current) return;
    lastInitialPath.current = requested;
    if (getTree()[requested]?.type === 'dir') {
      setPath(requested);
      setNavStack((stack) => [...stack.slice(0, navIndex + 1), requested]);
      setNavIndex((index) => index + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProps.path]);

  // If the working directory disappears (deleted elsewhere), fall back home.
  useEffect(() => {
    if (status !== 'ready') return;
    if (tree[path]?.type === 'dir') return;
    const fallback = tree[HOME] ? HOME : '/';
    setPath(fallback);
    setNavStack([fallback]);
    setNavIndex(0);
  }, [path, status, tree]);

  useEffect(() => {
    if (!menuFor) return;
    const close = (): void => setMenuFor(null);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuFor]);

  const entries = useMemo(() => {
    if (tree[path]?.type !== 'dir') return [];
    const list = listDir(tree, path);
    const filtered = query.trim()
      ? list.filter((node) => node.name.toLowerCase().includes(query.trim().toLowerCase()))
      : list;
    return filtered.slice().sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      if (sort === 'date') return b.updatedAt - a.updatedAt;
      if (sort === 'size') {
        const sizeA = a.type === 'dir' ? 0 : a.content.length;
        const sizeB = b.type === 'dir' ? 0 : b.content.length;
        return sizeB - sizeA;
      }
      return a.name.localeCompare(b.name, lang, { numeric: true, sensitivity: 'base' });
    });
  }, [lang, path, query, sort, tree]);

  const selectedNode = selected ? tree[selected] : undefined;

  const closeDialog = (): void => {
    setDialog(null);
    setDialogError(null);
  };

  const handleCreate = (value: string): void => {
    const name = value.trim();
    if (!name) {
      setDialogError(t('files.nameEmpty'));
      return;
    }
    if (validateName(name)) {
      setDialogError(t('files.invalidName'));
      return;
    }
    const destination = joinPath(path, name);
    if (getTree()[destination]) {
      setDialogError(t('files.nameTaken'));
      return;
    }
    try {
      if (dialog === 'new-folder') {
        commit(mkdir(getTree(), destination));
        push(t('files.created', { name }), 'success');
        setView('grid');
      } else {
        commit(writeFile(getTree(), destination, `# ${name}\n\n`, Date.now()));
        push(t('files.created', { name }), 'success');
        openApp('editor', { props: { path: destination } });
      }
      setSelected(destination);
      closeDialog();
    } catch (error) {
      setDialogError(describeFsError(error, t));
    }
  };

  const handleRename = (value: string): void => {
    if (!selected) return;
    const name = value.trim();
    if (!name) {
      setDialogError(t('files.nameEmpty'));
      return;
    }
    if (validateName(name)) {
      setDialogError(t('files.invalidName'));
      return;
    }
    if (name === baseName(selected)) {
      closeDialog();
      return;
    }
    const destination = joinPath(parentPath(selected), name);
    if (getTree()[destination]) {
      setDialogError(t('files.nameTaken'));
      return;
    }
    try {
      commit(rename(getTree(), selected, destination));
      push(t('files.renamed', { name }), 'success');
      setSelected(destination);
      closeDialog();
    } catch (error) {
      setDialogError(describeFsError(error, t));
    }
  };

  const confirmDelete = (): void => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    const name = baseName(target);
    try {
      commit(remove(getTree(), target, true));
      push(t('files.deleted', { name }), 'success');
      if (selected === target) setSelected(null);
      if (clipboard && isSameOrInside(clipboard.path, target)) setClipboard(null);
      setDeleteTarget(null);
    } catch (error) {
      push(describeFsError(error, t), 'error');
    }
  };

  const copyToClipboard = (mode: 'copy' | 'cut', target: string): void => {
    setClipboard({ mode, path: target });
    setMenuFor(null);
    push(mode === 'copy' ? t('files.copied') : t('files.cut'), 'info');
  };

  const paste = (): void => {
    if (!clipboard) return;
    const current = getTree();
    try {
      if (clipboard.mode === 'copy') {
        const source = current[clipboard.path];
        if (!source) throw new FsError('ENOENT', clipboard.path);
        const targetName = uniqueName(current, path, source.name, t('files.copySuffix'));
        commit(copy(current, clipboard.path, joinPath(path, targetName)));
      } else {
        commit(move(current, clipboard.path, path));
        setClipboard(null);
      }
      push(t('files.pasted', { path: tildify(path) }), 'success');
      setMenuFor(null);
    } catch (error) {
      push(describeFsError(error, t), 'error');
    }
  };

  const handleMove = (destinationDir: string): void => {
    if (!moveTarget) return;
    try {
      commit(move(getTree(), moveTarget, destinationDir));
      const newPath = joinPath(destinationDir, baseName(moveTarget));
      setSelected(newPath);
      setMoveTarget(null);
      push(t('files.pasted', { path: tildify(destinationDir) }), 'success');
    } catch (error) {
      push(describeFsError(error, t), 'error');
    }
  };

  const openEntry = (node: FsNode): void => {
    if (node.type === 'dir') {
      navigate(node.path);
    } else {
      openApp('editor', { props: { path: node.path } });
    }
  };

  const handleActivate = (node: FsNode): void => {
    if (selected === node.path) openEntry(node);
    else setSelected(node.path);
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportError(null);
    const allowedExt = ['txt', 'md', 'log', 'json', 'text', 'conf', 'sh'];
    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() ?? '' : '';
    if (!allowedExt.includes(ext) && file.type && !file.type.startsWith('text/')) {
      setImportError(t('files.importBadType'));
      push(t('files.importBadType'), 'error');
      return;
    }
    if (file.size > 96 * 1024) {
      setImportError(t('files.importTooLarge'));
      push(t('files.importTooLarge'), 'error');
      return;
    }
    try {
      const text = await file.text();
      const current = getTree();
      const safeName = file.name.replace(/[/\\\u0000-\u001f]/g, '-').slice(0, 64) || 'import.txt';
      let targetName = safeName;
      let counter = 1;
      while (current[joinPath(path, targetName)]) {
        counter += 1;
        const dot = safeName.lastIndexOf('.');
        targetName =
          dot > 0
            ? `${safeName.slice(0, dot)} (${counter})${safeName.slice(dot)}`
            : `${safeName} (${counter})`;
      }
      const destination = joinPath(path, targetName);
      commit(writeFile(current, destination, text));
      push(t('files.imported', { name: targetName, path: tildify(path) }), 'success');
      setSelected(destination);
    } catch (error) {
      const message = describeFsError(error, t);
      setImportError(message);
      push(message, 'error');
    }
  };

  const totalBytes = fsStats.bytes;
  const canPaste = clipboard !== null;
  const itemCount = entries.length;

  if (status === 'loading') {
    return <Spinner label={t('files.loading')} />;
  }

  return (
    <div className="flex h-full min-h-0 bg-ink-1/20">
      <aside className="hidden w-44 shrink-0 flex-col border-r border-surface-line bg-surface-soft/30 md:flex lg:w-52">
        <div className="flex-1 overflow-y-auto p-2 kali-scroll">
          <p className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-low">
            {t('files.title')}
          </p>
          <nav className="space-y-0.5" aria-label={t('files.path')}>
            {PLACES.map((place) => {
              const active = path === place.path;
              return (
                <button
                  key={place.path}
                  type="button"
                  onClick={() => navigate(place.path)}
                  className={[
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors focus-ring',
                    active
                      ? 'bg-accent/15 text-accented'
                      : 'text-text-mid hover:bg-surface-hover hover:text-text-hi',
                  ].join(' ')}
                >
                  <FolderSearch className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t(place.labelKey)}</span>
                </button>
              );
            })}
          </nav>
        </div>
        <div className="space-y-1.5 border-t border-surface-line p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-low">
            <HardDrive className="h-3 w-3" aria-hidden="true" />
            {t('files.info')}
          </div>
          <p className="text-[10px] leading-relaxed text-text-low">{t('files.infoHint')}</p>
          <div className="flex items-center justify-between text-[10px] text-text-mid">
            <span>{humanFileSize(totalBytes)}</span>
            <span>
              {fsStats.files} {t('common.file').toLowerCase()} · {fsStats.dirs}{' '}
              {t('common.folder').toLowerCase()}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-0.5 border-b border-surface-line px-1.5 py-1">
          <IconButton
            label={t('common.back')}
            size="sm"
            disabled={navIndex <= 0}
            onClick={() => {
              const index = Math.max(0, navIndex - 1);
              setNavIndex(index);
              setPath(navStack[index] ?? HOME);
              setSelected(null);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={t('common.next')}
            size="sm"
            disabled={navIndex >= navStack.length - 1}
            onClick={() => {
              const index = Math.min(navStack.length - 1, navIndex + 1);
              setNavIndex(index);
              setPath(navStack[index] ?? HOME);
              setSelected(null);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={t('common.up')}
            size="sm"
            disabled={path === '/'}
            onClick={() => navigate(parentPath(path))}
          >
            <ChevronUp className="h-4 w-4" />
          </IconButton>

          <nav
            aria-label={t('files.breadcrumb')}
            className="mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-lg bg-surface-soft/50 px-2 py-1 kali-scroll"
          >
            <button
              type="button"
              onClick={() => navigate('/')}
              className="shrink-0 rounded px-1 py-0.5 text-[11px] text-text-mid transition hover:text-accented focus-ring"
            >
              {t('files.root')}
            </button>
            {path
              .split('/')
              .filter(Boolean)
              .map((segment, index, all) => {
                const target = '/' + all.slice(0, index + 1).join('/');
                const isLast = index === all.length - 1;
                return (
                  <span key={target} className="flex shrink-0 items-center gap-0.5">
                    <span className="text-text-low/60" aria-hidden="true">
                      /
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(target)}
                      aria-current={isLast ? 'page' : undefined}
                      className={[
                        'max-w-[140px] truncate rounded px-1 py-0.5 text-[11px] transition focus-ring',
                        isLast
                          ? 'font-medium text-text-hi'
                          : 'text-text-mid hover:text-accented',
                      ].join(' ')}
                    >
                      {segment}
                    </button>
                  </span>
                );
              })}
          </nav>

          <Segmented
            size="sm"
            ariaLabel={t('files.viewGrid')}
            value={view}
            onChange={(value) => setView(value)}
            options={[
              { value: 'grid', label: '', ariaLabel: t('files.viewGrid'), icon: <LayoutGrid /> },
              { value: 'list', label: '', ariaLabel: t('files.viewList'), icon: <List /> },
            ]}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-surface-line px-2 py-1.5">
          <div className="relative min-w-[120px] flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-low"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('files.searchFiles')}
              aria-label={t('files.searchFiles')}
              className="h-8 w-full rounded-lg border border-surface-line bg-surface-soft/60 pl-7 pr-2 text-[12px] text-text-hi outline-none transition placeholder:text-text-low focus:border-accent/50"
            />
          </div>

          <label className="relative inline-flex h-8 items-center rounded-lg border border-surface-line bg-surface-soft/60 pl-6 pr-1.5 text-[11px] text-text-mid">
            <ArrowDownUp
              className="pointer-events-none absolute left-1.5 h-3.5 w-3.5 text-text-low"
              aria-hidden="true"
            />
            <span className="sr-only">{t('files.sort')}</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              aria-label={t('files.sort')}
              className="bg-transparent pr-1 text-[11px] text-text-mid outline-none"
            >
              <option value="name">{t('files.sortName')}</option>
              <option value="date">{t('files.sortDate')}</option>
              <option value="size">{t('files.sortSize')}</option>
            </select>
          </label>

          <Button
            size="sm"
            variant="secondary"
            icon={<FolderPlus />}
            onClick={() => {
              setMenuFor(null);
              setDialog('new-folder');
            }}
            aria-label={t('files.newFolder')}
          >
            <span className="hidden sm:inline">{t('files.newFolder')}</span>
          </Button>
          <Button
            size="sm"
            variant="secondary"
            icon={<FilePlus2 />}
            onClick={() => {
              setMenuFor(null);
              setDialog('new-file');
            }}
            aria-label={t('files.newFile')}
          >
            <span className="hidden sm:inline">{t('files.newFile')}</span>
          </Button>
          <IconButton label={t('files.upload')} size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={t('common.paste')}
            size="sm"
            disabled={!canPaste}
            onClick={() => paste()}
          >
            <ClipboardCopy className="h-4 w-4" />
          </IconButton>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.log,.json,.conf,.sh,text/plain"
            className="hidden"
            onChange={(event) => void handleImport(event)}
          />
        </div>

        {memoryOnly ? (
          <div className="border-b border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] text-amber-200">
            {t('toast.fsError')}
          </div>
        ) : null}
        {importError ? (
          <div className="border-b border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-200" role="alert">
            {importError}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-2 kali-scroll sm:p-3">
          {entries.length === 0 ? (
            <EmptyState
              icon={query ? Search : FolderSearch}
              title={query ? t('files.noSearchResults', { query }) : t('files.empty')}
              description={query ? undefined : t('files.emptyHint')}
              action={
                query ? (
                  <Button variant="ghost" size="sm" onClick={() => setQuery('')}>
                    {t('common.reset')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<FolderPlus />}
                    onClick={() => setDialog('new-folder')}
                  >
                    {t('files.newFolder')}
                  </Button>
                )
              }
            />
          ) : view === 'grid' ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1.5 sm:grid-cols-[repeat(auto-fill,minmax(108px,1fr))]">
              {entries.map((node) => {
                const { Icon, className } = iconForFile(node.path, node.type === 'dir');
                const active = selected === node.path;
                return (
                  <li key={node.path} className="group/li relative">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={node.name}
                      onClick={() => handleActivate(node)}
                      onDoubleClick={() => openEntry(node)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          openEntry(node);
                        } else if (event.key === ' ') {
                          event.preventDefault();
                          setSelected(node.path);
                        } else if (event.key === 'Delete') {
                          event.preventDefault();
                          setDeleteTarget(node.path);
                        } else if (event.key === 'F2') {
                          event.preventDefault();
                          setSelected(node.path);
                          setDialog('rename');
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setSelected(node.path);
                        setMenuFor(node.path);
                      }}
                      className={[
                        'group flex cursor-default flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-colors focus-ring',
                        active
                          ? 'border-accent/45 bg-accent/12'
                          : 'border-transparent hover:border-surface-line hover:bg-surface-soft',
                      ].join(' ')}
                    >
                      <span className="grid h-10 w-10 place-items-center">
                        <Icon className={`h-8 w-8 ${className}`} strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span className="line-clamp-2 w-full break-words text-[11px] leading-tight text-text-hi">
                        {node.name}
                      </span>
                      <span className="text-[10px] text-text-low">
                        {node.type === 'dir' ? t('common.folder') : humanFileSize(node.content.length)}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={t('files.folderActions', { name: node.name })}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelected(node.path);
                        setMenuFor(menuFor === node.path ? null : node.path);
                      }}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-surface-win/80 text-text-low transition hover:text-text-hi focus:opacity-100 sm:opacity-0 sm:group-hover/li:opacity-100 sm:focus:opacity-100"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                    {menuFor === node.path ? (
                      <ActionMenu
                        node={node}
                        t={t}
                        onClose={() => setMenuFor(null)}
                        onOpen={() => openEntry(node)}
                        onRename={() => {
                          setMenuFor(null);
                          setDialog('rename');
                        }}
                        onCopy={() => copyToClipboard('copy', node.path)}
                        onCut={() => copyToClipboard('cut', node.path)}
                        onMove={() => {
                          setMenuFor(null);
                          setMoveTarget(node.path);
                        }}
                        onDelete={() => {
                          setMenuFor(null);
                          setDeleteTarget(node.path);
                        }}
                        onTerminal={() => {
                          setMenuFor(null);
                          openApp('terminal', { props: { cwd: node.type === 'dir' ? node.path : path } });
                        }}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="overflow-hidden rounded-xl border border-surface-line">
              <div className="grid grid-cols-[1fr_82px] gap-2 border-b border-surface-line bg-surface-soft/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-low sm:grid-cols-[1fr_92px_130px]">
                <span>{t('common.name')}</span>
                <span className="text-right">{t('common.size')}</span>
                <span className="hidden text-right sm:block">{t('common.modified')}</span>
              </div>
              <ul>
                {entries.map((node) => {
                  const { Icon, className } = iconForFile(node.path, node.type === 'dir');
                  const active = selected === node.path;
                  return (
                    <li key={node.path} className="relative border-b border-surface-line/60 last:border-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleActivate(node)}
                        onDoubleClick={() => openEntry(node)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setSelected(node.path);
                          setMenuFor(node.path);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            openEntry(node);
                          } else if (event.key === 'Delete') {
                            event.preventDefault();
                            setDeleteTarget(node.path);
                          } else if (event.key === 'F2') {
                            event.preventDefault();
                            setSelected(node.path);
                            setDialog('rename');
                          }
                        }}
                        className={[
                          'grid cursor-default grid-cols-[1fr_82px] items-center gap-2 py-1.5 pl-3 pr-9 text-[12px] transition-colors focus-ring sm:grid-cols-[1fr_92px_130px]',
                          active ? 'bg-accent/12' : 'hover:bg-surface-soft',
                        ].join(' ')}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon className={`h-4 w-4 shrink-0 ${className}`} strokeWidth={1.6} aria-hidden="true" />
                          <span className="truncate text-text-hi">{node.name}</span>
                          {clipboard?.path === node.path ? (
                            <Badge tone={clipboard.mode === 'copy' ? 'accent' : 'warning'}>
                              {clipboard.mode === 'copy' ? t('common.copy') : t('common.cut')}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-right text-[11px] tabular-nums text-text-low">
                          {node.type === 'dir' ? `${t('common.folder')}` : humanFileSize(node.content.length)}
                        </span>
                        <span className="hidden text-right text-[11px] text-text-low sm:block">
                          {new Intl.DateTimeFormat(lang, {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(node.updatedAt))}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={t('files.folderActions', { name: node.name })}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelected(node.path);
                          setMenuFor(menuFor === node.path ? null : node.path);
                        }}
                        className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-text-low transition hover:bg-surface-hover hover:text-text-hi focus-ring"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                      {menuFor === node.path ? (
                        <ActionMenu
                          node={node}
                          t={t}
                          onClose={() => setMenuFor(null)}
                          onOpen={() => openEntry(node)}
                          onRename={() => {
                            setMenuFor(null);
                            setDialog('rename');
                          }}
                          onCopy={() => copyToClipboard('copy', node.path)}
                          onCut={() => copyToClipboard('cut', node.path)}
                          onMove={() => {
                            setMenuFor(null);
                            setMoveTarget(node.path);
                          }}
                          onDelete={() => {
                            setMenuFor(null);
                            setDeleteTarget(node.path);
                          }}
                          onTerminal={() => {
                            setMenuFor(null);
                            openApp('terminal', { props: { cwd: node.type === 'dir' ? node.path : path } });
                          }}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-surface-line px-3 py-1 text-[10px] text-text-low">
          <span className="truncate">
            {t('common.items', { count: itemCount })}
            {selectedNode ? ` · ${selectedNode.name}` : ''}
          </span>
          <span className="flex items-center gap-2">
            {clipboard ? (
              <span className="hidden items-center gap-1 sm:flex">
                <Scissors className="h-3 w-3" aria-hidden="true" />
                {baseName(clipboard.path)}
              </span>
            ) : null}
            <span className="font-mono">{humanFileSize(totalBytes)}</span>
          </span>
        </div>
      </div>

      <InputDialog
        open={dialog === 'new-folder' || dialog === 'new-file'}
        title={dialog === 'new-folder' ? t('files.newFolderTitle') : t('files.newFileTitle')}
        label={t('common.name')}
        initialValue={dialog === 'new-folder' ? 'new-folder' : 'untitled.md'}
        confirmLabel={t('common.create')}
        cancelLabel={t('common.cancel')}
        error={dialogError}
        hint={t('files.location', { path: tildify(path) })}
        onConfirm={handleCreate}
        onCancel={closeDialog}
      />

      <InputDialog
        open={dialog === 'rename'}
        title={t('files.renameTitle', { name: selected ? baseName(selected) : '' })}
        label={t('common.name')}
        initialValue={selected ? baseName(selected) : ''}
        confirmLabel={t('common.rename')}
        cancelLabel={t('common.cancel')}
        error={dialogError}
        onConfirm={handleRename}
        onCancel={closeDialog}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('files.deleteTitle', { name: deleteTarget ? baseName(deleteTarget) : '' })}
        body={
          deleteTarget && tree[deleteTarget]?.type === 'dir'
            ? t('files.deleteFolderBody', { name: baseName(deleteTarget) })
            : t('files.deleteFileBody', { name: deleteTarget ? baseName(deleteTarget) : '' })
        }
        confirmLabel={t('files.deleteCta')}
        cancelLabel={t('common.cancel')}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      <MoveDialog
        open={moveTarget !== null}
        tree={tree}
        sourcePath={moveTarget ?? ''}
        startDir={path}
        t={t}
        onCancel={() => setMoveTarget(null)}
        onConfirm={handleMove}
      />

      {selectedNode ? (
        <div className="sr-only" aria-live="polite">
          {t('files.selected', { count: 1 })}: {selectedNode.name}
        </div>
      ) : null}
    </div>
  );
}

interface ActionMenuProps {
  node: FsNode;
  t: Translator;
  onClose: () => void;
  onOpen: () => void;
  onRename: () => void;
  onCopy: () => void;
  onCut: () => void;
  onMove: () => void;
  onDelete: () => void;
  onTerminal: () => void;
}

function ActionMenu({
  node,
  t,
  onClose,
  onOpen,
  onRename,
  onCopy,
  onCut,
  onMove,
  onDelete,
  onTerminal,
}: ActionMenuProps): ReactNode {
  const items: Array<{ label: string; icon: ReactNode; action: () => void; danger?: boolean }> = [
    {
      label: node.type === 'dir' ? t('files.openFolder') : t('files.openInEditor'),
      icon: <FolderSearch />,
      action: onOpen,
    },
    { label: t('common.copy'), icon: <Copy />, action: onCopy },
    { label: t('common.cut'), icon: <Scissors />, action: onCut },
    { label: t('common.rename'), icon: <Pencil />, action: onRename },
    { label: t('common.move'), icon: <FolderInput />, action: onMove },
    { label: t('files.focusHere'), icon: <Terminal />, action: onTerminal },
    { label: t('common.delete'), icon: <Trash2 />, action: onDelete, danger: true },
  ];

  return (
    <div
      role="menu"
      aria-label={t('files.folderActions', { name: node.name })}
      onPointerDown={(event) => event.stopPropagation()}
      className="win-surface absolute right-1 top-8 z-40 w-48 overflow-hidden rounded-lg border border-surface-line py-1 animate-pop-in"
    >
      <p className="truncate px-3 py-1 text-[10px] uppercase tracking-wider text-text-low">
        {node.name}
      </p>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => {
            item.action();
            onClose();
          }}
          className={[
            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors focus-ring',
            item.danger
              ? 'text-rose-300 hover:bg-rose-500/15'
              : 'text-text-mid hover:bg-surface-hover hover:text-text-hi',
          ].join(' ')}
        >
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{item.icon}</span>
          <span className="truncate">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
