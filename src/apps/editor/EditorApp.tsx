import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Download,
  FilePlus2,
  FileWarning,
  FolderOpen,
  Save,
  Search,
  FileX2,
} from 'lucide-react';
import { usePreferences } from '../../state/PreferencesContext';
import { useFs } from '../../state/FsContext';
import { useToast } from '../../state/ToastContext';
import { useWindows } from '../../state/WindowContext';
import { FsError, writeFile } from '../../lib/fs';
import { HOME } from '../../lib/seed';
import { baseName, normalizePath, parentPath, tildify } from '../../lib/paths';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Badge } from '../../components/ui/Controls';
import { Modal } from '../../components/ui/Modal';
import { InputDialog } from '../../components/ui/InputDialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/Feedback';
import type { AppProps } from '../registry';

type Status = 'ready' | 'missing';

export function EditorApp({ windowId, initialProps }: AppProps): ReactNode {
  const { t, lang } = usePreferences();
  const { tree, getTree, commit, status: fsStatus } = useFs();
  const { push } = useToast();
  const { registerCloseGuard, forceCloseWindow, openApp } = useWindows();

  const initialPath =
    typeof initialProps.path === 'string' ? normalizePath(initialProps.path) : null;

  const [path, setPath] = useState<string | null>(initialPath);
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [status, setStatus] = useState<Status>('ready');
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [saveAsError, setSaveAsError] = useState<string | null>(null);
  const [overwritePath, setOverwritePath] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const dirtyRef = useRef(false);
  const loadedFor = useRef<string | null>(null);
  const closeAfterSave = useRef(false);

  const dirty = content !== savedContent;
  dirtyRef.current = dirty;

  const loadFile = useCallback(
    (target: string) => {
      const node = getTree()[target];
      if (!node || node.type !== 'file') {
        setStatus('missing');
        setContent('');
        setSavedContent('');
        return;
      }
      setStatus('ready');
      setContent(node.content);
      setSavedContent(node.content);
      setPath(target);
      setSavedAt(node.updatedAt);
    },
    [getTree],
  );

  // Load the requested file once per path.
  useEffect(() => {
    if (fsStatus !== 'ready') return;
    if (initialPath && loadedFor.current !== initialPath) {
      loadedFor.current = initialPath;
      loadFile(initialPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fsStatus, initialPath]);

  // Keep content in sync when the file is edited elsewhere and this editor is clean.
  useEffect(() => {
    if (!path || dirtyRef.current) return;
    const node = tree[path];
    if (node && node.type === 'file' && node.content !== savedContent) {
      setContent(node.content);
      setSavedContent(node.content);
    }
  }, [path, savedContent, tree]);

  const saveTo = useCallback(
    (target: string): boolean => {
      try {
        commit(writeFile(getTree(), target, content));
        setPath(target);
        setSavedContent(content);
        setSavedAt(Date.now());
        setStatus('ready');
        setSaveAsError(null);
        push(t('editor.savedToast', { path: tildify(target) }), 'success');
        return true;
      } catch (error) {
        const message =
          error instanceof FsError && error.code === 'ENOSPC'
            ? t('editor.tooLarge')
            : t('editor.saveFailed');
        setSaveAsError(message);
        push(message, 'error');
        return false;
      }
    },
    [commit, content, getTree, push, t],
  );

  const requestSave = useCallback((): boolean => {
    if (!path) {
      setShowSaveAs(true);
      return false;
    }
    return saveTo(path);
  }, [path, saveTo]);

  // Guard window close while there are unsaved changes.
  useEffect(() => {
    const unregister = registerCloseGuard(windowId, () => {
      if (!dirtyRef.current) return true;
      setShowUnsaved(true);
      return false;
    });
    return unregister;
  }, [registerCloseGuard, windowId]);

  // Ctrl/Cmd+S anywhere in the editor window.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        requestSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [requestSave]);

  const updateCursor = (): void => {
    const node = textareaRef.current;
    if (!node) return;
    const upToCaret = node.value.slice(0, node.selectionStart);
    const lines = upToCaret.split('\n');
    setCursor({ line: lines.length, col: (lines[lines.length - 1]?.length ?? 0) + 1 });
  };

  const lineCount = useMemo(() => content.split('\n').length, [content]);
  const wordCount = useMemo(
    () => content.trim().split(/\s+/).filter(Boolean).length,
    [content],
  );
  const files = useMemo(
    () =>
      Object.values(tree)
        .filter((node) => node.type === 'file')
        .filter((node) => node.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.path.localeCompare(b.path)),
    [query, tree],
  );

  const download = (): void => {
    const name = path ? baseName(path) : 'untitled.md';
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const submitSaveAs = (value: string): void => {
    const raw = value.trim();
    if (!raw) {
      setSaveAsError(t('files.nameEmpty'));
      return;
    }
    const target = normalizePath(raw, HOME);
    if (target === '/') {
      setSaveAsError(t('files.invalidName'));
      return;
    }
    if (getTree()[target]?.type === 'dir') {
      setSaveAsError(t('terminal.isADirectory'));
      return;
    }
    if (getTree()[target] && target !== path) {
      setOverwritePath(target);
      return;
    }
    const saved = saveTo(target);
    if (saved) {
      setShowSaveAs(false);
      if (closeAfterSave.current) {
        closeAfterSave.current = false;
        forceCloseWindow(windowId);
      }
    }
  };

  const title = path ? baseName(path) : t('editor.untitled');
  const timeFormatter = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-0/30">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-surface-line px-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-mono text-[12px] text-text-hi">{title}</span>
          {dirty ? (
            <Badge tone="warning" className="shrink-0">
              {t('common.unsaved')}
            </Badge>
          ) : savedAt ? (
            <Badge tone="success" className="hidden shrink-0 sm:inline-flex">
              {t('common.saved')}
            </Badge>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label={t('editor.newWindow')}
            size="sm"
            onClick={() => openApp('editor')}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label={t('editor.openFile')} size="sm" onClick={() => setShowOpen(true)}>
            <FolderOpen className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label={t('common.download')} size="sm" onClick={download}>
            <Download className="h-3.5 w-3.5" />
          </IconButton>
          <Button
            size="sm"
            variant="primary"
            icon={<Save />}
            onClick={() => {
              requestSave();
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>

      {path ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-surface-line/60 bg-surface-soft/30 px-2.5 py-1 text-[10px] text-text-low">
          <span className="truncate font-mono">{tildify(path)}</span>
          <span className="ml-auto hidden shrink-0 sm:inline">{t('editor.saveHint')}</span>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        {status === 'missing' ? (
          <div className="p-4">
            <EmptyState
              icon={FileX2}
              title={t('editor.missingTitle')}
              description={t('editor.missingBody', { name: path ? baseName(path) : '' })}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!path) return;
                    commit(writeFile(getTree(), path, ''));
                    setContent('');
                    setSavedContent('');
                    setStatus('ready');
                    push(t('files.created', { name: baseName(path) }), 'success');
                  }}
                >
                  {t('editor.createHere', { name: path ? baseName(path) : '' })}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="flex h-full min-h-0">
            <div
              ref={gutterRef}
              aria-hidden="true"
              className="w-10 shrink-0 select-none overflow-hidden border-r border-surface-line/60 bg-surface-soft/30 py-2 text-right font-mono text-[11px] leading-[1.6] text-text-low/60"
            >
              {Array.from({ length: lineCount }, (_, index) => (
                <div key={index} className="pr-1.5">
                  {index + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                updateCursor();
              }}
              onSelect={updateCursor}
              onClick={updateCursor}
              onKeyUp={updateCursor}
              onScroll={(event) => {
                if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
              }}
              onKeyDown={(event) => {
                if (event.key === 'Tab') {
                  event.preventDefault();
                  const node = event.currentTarget;
                  const start = node.selectionStart;
                  const end = node.selectionEnd;
                  const next = `${content.slice(0, start)}  ${content.slice(end)}`;
                  setContent(next);
                  requestAnimationFrame(() => {
                    node.selectionStart = start + 2;
                    node.selectionEnd = start + 2;
                  });
                }
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                  event.preventDefault();
                  requestSave();
                }
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              aria-label={t('editor.pathLabel')}
              className="min-h-0 flex-1 resize-none overflow-auto bg-transparent px-3 py-2 font-mono text-[12.5px] leading-[1.6] text-text-hi caret-accent outline-none kali-scroll"
            />
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-surface-line px-2.5 py-1 text-[10px] text-text-low">
        <span className="flex items-center gap-3">
          <span className="font-mono tabular-nums">
            {t('editor.lineColumn', { line: cursor.line, col: cursor.col })}
          </span>
          <span className="hidden sm:inline">
            {t('editor.characters', { count: content.length })}
          </span>
          <span className="hidden md:inline">{t('editor.words', { count: wordCount })}</span>
        </span>
        <span className="flex items-center gap-2">
          {savedAt ? (
            <span className="hidden sm:inline">
              {t('editor.savedAt', { time: timeFormatter.format(new Date(savedAt)) })}
            </span>
          ) : null}
          <Badge tone="neutral">{t('editor.autosaveOff')}</Badge>
        </span>
      </div>

      <Modal
        open={showUnsaved}
        onClose={() => setShowUnsaved(false)}
        title={t('windows.unsavedTitle')}
        description={t('windows.unsavedBody', { name: title })}
        closeLabel={t('common.close')}
        icon={<FileWarning className="h-4 w-4" />}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowUnsaved(false)}>
              {t('windows.stayOpen')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowUnsaved(false);
                forceCloseWindow(windowId);
              }}
            >
              {t('windows.discardAndClose')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!path) {
                  closeAfterSave.current = true;
                  setShowUnsaved(false);
                  setShowSaveAs(true);
                  return;
                }
                if (saveTo(path)) {
                  setShowUnsaved(false);
                  forceCloseWindow(windowId);
                }
              }}
            >
              {t('windows.saveAndClose')}
            </Button>
          </>
        }
      >
        <p className="text-xs text-text-mid">{t('editor.saveHint')}</p>
      </Modal>

      <InputDialog
        open={showSaveAs}
        title={t('common.saveAs')}
        label={t('editor.saveAsLabel')}
        initialValue={path ?? `${HOME}/untitled.md`}
        placeholder={`${HOME}/notes.md`}
        hint={t('editor.saveAsHint')}
        error={saveAsError}
        confirmLabel={t('common.save')}
        cancelLabel={t('common.cancel')}
        onConfirm={submitSaveAs}
        onCancel={() => {
          setShowSaveAs(false);
          closeAfterSave.current = false;
        }}
      />

      <ConfirmDialog
        open={overwritePath !== null}
        title={t('editor.overwriteTitle', {
          name: overwritePath ? baseName(overwritePath) : '',
        })}
        body={t('editor.overwriteBody')}
        confirmLabel={t('editor.overwrite')}
        cancelLabel={t('common.cancel')}
        onCancel={() => {
          setOverwritePath(null);
          setShowSaveAs(false);
          closeAfterSave.current = false;
        }}
        onConfirm={() => {
          if (!overwritePath) return;
          const saved = saveTo(overwritePath);
          setOverwritePath(null);
          if (saved) {
            setShowSaveAs(false);
            if (closeAfterSave.current) {
              closeAfterSave.current = false;
              forceCloseWindow(windowId);
            }
          }
        }}
      />

      <Modal
        open={showOpen}
        onClose={() => {
          setShowOpen(false);
          setQuery('');
        }}
        title={t('editor.openTitle')}
        description={t('editor.openHint')}
        closeLabel={t('common.close')}
        size="md"
        icon={<FolderOpen className="h-4 w-4" />}
      >
        <div className="space-y-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-low"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('editor.searchFiles')}
              aria-label={t('editor.searchFiles')}
              className="h-9 w-full rounded-lg border border-surface-line bg-surface-soft pl-8 pr-3 text-[13px] text-text-hi outline-none focus:border-accent/50"
            />
          </div>
          <div className="max-h-72 overflow-y-auto kali-scroll">
            {files.length === 0 ? (
              <EmptyState icon={FileX2} title={t('editor.noFiles')} compact />
            ) : (
              <ul className="space-y-1">
                {files.map((file) => (
                  <li key={file.path}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOpen(false);
                        setQuery('');
                        if (!path && !dirty) {
                          loadFile(file.path);
                        } else {
                          openApp('editor', { props: { path: file.path } });
                        }
                      }}
                      className="flex w-full flex-col rounded-lg border border-surface-line bg-surface-soft/50 px-2.5 py-1.5 text-left transition hover:bg-surface-hover focus-ring"
                    >
                      <span className="truncate text-[12px] text-text-hi">{file.name}</span>
                      <span className="truncate font-mono text-[10px] text-text-low">
                        {tildify(parentPath(file.path))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
