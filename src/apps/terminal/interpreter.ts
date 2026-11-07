/**
 * KALI WEB OS simulated command interpreter.
 *
 * SECURITY MODEL
 * - There is no shell. Input is tokenized as untrusted text and dispatched
 *   through a fixed allow-list of pure TypeScript functions.
 * - eval / new Function / dynamic import / DOM HTML injection are never used.
 * - No network, filesystem, process or host API is reachable from here.
 * - Anything unknown is rejected with a "command not found" message.
 */
import {
  FsError,
  humanSize,
  listDir,
  mkdir,
  modeToString,
  readFile,
  requireNode,
  touch,
  type FsTree,
} from '../../lib/fs';
import { normalizePath, tildify } from '../../lib/paths';
import type { Lang } from '../../lib/types';
import type { Translator, TranslationKey } from '../../lib/i18n';
import { MAN_PAGES, pick, type ManPage } from './man';

export type LineKind =
  | 'command'
  | 'output'
  | 'error'
  | 'notice'
  | 'success'
  | 'muted'
  | 'accent';

export interface OutLine {
  text: string;
  kind?: LineKind;
}

export interface Outcome {
  lines: OutLine[];
  clear?: boolean;
  cwd?: string;
  prevCwd?: string;
}

export interface TerminalEnv {
  cwd: string;
  prevCwd: string;
  lang: Lang;
  history: string[];
  tree: FsTree;
  t: Translator;
  /** Persist the tree after a successful mutation. */
  saveTree: (tree: FsTree) => void;
}

export const MAX_INPUT_LENGTH = 512;
export const MAX_OUTPUT_LINES = 500;

const KERNEL = {
  sysname: 'Linux',
  hostname: 'kali-sim',
  release: '6.6.9-sim',
  version: '#1 SMP PREEMPT_DYNAMIC KALI-WEB-OS (simulation)',
  machine: 'x86_64',
  os: 'KALI WEB OS (browser simulation)',
} as const;

interface CommandDoc {
  name: string;
  usage: string;
  summary: { en: string; fr: string };
  details?: { en: string; fr: string };
}

export const COMMANDS: CommandDoc[] = [
  {
    name: 'help',
    usage: 'help [command]',
    summary: { en: 'Show this help, or one command’s usage.', fr: 'Affiche cette aide ou l’usage d’une commande.' },
  },
  {
    name: 'clear',
    usage: 'clear',
    summary: { en: 'Clear the terminal screen.', fr: 'Efface l’écran du terminal.' },
  },
  {
    name: 'pwd',
    usage: 'pwd',
    summary: { en: 'Print the current directory.', fr: 'Affiche le dossier courant.' },
  },
  {
    name: 'ls',
    usage: 'ls [-l] [-a] [-h] [path]',
    summary: { en: 'List directory contents.', fr: 'Liste le contenu d’un dossier.' },
  },
  {
    name: 'cd',
    usage: 'cd [path | ~ | .. | -]',
    summary: { en: 'Change the current directory.', fr: 'Change le dossier courant.' },
  },
  {
    name: 'mkdir',
    usage: 'mkdir [-p] <name...>',
    summary: { en: 'Create directories.', fr: 'Crée des dossiers.' },
  },
  {
    name: 'touch',
    usage: 'touch <file...>',
    summary: { en: 'Create empty files.', fr: 'Crée des fichiers vides.' },
  },
  {
    name: 'cat',
    usage: 'cat <file...>',
    summary: { en: 'Print file contents.', fr: 'Affiche le contenu de fichiers.' },
  },
  {
    name: 'echo',
    usage: 'echo [-n] <text...>',
    summary: { en: 'Print text.', fr: 'Affiche du texte.' },
  },
  {
    name: 'whoami',
    usage: 'whoami',
    summary: { en: 'Print the simulated user.', fr: 'Affiche l’utilisateur simulé.' },
  },
  {
    name: 'hostname',
    usage: 'hostname',
    summary: { en: 'Print the simulated host name.', fr: 'Affiche le nom d’hôte simulé.' },
  },
  {
    name: 'uname',
    usage: 'uname [-a] [-s] [-r] [-m] [-n] [-o]',
    summary: { en: 'Simulated kernel information.', fr: 'Informations de noyau simulées.' },
  },
  {
    name: 'date',
    usage: 'date [-u]',
    summary: { en: 'Print the browser clock.', fr: 'Affiche l’horloge du navigateur.' },
  },
  {
    name: 'history',
    usage: 'history',
    summary: { en: 'Show this session’s command history.', fr: 'Affiche l’historique de cette session.' },
  },
  {
    name: 'tree',
    usage: 'tree [path]',
    summary: { en: 'Show the directory tree.', fr: 'Affiche l’arborescence.' },
  },
  {
    name: 'man',
    usage: 'man <command>',
    summary: { en: 'Read a simulated manual page.', fr: 'Lire une page de manuel simulée.' },
  },
];

export const ALLOWED_COMMANDS = COMMANDS.map((command) => command.name);

/* ------------------------------------------------------------------ parsing */

export class ParseError extends Error {}

/** Tokenize with single/double quotes. No expansion, no substitution, no globbing. */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let hasContent = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? '';
    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (char === '\\' && quote === '"' && index + 1 < input.length) {
        index += 1;
        current += input[index] ?? '';
      } else {
        current += char;
      }
      hasContent = true;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      hasContent = true;
      continue;
    }
    if (char === '\\' && index + 1 < input.length) {
      index += 1;
      current += input[index] ?? '';
      hasContent = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (hasContent) {
        tokens.push(current);
        current = '';
        hasContent = false;
      }
      continue;
    }
    current += char;
    hasContent = true;
  }
  if (quote) throw new ParseError('unterminated-quote');
  if (hasContent) tokens.push(current);
  return tokens;
}

interface ParsedArgs {
  flags: Set<string>;
  operands: string[];
  unknownFlags: string[];
}

function parseArgs(args: string[], known: string[]): ParsedArgs {
  const flags = new Set<string>();
  const operands: string[] = [];
  const unknownFlags: string[] = [];
  let literal = false;
  for (const arg of args) {
    if (literal) {
      operands.push(arg);
      continue;
    }
    if (arg === '--') {
      literal = true;
      continue;
    }
    if (arg.startsWith('-') && arg.length > 1 && !/^-\d+$/.test(arg)) {
      let valid = true;
      for (const char of arg.slice(1)) {
        if (known.includes(char)) flags.add(char);
        else valid = false;
      }
      if (!valid) unknownFlags.push(arg);
      continue;
    }
    operands.push(arg);
  }
  return { flags, operands, unknownFlags };
}

/* ----------------------------------------------------------------- helpers */

function absolute(env: TerminalEnv, path: string): string {
  return normalizePath(path, env.cwd);
}

function errorText(t: Translator, error: unknown, path?: string): string {
  const suffix = path ? `: ${tildify(path)}` : '';
  if (error instanceof FsError) {
    const map: Record<string, TranslationKey> = {
      ENOENT: 'terminal.noSuchFile',
      ENOTDIR: 'terminal.notADirectory',
      EISDIR: 'terminal.isADirectory',
      EEXIST: 'terminal.exists',
      ENOTEMPTY: 'terminal.notEmpty',
      EINVAL: 'terminal.invalidName',
      ENOSPC: 'terminal.noSpace',
      ETOOMANY: 'terminal.tooMany',
    };
    const key = map[error.code];
    return key ? `${t(key)}${suffix}` : `${error.code}${suffix}`;
  }
  return `${t('terminal.rejected')}${suffix}`;
}

function lsName(node: { type: 'dir' | 'file'; name: string }): string {
  return node.type === 'dir' ? `${node.name}/` : node.name;
}

function formatListDate(timestamp: number, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(timestamp));
  } catch {
    return '--';
  }
}

function formatLongEntry(
  node: { type: 'dir' | 'file'; mode: number; content: string; updatedAt: number; name: string },
  human: boolean,
  lang: Lang,
): string {
  const perms = (node.type === 'dir' ? 'd' : '-') + modeToString(node.mode);
  const size = node.type === 'dir' ? 4096 : human ? humanSize(byteLength(node.content)) : byteLength(node.content);
  const sizeText = typeof size === 'number' ? String(size).padStart(6, ' ') : size.padStart(6, ' ');
  return `${perms} 1 kali kali ${sizeText} ${formatListDate(node.updatedAt, lang)} ${lsName(node)}`;
}

function byteLength(text: string): number {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length;
  }
}

function formatLinuxDate(date: Date, utc: boolean): string {
  const options: Intl.DateTimeFormatOptions = utc
    ? { timeZone: 'UTC', hourCycle: 'h23' }
    : { hourCycle: 'h23' };
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const parts = new Intl.DateTimeFormat('en-US', {
    ...options,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  const weekday = weekdays[utc ? date.getUTCDay() : date.getDay()] ?? '---';
  const month = months[Number(get('month')) - 1] ?? '---';
  const day = get('day').padStart(2, ' ');
  let zone = 'UTC';
  if (!utc) {
    try {
      const zonePart = new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short',
      })
        .formatToParts(date)
        .find((part) => part.type === 'timeZoneName');
      zone = zonePart?.value ?? 'local';
    } catch {
      zone = 'local';
    }
  }
  return `${weekday} ${month} ${day} ${get('hour')}:${get('minute')}:${get('second')} ${zone} ${get('year')}`;
}

function renderMan(page: ManPage, lang: Lang, t: Translator): OutLine[] {
  const lines: OutLine[] = [];
  const section = (title: string): void => {
    lines.push({ text: '', kind: 'output' });
    lines.push({ text: title, kind: 'accent' });
  };
  lines.push({ text: t('terminal.manTitle'), kind: 'notice' });
  section('NAME');
  lines.push({ text: `   ${page.name} — ${pick(page.summary, lang)}` });
  section('SYNOPSIS');
  lines.push({ text: `   ${page.synopsis}` });
  section('DESCRIPTION');
  for (const paragraph of pick(page.description, lang).split('\n')) {
    lines.push({ text: `   ${paragraph}` });
  }
  if (page.options.length > 0) {
    section('OPTIONS');
    for (const option of page.options) {
      lines.push({ text: `   ${option.flag.padEnd(8)} ${pick(option.text, lang)}` });
    }
  }
  if (page.examples.length > 0) {
    section('EXAMPLES');
    for (const example of page.examples) {
      lines.push({ text: `   ${example.cmd}`, kind: 'accent' });
      lines.push({ text: `       ${pick(example.text, lang)}` });
    }
  }
  if (page.seeAlso && page.seeAlso.length > 0) {
    section('SEE ALSO');
    lines.push({ text: `   ${page.seeAlso.join(', ')}` });
  }
  lines.push({ text: '', kind: 'output' });
  lines.push({ text: `⚠ ${t('terminal.manFooter')}`, kind: 'notice' });
  return lines;
}

/* ----------------------------------------------------------------- commands */

type Handler = (args: string[], env: TerminalEnv) => Outcome;

const handlers: Record<string, Handler> = {
  help(args, env) {
    const { t, lang } = env;
    const target = args.find((arg) => !arg.startsWith('-'));
    if (target) {
      const doc = COMMANDS.find((command) => command.name === target);
      if (!doc) {
        return {
          lines: [
            { text: `${target}: ${t('terminal.notFound')}`, kind: 'error' },
            { text: t('terminal.manHint'), kind: 'muted' },
          ],
        };
      }
      const lines: OutLine[] = [
        { text: doc.name, kind: 'accent' },
        { text: `  usage:     ${doc.usage}` },
        { text: `  ${pick(doc.summary, lang)}` },
        { text: '' },
        { text: `  man ${doc.name}`, kind: 'muted' },
      ];
      return { lines };
    }

    const width = Math.max(...COMMANDS.map((command) => command.name.length)) + 2;
    const lines: OutLine[] = [
      { text: t('terminal.helpTitle'), kind: 'notice' },
      { text: '' },
    ];
    for (const command of COMMANDS) {
      lines.push({
        text: `  ${command.name.padEnd(width)}${pick(command.summary, lang)}`,
      });
    }
    lines.push({ text: '' });
    lines.push({ text: t('terminal.helpFooter'), kind: 'muted' });
    lines.push({ text: t('terminal.hint'), kind: 'muted' });
    return { lines };
  },

  clear() {
    return { lines: [], clear: true };
  },

  pwd(_args, env) {
    return { lines: [{ text: env.cwd }] };
  },

  ls(args, env) {
    const { flags, operands, unknownFlags } = parseArgs(args, ['l', 'a', 'h']);
    const { t } = env;
    if (unknownFlags.length > 0) {
      return {
        lines: [
          { text: `ls: ${t('terminal.usage')}: ${unknownFlags.join(' ')}`, kind: 'error' },
          { text: 'usage: ls [-l] [-a] [-h] [path]', kind: 'muted' },
        ],
      };
    }
    const showAll = flags.has('a');
    const long = flags.has('l');
    const human = flags.has('h');
    const targets = operands.length > 0 ? operands : ['.'];
    const lines: OutLine[] = [];

    for (const target of targets) {
      const path = absolute(env, target);
      try {
        const node = requireNode(env.tree, path);
        if (targets.length > 1) lines.push({ text: `${tildify(path)}:`, kind: 'accent' });
        if (node.type === 'file') {
          lines.push({
            text: long ? formatLongEntry(node, human, env.lang) : node.name,
            kind: 'output',
          });
          continue;
        }
        const children = listDir(env.tree, path);
        const visible = showAll ? children : children.filter((child) => !child.name.startsWith('.'));
        if (visible.length === 0) {
          lines.push({ text: t('files.empty'), kind: 'muted' });
          continue;
        }
        if (long) {
          const total = visible.reduce(
            (sum, child) => sum + (child.type === 'dir' ? 4096 : byteLength(child.content)),
            0,
          );
          lines.push({ text: `total ${Math.ceil(total / 1024)}K`, kind: 'muted' });
          for (const child of visible) {
            lines.push({ text: formatLongEntry(child, human, env.lang) });
          }
        } else {
          const names = visible.map((child) => lsName(child));
          if (showAll) names.unshift('.', '..');
          lines.push({ text: names.join('   ') });
        }
      } catch (error) {
        lines.push({ text: `ls: ${errorText(t, error, path)}`, kind: 'error' });
      }
    }
    return { lines };
  },

  cd(args, env) {
    const { t } = env;
    const target = args.find((arg) => !arg.startsWith('-')) ?? null;
    const wantsPrevious = args.includes('-');
    let destination: string;
    if (wantsPrevious) {
      destination = env.prevCwd;
    } else if (!target || target === '~') {
      destination = '/home/kali';
    } else {
      destination = absolute(env, target);
    }
    try {
      const node = requireNode(env.tree, destination);
      if (node.type !== 'dir') {
        return {
          lines: [{ text: `cd: ${t('terminal.notADirectory')}: ${tildify(destination)}`, kind: 'error' }],
        };
      }
      return {
        lines: [{ text: destination, kind: wantsPrevious ? 'muted' : 'output' }],
        cwd: destination,
        prevCwd: env.cwd,
      };
    } catch (error) {
      return { lines: [{ text: `cd: ${errorText(t, error, destination)}`, kind: 'error' }] };
    }
  },

  mkdir(args, env) {
    const { flags, operands } = parseArgs(args, ['p', 'v']);
    const { t } = env;
    if (operands.length === 0) {
      return {
        lines: [
          { text: `mkdir: ${t('terminal.missingOperand')}`, kind: 'error' },
          { text: 'usage: mkdir [-p] <name...>', kind: 'muted' },
        ],
      };
    }
    let tree = env.tree;
    const lines: OutLine[] = [];
    for (const operand of operands) {
      const path = absolute(env, operand);
      try {
        if (env.tree[path] && flags.has('p')) {
          if (flags.has('v')) lines.push({ text: `mkdir: created directory '${tildify(path)}'` });
          continue;
        }
        tree = mkdir(tree, path, flags.has('p'));
        if (flags.has('v')) {
          lines.push({ text: `mkdir: created directory '${tildify(path)}'`, kind: 'success' });
        }
      } catch (error) {
        lines.push({ text: `mkdir: ${errorText(t, error, path)}`, kind: 'error' });
      }
    }
    if (tree !== env.tree) env.saveTree(tree);
    return { lines };
  },

  touch(args, env) {
    const { operands } = parseArgs(args, []);
    const { t } = env;
    if (operands.length === 0) {
      return {
        lines: [
          { text: `touch: ${t('terminal.missingOperand')}`, kind: 'error' },
          { text: 'usage: touch <file...>', kind: 'muted' },
        ],
      };
    }
    let tree = env.tree;
    const lines: OutLine[] = [];
    for (const operand of operands) {
      const path = absolute(env, operand);
      try {
        tree = touch(tree, path);
      } catch (error) {
        lines.push({ text: `touch: ${errorText(t, error, path)}`, kind: 'error' });
      }
    }
    if (tree !== env.tree) env.saveTree(tree);
    return { lines };
  },

  cat(args, env) {
    const { operands, unknownFlags } = parseArgs(args, []);
    const { t } = env;
    if (unknownFlags.length > 0) {
      return { lines: [{ text: `cat: ${t('terminal.usage')}: ${unknownFlags.join(' ')}`, kind: 'error' }] };
    }
    if (operands.length === 0) {
      return {
        lines: [
          { text: `cat: ${t('terminal.missingOperand')}`, kind: 'error' },
          { text: 'usage: cat <file...>', kind: 'muted' },
        ],
      };
    }
    const lines: OutLine[] = [];
    for (const operand of operands) {
      const path = absolute(env, operand);
      try {
        const content = readFile(env.tree, path);
        const split = content.split('\n');
        const limit = 300;
        for (const line of split.slice(0, limit)) {
          lines.push({ text: line.length > 0 ? line : ' ', kind: 'output' });
        }
        if (split.length > limit) {
          lines.push({
            text: `… ${split.length - limit} more lines truncated. Open the file in the Text Editor to read it all.`,
            kind: 'notice',
          });
        }
      } catch (error) {
        lines.push({ text: `cat: ${errorText(t, error, path)}`, kind: 'error' });
      }
    }
    return { lines };
  },

  echo(args) {
    const { operands } = parseArgs(args, ['n']);
    return { lines: [{ text: operands.join(' ') }] };
  },

  whoami(_args, env) {
    return {
      lines: [
        { text: 'kali', kind: 'success' },
        { text: env.t('terminal.whoamiNote'), kind: 'muted' },
      ],
    };
  },

  hostname(_args, env) {
    return {
      lines: [
        { text: KERNEL.hostname, kind: 'success' },
        { text: env.t('terminal.hostnameNote'), kind: 'muted' },
      ],
    };
  },

  uname(args, env) {
    const { flags, unknownFlags } = parseArgs(args, ['a', 's', 'r', 'm', 'n', 'o']);
    const { t } = env;
    if (unknownFlags.length > 0) {
      return { lines: [{ text: `uname: ${t('terminal.usage')}: ${unknownFlags.join(' ')}`, kind: 'error' }] };
    }
    const all = flags.size === 0 || flags.has('a');
    const parts: string[] = [];
    if (all || flags.has('s')) parts.push(KERNEL.sysname);
    if (all || flags.has('n')) parts.push(KERNEL.hostname);
    if (all || flags.has('r')) parts.push(KERNEL.release);
    if (all) parts.push(KERNEL.version);
    if (all || flags.has('m')) parts.push(KERNEL.machine);
    if (all || flags.has('o')) parts.push(KERNEL.os);
    return {
      lines: [
        { text: parts.join(' '), kind: 'output' },
        { text: `(${t('common.simulated')})`, kind: 'muted' },
      ],
    };
  },

  date(args, env) {
    const utc = args.includes('-u');
    return {
      lines: [
        { text: formatLinuxDate(new Date(), utc), kind: 'output' },
        { text: `(${env.t('terminal.dateNote')})`, kind: 'muted' },
      ],
    };
  },

  history(_args, env) {
    if (env.history.length === 0) {
      return { lines: [{ text: env.t('terminal.historyEmpty'), kind: 'muted' }] };
    }
    return {
      lines: [
        { text: env.t('terminal.historyTitle'), kind: 'notice' },
        ...env.history.map((command, index) => ({
          text: `${String(index + 1).padStart(4, ' ')}  ${command}`,
        })),
      ],
    };
  },

  tree(args, env) {
    const { operands, unknownFlags } = parseArgs(args, ['a']);
    const { t } = env;
    if (unknownFlags.length > 0) {
      return { lines: [{ text: `tree: ${t('terminal.usage')}: ${unknownFlags.join(' ')}`, kind: 'error' }] };
    }
    const root = absolute(env, operands[0] ?? '.');
    const lines: OutLine[] = [];
    try {
      const node = requireNode(env.tree, root);
      if (node.type === 'file') {
        return { lines: [{ text: tildify(root) }] };
      }
      const count = { dirs: 0, files: 0 };
      lines.push({ text: tildify(root) || '/', kind: 'accent' });
      let budget = 400;

      const walk = (path: string, prefix: string): void => {
        if (budget <= 0) return;
        const children = listDir(env.tree, path).filter((child) => !child.name.startsWith('.'));
        children.forEach((child, index) => {
          if (budget <= 0) return;
          budget -= 1;
          const last = index === children.length - 1;
          lines.push({
            text: `${prefix}${last ? '└── ' : '├── '}${lsName(child)}`,
            kind: child.type === 'dir' ? 'accent' : 'output',
          });
          if (child.type === 'dir') {
            count.dirs += 1;
            walk(child.path, prefix + (last ? '    ' : '│   '));
          } else {
            count.files += 1;
          }
        });
      };
      walk(root, '');
      lines.push({ text: '' });
      lines.push({
        text: t('terminal.dirCount', { dirs: count.dirs, files: count.files }),
        kind: 'muted',
      });
    } catch (error) {
      return { lines: [{ text: `tree: ${errorText(t, error, root)}`, kind: 'error' }] };
    }
    return { lines };
  },

  man(args, env) {
    const target = args.find((arg) => !arg.startsWith('-'));
    const { t, lang } = env;
    if (!target) {
      return {
        lines: [
          { text: `man: ${t('terminal.missingOperand')}`, kind: 'error' },
          { text: 'usage: man <command>', kind: 'muted' },
          { text: t('terminal.helpTitle'), kind: 'muted' },
          { text: `  ${ALLOWED_COMMANDS.join('  ')}`, kind: 'muted' },
        ],
      };
    }
    const page = MAN_PAGES[target];
    if (!page) {
      return {
        lines: [
          { text: t('terminal.manMissing', { command: target }), kind: 'error' },
          { text: t('terminal.manHint'), kind: 'muted' },
        ],
      };
    }
    return { lines: renderMan(page, lang, t) };
  },
};

/* ---------------------------------------------------------------- execution */

function sanitize(raw: string): string {
  // Strip ANSI escape sequences and control characters; keep tabs out too.
  return raw
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

export interface ExecutionResult {
  lines: OutLine[];
  clear: boolean;
  cwd: string;
  prevCwd: string;
  /** Echo line to display above the output, when the input was not empty. */
  echoed: string | null;
}

export function execute(rawInput: string, env: TerminalEnv): ExecutionResult {
  const raw = sanitize(rawInput);
  const base: ExecutionResult = {
    lines: [],
    clear: false,
    cwd: env.cwd,
    prevCwd: env.prevCwd,
    echoed: null,
  };
  if (!raw.trim()) return base;

  if (raw.length > MAX_INPUT_LENGTH) {
    return {
      ...base,
      echoed: raw.slice(0, MAX_INPUT_LENGTH),
      lines: [
        {
          text: `⚠ ${env.t('terminal.rejected')}: ${env.t('terminal.tooLong', { count: MAX_INPUT_LENGTH })}`,
          kind: 'error',
        },
      ],
    };
  }

  let tokens: string[];
  try {
    tokens = tokenize(raw);
  } catch {
    return {
      ...base,
      echoed: raw,
      lines: [{ text: `⚠ ${env.t('terminal.rejected')}: syntax error`, kind: 'error' }],
    };
  }

  const [name, ...args] = tokens;
  if (!name) return base;

  if (!Object.hasOwn(handlers, name)) {
    return {
      ...base,
      echoed: raw,
      lines: [
        { text: `${name}: ${env.t('terminal.notFound')}`, kind: 'error' },
        { text: env.t('terminal.notFoundHint'), kind: 'muted' },
        { text: env.t('terminal.disclaimer'), kind: 'muted' },
      ],
    };
  }

  const handler = handlers[name];
  if (!handler) return base;

  try {
    const outcome = handler(args, env);
    return {
      ...base,
      echoed: raw,
      lines: outcome.lines,
      clear: outcome.clear ?? false,
      cwd: outcome.cwd ?? env.cwd,
      prevCwd: outcome.prevCwd ?? env.prevCwd,
    };
  } catch (error) {
    return {
      ...base,
      echoed: raw,
      lines: [
        {
          text: `${name}: ${error instanceof FsError ? errorText(env.t, error, error.path) : env.t('terminal.rejected')}`,
          kind: 'error',
        },
      ],
    };
  }
}

/* ------------------------------------------------------------- completion */

export interface Completion {
  value: string;
  candidates: string[];
}

function longestCommonPrefix(values: string[]): string {
  if (values.length === 0) return '';
  let prefix = values[0] ?? '';
  for (const value of values.slice(1)) {
    let index = 0;
    while (index < prefix.length && index < value.length && prefix[index] === value[index]) index += 1;
    prefix = prefix.slice(0, index);
  }
  return prefix;
}

export function complete(input: string, cwd: string, tree: FsTree): Completion {
  const endsWithSpace = input.endsWith(' ');
  const tokens = input.split(/\s+/).filter(Boolean);
  const current = endsWithSpace ? '' : (tokens[tokens.length - 1] ?? '');

  // Command-name completion.
  if (tokens.length === 0 || (tokens.length === 1 && !endsWithSpace)) {
    const candidates = ALLOWED_COMMANDS.filter((command) => command.startsWith(current));
    if (candidates.length === 0) return { value: input, candidates: [] };
    if (candidates.length === 1) {
      return { value: `${candidates[0]} `, candidates };
    }
    return { value: longestCommonPrefix(candidates), candidates };
  }

  // Path completion for the last token.
  const rawToken = current;
  const expanded = rawToken.startsWith('~') ? '/home/kali' + rawToken.slice(1) : rawToken;
  const slashIndex = expanded.lastIndexOf('/');
  const dirPart = slashIndex >= 0 ? expanded.slice(0, slashIndex + 1) || '/' : '.';
  const basePart = slashIndex >= 0 ? expanded.slice(slashIndex + 1) : expanded;
  const lookup = normalizePath(dirPart, cwd);
  const node = tree[lookup];
  if (!node || node.type !== 'dir') return { value: input, candidates: [] };

  const prefixRaw = slashIndex >= 0 ? rawToken.slice(0, rawToken.lastIndexOf('/') + 1) : '';
  const matches = listDir(tree, lookup)
    .filter((child) => child.name.startsWith(basePart) && !child.name.startsWith('.'))
    .map((child) => ({
      display: child.type === 'dir' ? `${child.name}/` : child.name,
      isDir: child.type === 'dir',
    }));

  if (matches.length === 0) return { value: input, candidates: [] };

  const head = tokens.slice(0, -1).join(' ');
  const unique = matches[0];
  if (matches.length === 1 && unique) {
    const completed = `${prefixRaw}${unique.display}${unique.isDir ? '' : ' '}`;
    return {
      value: head ? `${head} ${completed}` : completed,
      candidates: [unique.display],
    };
  }

  const common = longestCommonPrefix(matches.map((match) => match.display));
  const completed = `${prefixRaw}${common.length > basePart.length ? common : basePart}`;
  return {
    value: head ? `${head} ${completed}` : completed,
    candidates: matches.map((match) => match.display),
  };
}

/** Small helper used by the UI to display a shortened prompt path. */
export function promptPath(cwd: string): string {
  return tildify(cwd);
}

/** Guard used by the UI when restoring a saved working directory. */
export function isDirectory(tree: FsTree, path: string): boolean {
  return tree[path]?.type === 'dir';
}
