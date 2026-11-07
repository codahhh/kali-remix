import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Copy, Plus, TerminalSquare, Trash2, X } from 'lucide-react';
import { usePreferences } from '../../state/PreferencesContext';
import { useFs } from '../../state/FsContext';
import { useToast } from '../../state/ToastContext';
import { useWindows } from '../../state/WindowContext';
import { tildify } from '../../lib/paths';
import type { AppProps } from '../registry';
import {
  complete,
  execute,
  isDirectory,
  promptPath,
  type LineKind,
  type OutLine,
} from './interpreter';
import { IconButton } from '../../components/ui/IconButton';
import { Badge } from '../../components/ui/Controls';

interface Line extends OutLine {
  id: number;
  prompt?: string;
}

const KIND_CLASSES: Record<LineKind, string> = {
  command: 'text-text-hi',
  output: 'text-text-mid',
  error: 'text-rose-300',
  notice: 'text-amber-300/90',
  success: 'text-emerald-300',
  muted: 'text-text-low',
  accent: 'text-accented',
};

export function TerminalApp({ initialProps }: AppProps): ReactNode {
  const { prefs, t, lang, setPref, say } = usePreferences();
  const { getTree, commit, status } = useFs();
  const { push } = useToast();
  const { viewport } = useWindows();

  const startingCwd =
    typeof initialProps.cwd === 'string' && isDirectory(getTree(), initialProps.cwd)
      ? initialProps.cwd
      : '/home/kali';

  const [cwd, setCwd] = useState(startingCwd);
  const [prevCwd, setPrevCwd] = useState('/home/kali');
  const [lines, setLines] = useState<Line[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState(
    typeof initialProps.command === 'string' ? initialProps.command : '',
  );
  const counter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const bootstrapped = useRef(false);
  const fontPx = prefs.terminalFontSize;

  const nextId = (): number => {
    counter.current += 1;
    return counter.current;
  };

  const pushLines = useCallback((incoming: OutLine[]) => {
    setLines((previous) => {
      const mapped: Line[] = incoming.map((line) => ({ ...line, id: nextId() }));
      const next = [...previous, ...mapped];
      return next.length > 500 ? next.slice(next.length - 500) : next;
    });
  }, []);

  // Boot banner.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const tree = getTree();
    if (!isDirectory(tree, startingCwd)) setCwd('/home/kali');
    pushLines([
      { text: t('terminal.banner'), kind: 'success' },
      { text: `kali@kali-sim · ${t('terminal.subtitle')} · KALI WEB OS 1.0`, kind: 'muted' },
      { text: '', kind: 'output' },
      { text: `⚠ ${t('terminal.disclaimer')}`, kind: 'notice' },
      { text: t('terminal.typeHelp'), kind: 'muted' },
      { text: '', kind: 'output' },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autofocus on desktop only so mobile does not pop the keyboard uninvited.
  useEffect(() => {
    if (!viewport.isDesktop) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, [viewport.isDesktop]);

  // A new command passed by another app (e.g. Cyber Lab) pre-fills the prompt.
  const lastCommandProp = useRef<string | null>(null);
  useEffect(() => {
    const command = typeof initialProps.command === 'string' ? initialProps.command : null;
    if (!command || command === lastCommandProp.current) return;
    lastCommandProp.current = command;
    setDraft(command);
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [initialProps.command]);

  // Files can ask the singleton terminal to change directory.
  const lastCwdProp = useRef<string | null>(null);
  useEffect(() => {
    const requested = typeof initialProps.cwd === 'string' ? initialProps.cwd : null;
    if (!requested || requested === lastCwdProp.current) return;
    lastCwdProp.current = requested;
    if (isDirectory(getTree(), requested)) {
      setCwd(requested);
      pushLines([
        { text: `cd ${tildify(requested)}`, kind: 'muted' },
      ]);
    }
  }, [getTree, initialProps.cwd, pushLines]);

  // Keep the working directory valid if Files deletes it.
  useEffect(() => {
    if (status !== 'ready') return;
    if (!isDirectory(getTree(), cwd)) {
      setCwd('/home/kali');
      pushLines([{ text: `cd: ${t('terminal.noSuchFile')} — ${tildify(cwd)}`, kind: 'error' }]);
    }
  }, [cwd, getTree, pushLines, status, t]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !stickToBottom.current) return;
    node.scrollTop = node.scrollHeight;
  }, [lines]);

  const runCommand = (raw: string): void => {
    const input = raw.trim();
    if (!input) {
      pushLines([{ text: '', kind: 'output' }]);
      setDraft('');
      return;
    }
    const nextHistory = [...history, input].slice(-200);
    setHistory(nextHistory);
    setHistoryIndex(null);

    const result = execute(input, {
      cwd,
      prevCwd,
      lang,
      history: nextHistory,
      tree: getTree(),
      t,
      saveTree: (tree) => commit(tree),
    });

    if (result.clear) {
      setLines([]);
      setDraft('');
      return;
    }

    const output: Line[] = [];
    if (result.echoed !== null) {
      output.push({ id: nextId(), text: result.echoed, kind: 'command', prompt: promptPath(cwd) });
    }
    for (const line of result.lines) {
      output.push({ ...line, id: nextId() });
    }
    setLines((previous) => {
      const next = [...previous, ...output];
      return next.length > 500 ? next.slice(next.length - 500) : next;
    });
    setCwd(result.cwd);
    setPrevCwd(result.prevCwd);
    setDraft('');
    if (result.lines.some((line) => line.kind === 'error')) say('error');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(draft);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const result = complete(draft, cwd, getTree());
      if (result.candidates.length > 1) {
        pushLines([
          { text: result.value, kind: 'muted' },
          { text: result.candidates.join('   '), kind: 'accent' },
        ]);
      }
      setDraft(result.value);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setDraft(history[nextIndex] ?? '');
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setDraft('');
      } else {
        setHistoryIndex(nextIndex);
        setDraft(history[nextIndex] ?? '');
      }
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      setLines([]);
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      pushLines([
        {
          text: `${draft} ^C`,
          kind: 'muted',
        },
      ]);
      setDraft('');
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'u') {
      event.preventDefault();
      setDraft('');
    }
  };

  const copyOutput = async (): Promise<void> => {
    const text = lines
      .map((line) =>
        line.kind === 'command'
          ? `kali@kali-sim:${line.prompt ?? '~'}$ ${line.text}`
          : line.text,
      )
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      push(t('terminal.copied'), 'success');
    } catch {
      push(t('terminal.copyFailed'), 'error');
    }
  };

  const prompt = useMemo(() => tildify(cwd), [cwd]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-0/40">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-surface-line/70 px-2.5 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <TerminalSquare className="h-3.5 w-3.5 shrink-0 text-accented" aria-hidden="true" />
          <span className="truncate font-mono text-[11px] text-text-mid">
            kali@kali-sim<span className="text-text-low">:</span>
            <span className="text-accented">{prompt}</span>
          </span>
          <Badge tone="sim" className="hidden sm:inline-flex">
            {t('common.simulated')}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label={t('terminal.fontDown')}
            size="sm"
            onClick={() => {
              const index = Math.max(0, [11, 12, 13, 14, 15, 16, 18, 20].indexOf(fontPx) - 1);
              setPref('terminalFontSize', [11, 12, 13, 14, 15, 16, 18, 20][index] ?? 14);
            }}
          >
            <span className="text-[10px] font-bold">A-</span>
          </IconButton>
          <IconButton
            label={t('terminal.fontUp')}
            size="sm"
            onClick={() => {
              const sizes = [11, 12, 13, 14, 15, 16, 18, 20];
              const index = Math.min(sizes.length - 1, sizes.indexOf(fontPx) + 1);
              setPref('terminalFontSize', sizes[index] ?? 20);
            }}
          >
            <span className="text-[11px] font-bold">A+</span>
          </IconButton>
          <IconButton label={t('terminal.copyOutput')} size="sm" onClick={() => void copyOutput()}>
            <Copy className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label={t('terminal.clear')} size="sm" onClick={() => setLines([])}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label={t('terminal.title')}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
        onPointerUp={(event) => {
          const selection =
            typeof window.getSelection === 'function' ? window.getSelection() : null;
          if (selection && selection.toString().length > 0) return;
          if ((event.target as HTMLElement).closest('button')) return;
          inputRef.current?.focus();
        }}
        className="min-h-0 flex-1 cursor-text overflow-y-auto overscroll-contain px-2.5 py-2 font-mono text-text-mid kali-scroll sm:px-3"
        style={{ fontSize: `${fontPx}px`, lineHeight: 1.6 }}
      >
        {lines.length === 0 ? (
          <p className="px-1 py-2 text-text-low">{t('terminal.emptyState')}</p>
        ) : null}
        {lines.map((line) =>
          line.kind === 'command' ? (
            <div key={line.id} className="whitespace-pre-wrap break-words">
              <span className="select-none text-emerald-300">kali@kali-sim</span>
              <span className="select-none text-text-low">:</span>
              <span className="select-none text-sky-300">{line.prompt ?? '~'}</span>
              <span className="select-none text-text-low">$ </span>
              <span className="text-text-hi">{line.text}</span>
            </div>
          ) : (
            <div
              key={line.id}
              className={`whitespace-pre-wrap break-words ${KIND_CLASSES[line.kind ?? 'output']}`}
            >
              {line.text === '' ? '\u00a0' : line.text}
            </div>
          ),
        )}
      </div>

      <div className="shrink-0 border-t border-surface-line/70 bg-ink-1/60 px-2.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 select-none font-mono text-emerald-300" style={{ fontSize: `${fontPx}px` }}>
            kali@kali-sim
          </span>
          <span className="shrink-0 select-none font-mono text-text-low" style={{ fontSize: `${fontPx}px` }}>
            :
          </span>
          <span
            className="hidden shrink-0 select-none font-mono text-sky-300 sm:inline"
            style={{ fontSize: `${fontPx}px` }}
          >
            {prompt}
          </span>
          <span className="shrink-0 select-none font-mono text-text-low" style={{ fontSize: `${fontPx}px` }}>
            $
          </span>
          <div className="relative flex min-w-0 flex-1 items-center">
            <label htmlFor="terminal-input" className="sr-only">
              {t('terminal.inputLabel')}
            </label>
            <input
              id="terminal-input"
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              enterKeyHint="send"
              aria-label={t('terminal.inputLabel')}
              aria-describedby="terminal-hint"
              placeholder=""
              className="min-w-0 flex-1 border-0 bg-transparent font-mono text-text-hi caret-accent outline-none placeholder:text-text-low/60"
              style={{ fontSize: `${fontPx}px` }}
            />
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:hidden">
            <IconButton label={t('common.previous')} size="sm" onClick={() => setDraft(history[history.length - 1] ?? '')}>
              <ArrowUp className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label={t('common.next')} size="sm" onClick={() => setDraft('')}>
              <ArrowDown className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label={t('terminal.clear')} size="sm" onClick={() => setLines([])}>
              <X className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
        <p
          id="terminal-hint"
          className="mt-1 hidden items-center gap-2 truncate text-[10px] text-text-low sm:flex"
        >
          <span className="inline-flex items-center gap-1">
            <Plus className="h-2.5 w-2.5" aria-hidden="true" />
            {t('terminal.autocomplete')} · ↑↓ {t('terminal.historyTitle').toLowerCase()} · Ctrl+L ·{' '}
            {t('terminal.clearHint')}
          </span>
        </p>
      </div>
    </div>
  );
}
