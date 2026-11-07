/**
 * Pure operations on the simulated filesystem tree.
 * Every function either returns a new tree (immutably) or throws FsError.
 * Nothing here touches the browser's real filesystem.
 */

import { HOME, seedEntries } from './seed';
import {
  baseName,
  isSameOrInside,
  joinPath,
  normalizePath,
  parentPath,
  validateName,
} from './paths';

export type FsNodeType = 'dir' | 'file';

export interface FsNode {
  path: string;
  name: string;
  parent: string;
  type: FsNodeType;
  content: string;
  createdAt: number;
  updatedAt: number;
  /** Simulated POSIX mode, e.g. 420 = 0644. Display-only. */
  mode: number;
}

export type FsTree = Record<string, FsNode>;

export type FsErrorCode =
  | 'ENOENT'
  | 'ENOTDIR'
  | 'EISDIR'
  | 'EEXIST'
  | 'ENOTEMPTY'
  | 'EINVAL'
  | 'ENOSPC'
  | 'ETOOMANY';

export class FsError extends Error {
  readonly code: FsErrorCode;
  readonly path: string;

  constructor(code: FsErrorCode, path: string, message?: string) {
    super(message ?? `${code}: ${path}`);
    this.name = 'FsError';
    this.code = code;
    this.path = path;
  }
}

export const LIMITS = {
  maxFileBytes: 96 * 1024,
  maxTotalBytes: 1_500_000,
  maxNodes: 800,
  maxDepth: 24,
} as const;

export const DEFAULT_DIR_MODE = 0o755;
export const DEFAULT_FILE_MODE = 0o644;

const encoder = new TextEncoder();

export function byteLength(text: string): number {
  return encoder.encode(text).length;
}

function makeNode(
  path: string,
  type: FsNodeType,
  content: string,
  now: number,
  mode: number,
): FsNode {
  return {
    path,
    name: baseName(path),
    parent: parentPath(path),
    type,
    content,
    createdAt: now,
    updatedAt: now,
    mode,
  };
}

export function createSeedTree(now = Date.now()): FsTree {
  const tree: FsTree = {};
  // Root and home ancestors first.
  for (const dir of ['/', HOME, '/home']) {
    tree[dir] = makeNode(dir, 'dir', '', now, DEFAULT_DIR_MODE);
  }
  for (const entry of seedEntries) {
    const parent = parentPath(entry.path);
    if (!tree[parent]) {
      tree[parent] = makeNode(parent, 'dir', '', now, DEFAULT_DIR_MODE);
    }
    const isDir = entry.content === undefined;
    tree[entry.path] = makeNode(
      entry.path,
      isDir ? 'dir' : 'file',
      entry.content ?? '',
      now,
      isDir ? DEFAULT_DIR_MODE : DEFAULT_FILE_MODE,
    );
  }
  return tree;
}

export function emptyTree(now = Date.now()): FsTree {
  const tree: FsTree = {};
  for (const dir of ['/', HOME, '/home', '/home/kali/Documents']) {
    tree[dir] = makeNode(dir, 'dir', '', now, DEFAULT_DIR_MODE);
  }
  return tree;
}

export function getNode(tree: FsTree, path: string): FsNode | undefined {
  return tree[path];
}

export function requireNode(tree: FsTree, path: string): FsNode {
  const node = tree[path];
  if (!node) throw new FsError('ENOENT', path);
  return node;
}

export function isDir(tree: FsTree, path: string): boolean {
  return tree[path]?.type === 'dir';
}

export function listDir(tree: FsTree, path: string): FsNode[] {
  const node = requireNode(tree, path);
  if (node.type !== 'dir') throw new FsError('ENOTDIR', path);
  return Object.values(tree)
    .filter((n) => n.parent === path && n.path !== '/')
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
}

function assertCapacity(tree: FsTree, addedBytes: number): void {
  const nodes = Object.keys(tree).length;
  if (nodes >= LIMITS.maxNodes) {
    throw new FsError('ETOOMANY', '/', 'Filesystem node limit reached');
  }
  const total = Object.values(tree).reduce((sum, node) => sum + byteLength(node.content), 0);
  if (total + addedBytes > LIMITS.maxTotalBytes) {
    throw new FsError('ENOSPC', '/', 'Virtual filesystem storage limit reached');
  }
}

function assertDepth(path: string): void {
  const depth = path.split('/').filter(Boolean).length;
  if (depth > LIMITS.maxDepth) {
    throw new FsError('EINVAL', path, 'Maximum directory depth exceeded');
  }
}

export function mkdir(tree: FsTree, rawPath: string, parents = false, now = Date.now()): FsTree {
  const path = normalizePath(rawPath);
  assertDepth(path);
  if (tree[path]) throw new FsError('EEXIST', path);
  if (path === '/') throw new FsError('EEXIST', path);

  const parent = parentPath(path);
  if (!parents) {
    const parentNode = tree[parent];
    if (!parentNode) throw new FsError('ENOENT', parent);
    if (parentNode.type !== 'dir') throw new FsError('ENOTDIR', parent);
  }

  const next = { ...tree };
  const missing: string[] = [];
  let cursor = parent;
  while (cursor !== '/' && !next[cursor]) {
    missing.unshift(cursor);
    cursor = parentPath(cursor);
  }
  for (const dir of missing) {
    if (parents) {
      next[dir] = makeNode(dir, 'dir', '', now, DEFAULT_DIR_MODE);
    } else {
      throw new FsError('ENOENT', dir);
    }
  }
  assertCapacity(next, 0);
  next[path] = makeNode(path, 'dir', '', now, DEFAULT_DIR_MODE);
  return next;
}

export function writeFile(
  tree: FsTree,
  rawPath: string,
  content: string,
  now = Date.now(),
  createParents = false,
): FsTree {
  const path = normalizePath(rawPath);
  assertDepth(path);
  if (path === '/') throw new FsError('EISDIR', path);
  const bytes = byteLength(content);
  if (bytes > LIMITS.maxFileBytes) {
    throw new FsError('ENOSPC', path, 'File exceeds the maximum simulated size');
  }
  const existing = tree[path];
  if (existing?.type === 'dir') throw new FsError('EISDIR', path);

  let next = tree;
  const parent = parentPath(path);
  const parentNode = next[parent];
  if (!parentNode) {
    if (!createParents) throw new FsError('ENOENT', parent);
    next = mkdir(next, parent, true, now);
  } else if (parentNode.type !== 'dir') {
    throw new FsError('ENOTDIR', parent);
  }

  if (!existing) assertCapacity(next, bytes);
  const node = existing
    ? { ...existing, content, updatedAt: now }
    : makeNode(path, 'file', content, now, DEFAULT_FILE_MODE);
  return { ...next, [path]: node };
}

export function touch(tree: FsTree, rawPath: string, now = Date.now()): FsTree {
  const path = normalizePath(rawPath);
  const existing = tree[path];
  if (existing) {
    if (existing.type === 'dir') return { ...tree, [path]: { ...existing, updatedAt: now } };
    return { ...tree, [path]: { ...existing, updatedAt: now } };
  }
  return writeFile(tree, path, '', now);
}

export function readFile(tree: FsTree, rawPath: string): string {
  const path = normalizePath(rawPath);
  const node = requireNode(tree, path);
  if (node.type === 'dir') throw new FsError('EISDIR', path);
  return node.content;
}

function collectSubtree(tree: FsTree, path: string): FsNode[] {
  return Object.values(tree).filter((n) => isSameOrInside(n.path, path));
}

export function remove(tree: FsTree, rawPath: string, recursive = false): FsTree {
  const path = normalizePath(rawPath);
  if (path === '/') throw new FsError('EINVAL', path, 'Cannot remove the root directory');
  const node = requireNode(tree, path);
  const descendants = collectSubtree(tree, path).filter((n) => n.path !== path);

  if (node.type === 'file' && descendants.length > 0) {
    throw new FsError('EISDIR', path);
  }
  if (descendants.length > 0 && !recursive) {
    throw new FsError('ENOTEMPTY', path);
  }
  const next = { ...tree };
  for (const n of descendants) delete next[n.path];
  delete next[path];
  return next;
}

function assertCreatableName(path: string): void {
  const problem = validateName(baseName(path));
  if (problem) throw new FsError('EINVAL', path, `Invalid name (${problem})`);
  if (path === '/' || path === '/home') {
    throw new FsError('EINVAL', path, 'Protected system path');
  }
}

export function rename(tree: FsTree, fromRaw: string, toRaw: string, now = Date.now()): FsTree {
  const from = normalizePath(fromRaw);
  const to = normalizePath(toRaw);
  if (from === to) return tree;
  const node = requireNode(tree, from);
  if (from === '/' || from === '/home' || from === HOME) {
    throw new FsError('EINVAL', from, 'Protected system path');
  }
  assertCreatableName(to);
  if (to === '/' || isSameOrInside(to, from)) {
    throw new FsError('EINVAL', to, 'Cannot move a directory into itself');
  }
  const parentNode = tree[parentPath(to)];
  if (!parentNode) throw new FsError('ENOENT', parentPath(to));
  if (parentNode.type !== 'dir') throw new FsError('ENOTDIR', parentPath(to));
  if (tree[to]) throw new FsError('EEXIST', to);

  const next = { ...tree };
  for (const n of collectSubtree(tree, from)) {
    const newPath = to + n.path.slice(from.length);
    next[newPath] = {
      ...n,
      path: newPath,
      name: baseName(newPath),
      parent: parentPath(newPath),
      updatedAt: now,
    };
    if (newPath !== n.path) delete next[n.path];
  }
  // Preserve the node type/content of the source when the target existed.
  if (node.type === 'dir' && !next[to]) next[to] = makeNode(to, 'dir', '', now, node.mode);
  return next;
}

export function copy(
  tree: FsTree,
  fromRaw: string,
  toRaw: string,
  now = Date.now(),
  overwrite = false,
): FsTree {
  const from = normalizePath(fromRaw);
  let to = normalizePath(toRaw);
  const source = requireNode(tree, from);
  if (to === from) throw new FsError('EINVAL', to, 'Source and destination are the same');
  if (source.type === 'dir' && isSameOrInside(to, from)) {
    throw new FsError('EINVAL', to, 'Cannot copy a directory into itself');
  }

  // Copying into an existing directory means "inside that directory".
  const targetNode = tree[to];
  if (targetNode?.type === 'dir') {
    to = joinPath(to, source.name);
  }
  if (source.type === 'dir' && isSameOrInside(to, from)) {
    throw new FsError('EINVAL', to, 'Cannot copy a directory into itself');
  }
  const parentNode = tree[parentPath(to)];
  if (!parentNode) throw new FsError('ENOENT', parentPath(to));
  if (parentNode.type !== 'dir') throw new FsError('ENOTDIR', parentPath(to));
  if (tree[to] && !overwrite) throw new FsError('EEXIST', to);

  const subtree = collectSubtree(tree, from);
  const addedBytes = subtree.reduce((sum, n) => sum + byteLength(n.content), 0);
  assertCapacity(tree, addedBytes);

  const next = { ...tree };
  for (const n of subtree) {
    const newPath = to + n.path.slice(from.length);
    next[newPath] = {
      ...n,
      path: newPath,
      name: baseName(newPath),
      parent: parentPath(newPath),
      createdAt: now,
      updatedAt: now,
    };
  }
  return next;
}

export function move(tree: FsTree, fromRaw: string, toRaw: string, now = Date.now()): FsTree {
  const from = normalizePath(fromRaw);
  let to = normalizePath(toRaw);
  requireNode(tree, from);
  const targetNode = tree[to];
  if (targetNode?.type === 'dir') to = joinPath(to, baseName(from));
  if (from === to) return tree;
  return rename(tree, from, to, now);
}

export interface FsStats {
  files: number;
  dirs: number;
  bytes: number;
  nodes: number;
}

export function computeStats(tree: FsTree): FsStats {
  let files = 0;
  let dirs = 0;
  let bytes = 0;
  for (const node of Object.values(tree)) {
    if (node.type === 'dir') dirs += 1;
    else files += 1;
    bytes += byteLength(node.content);
  }
  return { files, dirs, bytes, nodes: files + dirs };
}

export function modeToString(mode: number): string {
  const bit = (shift: number): string => ((mode >> shift) & 4 ? 'r' : '-');
  const write = (shift: number): string => ((mode >> shift) & 2 ? 'w' : '-');
  const exec = (shift: number): string => ((mode >> shift) & 1 ? 'x' : '-');
  return (
    bit(6) + write(6) + exec(6) + bit(3) + write(3) + exec(3) + bit(0) + write(0) + exec(0)
  );
}

export function modeToOctal(mode: number): string {
  return mode.toString(8).padStart(3, '0');
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function findNodeByName(tree: FsTree, query: string, limit = 40): FsNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return Object.values(tree)
    .filter((node) => node.path !== '/' && node.name.toLowerCase().includes(q))
    .slice(0, limit);
}

export interface ImportedNode {
  path: string;
  type: FsNodeType;
  content: string;
  updatedAt: number;
}

export interface FilesystemExport {
  app: 'kali-web-os';
  kind: 'virtual-filesystem';
  version: 1;
  exportedAt: string;
  nodes: ImportedNode[];
}

export function serializeTree(tree: FsTree): FilesystemExport {
  return {
    app: 'kali-web-os',
    kind: 'virtual-filesystem',
    version: 1,
    exportedAt: new Date().toISOString(),
    nodes: Object.values(tree)
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((n) => ({ path: n.path, type: n.type, content: n.content, updatedAt: n.updatedAt })),
  };
}

export interface ImportResult {
  tree: FsTree;
  imported: number;
  skipped: number;
}

/**
 * Strict validator for imported JSON. Only shape-valid, bounded data is
 * accepted; unknown fields are ignored and dangerous paths are rejected.
 */
export function parseImportedTree(raw: unknown, now = Date.now()): ImportResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new FsError('EINVAL', '/', 'Import must be a JSON object');
  }
  const data = raw as Partial<FilesystemExport>;
  if (data.kind !== 'virtual-filesystem' || data.app !== 'kali-web-os') {
    throw new FsError('EINVAL', '/', 'Not a KALI WEB OS filesystem export');
  }
  if (!Array.isArray(data.nodes)) throw new FsError('EINVAL', '/', 'Missing nodes array');
  if (data.nodes.length > LIMITS.maxNodes) {
    throw new FsError('ETOOMANY', '/', 'Import contains too many nodes');
  }

  let totalBytes = 0;
  const tree: FsTree = {};
  for (const dir of ['/', '/home', HOME]) {
    tree[dir] = makeNode(dir, 'dir', '', now, DEFAULT_DIR_MODE);
  }
  let imported = 0;
  let skipped = 0;

  for (const entry of data.nodes) {
    if (typeof entry !== 'object' || entry === null) {
      skipped += 1;
      continue;
    }
    const { path, type, content, updatedAt } = entry as Partial<ImportedNode>;
    if (typeof path !== 'string' || !path.startsWith('/')) {
      skipped += 1;
      continue;
    }
    if (type !== 'dir' && type !== 'file') {
      skipped += 1;
      continue;
    }
    const body = typeof content === 'string' ? content : '';
    if (body.length > LIMITS.maxFileBytes) {
      skipped += 1;
      continue;
    }
    const normalized = normalizePath(path);
    if (normalized === '/' || normalized === '/home') {
      // Structural ancestors already exist; ignore them silently.
      if (type === 'dir') continue;
      skipped += 1;
      continue;
    }
    const problem = validateName(baseName(normalized));
    if (problem) {
      skipped += 1;
      continue;
    }
    if (normalized.split('/').filter(Boolean).length > LIMITS.maxDepth) {
      skipped += 1;
      continue;
    }
    totalBytes += byteLength(body);
    if (totalBytes > LIMITS.maxTotalBytes) {
      throw new FsError('ENOSPC', '/', 'Import exceeds the storage limit');
    }
    const nextPath = normalized;
    if (tree[nextPath] && tree[nextPath]?.type === 'dir' && type === 'file') {
      skipped += 1;
      continue;
    }
    if (type === 'file' && tree[nextPath]?.type === 'dir') {
      skipped += 1;
      continue;
    }
    const parent = parentPath(nextPath);
    if (!tree[parent]) {
      // Build missing ancestors as directories.
      const parts = nextPath.split('/').filter(Boolean);
      for (let i = 1; i < parts.length; i += 1) {
        const p = '/' + parts.slice(0, i).join('/');
        if (!tree[p]) tree[p] = makeNode(p, 'dir', '', now, DEFAULT_DIR_MODE);
      }
    }
    const existing = tree[nextPath];
    if (!existing) {
      tree[nextPath] = makeNode(
        nextPath,
        type,
        body,
        now,
        type === 'dir' ? DEFAULT_DIR_MODE : DEFAULT_FILE_MODE,
      );
    } else {
      tree[nextPath] = {
        ...existing,
        content: type === 'dir' ? '' : body,
        updatedAt: typeof updatedAt === 'number' && Number.isFinite(updatedAt) ? updatedAt : now,
      };
    }
    imported += 1;
  }

  // Ensure no orphan nodes.
  for (const node of Object.values({ ...tree })) {
    if (node.type !== 'dir') continue;
    if (!tree[node.parent] && node.path !== '/') {
      delete tree[node.path];
      skipped += 1;
    }
  }

  return { tree, imported, skipped };
}
