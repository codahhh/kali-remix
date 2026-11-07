/** POSIX-ish path helpers for the simulated filesystem. Pure, no side effects. */

export const MAX_NAME_LENGTH = 64;

export function normalizePath(input: string, cwd = '/'): string {
  const raw = input.trim();
  if (raw === '') return cwd;
  const expanded = expandHome(raw);
  const base = expanded.startsWith('/') ? '/' : cwd;
  const segments = expanded.split('/');
  const stack: string[] = base === '/' ? [] : base.split('/').filter(Boolean);

  for (const segment of segments) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return '/' + stack.join('/');
}

export function expandHome(path: string, home = '/home/kali'): string {
  if (path === '~') return home;
  if (path.startsWith('~/')) return home + path.slice(1);
  return path;
}

/** Returns null when the name is not a legal single path segment. */
export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'empty';
  if (trimmed === '.' || trimmed === '..') return 'reserved';
  if (trimmed.length > MAX_NAME_LENGTH) return 'too-long';
  if (/[/\\\u0000-\u001f]/.test(trimmed)) return 'invalid-chars';
  return null;
}

export function joinPath(parent: string, name: string): string {
  if (parent === '/') return '/' + name;
  return `${parent}/${name}`;
}

export function parentPath(path: string): string {
  if (path === '/') return '/';
  const idx = path.lastIndexOf('/');
  return idx <= 0 ? '/' : path.slice(0, idx);
}

export function baseName(path: string): string {
  if (path === '/') return '/';
  return path.slice(path.lastIndexOf('/') + 1);
}

export function extensionOf(path: string): string {
  const name = baseName(path);
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : '';
}

/** True when `child` is `parent` itself or lives underneath it. */
export function isSameOrInside(child: string, parent: string): boolean {
  if (parent === '/') return true;
  return child === parent || child.startsWith(parent + '/');
}

/** Compact display form: /home/kali/foo -> ~/foo */
export function tildify(path: string, home = '/home/kali'): string {
  if (path === home) return '~';
  if (path.startsWith(home + '/')) return '~' + path.slice(home.length);
  return path;
}

export function splitSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}
