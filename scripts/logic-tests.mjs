/**
 * Pure logic tests for the simulated filesystem and terminal interpreter.
 * Run with: node scripts/run-logic-tests.mjs
 */
import assert from 'node:assert/strict';
import {
  createSeedTree,
  mkdir,
  listDir,
  writeFile,
  readFile,
  remove,
  rename,
  copy,
  move,
  computeStats,
  parseImportedTree,
  serializeTree,
  FsError,
} from '../src/lib/fs';
import { normalizePath, tildify, validateName } from '../src/lib/paths';
import { translate } from '../src/lib/i18n';
import { execute, tokenize, complete, ALLOWED_COMMANDS, MAX_INPUT_LENGTH } from '../src/apps/terminal/interpreter';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(error instanceof Error ? error.stack : error);
  }
}

const t = (key, vars) => translate('en', key, vars);

console.log('\n# paths');
test('normalizes relative and .. paths', () => {
  assert.equal(normalizePath('Documents/notes.md', '/home/kali'), '/home/kali/Documents/notes.md');
  assert.equal(normalizePath('../../..', '/home/kali'), '/');
  assert.equal(normalizePath('~/Logs', '/'), '/home/kali/Logs');
  assert.equal(normalizePath('/etc/../etc/hosts', '/'), '/etc/hosts');
});
test('tildify compacts home', () => {
  assert.equal(tildify('/home/kali/Lessons'), '~/Lessons');
  assert.equal(tildify('/home/kali'), '~');
  assert.equal(tildify('/etc/hosts'), '/etc/hosts');
});
test('validates names', () => {
  assert.equal(validateName('ok name.md'), null);
  assert.equal(validateName(''), 'empty');
  assert.equal(validateName('..'), 'reserved');
  assert.equal(validateName('a/b'), 'invalid-chars');
  assert.equal(validateName('x'.repeat(80)), 'too-long');
});

console.log('\n# filesystem');
test('seeded tree contains expected nodes', () => {
  const tree = createSeedTree();
  assert.ok(tree['/home/kali/Documents/welcome.md']);
  assert.ok(tree['/etc/hosts']);
  const names = listDir(tree, '/home/kali').map((n) => n.name);
  assert.ok(names.includes('Documents'));
  assert.ok(names.includes('Lessons'));
});
test('mkdir + write + read', () => {
  let tree = createSeedTree();
  tree = mkdir(tree, '/home/kali/newdir');
  tree = writeFile(tree, '/home/kali/newdir/file.txt', 'hello');
  assert.equal(readFile(tree, '/home/kali/newdir/file.txt'), 'hello');
  assert.equal(listDir(tree, '/home/kali/newdir').length, 1);
});
test('mkdir -p creates parents', () => {
  let tree = createSeedTree();
  tree = mkdir(tree, '/home/kali/a/b/c', true);
  assert.ok(tree['/home/kali/a/b/c']);
});
test('mkdir without -p fails on missing parent', () => {
  const tree = createSeedTree();
  assert.throws(() => mkdir(tree, '/home/kali/nope/deep'), (e) => e instanceof FsError && e.code === 'ENOENT');
});
test('duplicate mkdir errors EEXIST', () => {
  const tree = createSeedTree();
  assert.throws(() => mkdir(tree, '/home/kali/Documents'), (e) => e.code === 'EEXIST');
});
test('rename moves a directory subtree', () => {
  let tree = createSeedTree();
  tree = rename(tree, '/home/kali/Documents', '/home/kali/Docs');
  assert.ok(tree['/home/kali/Docs/welcome.md']);
  assert.equal(tree['/home/kali/Documents'], undefined);
  assert.equal(tree['/home/kali/Docs/welcome.md'].parent, '/home/kali/Docs');
});
test('cannot move a directory into itself', () => {
  const tree = createSeedTree();
  assert.throws(() => rename(tree, '/home/kali/Documents', '/home/kali/Documents/inner'), (e) => e.code === 'EINVAL');
});
test('copy duplicates files without touching the source', () => {
  let tree = createSeedTree();
  tree = copy(tree, '/home/kali/Documents/welcome.md', '/home/kali/welcome-copy.md');
  assert.equal(tree['/home/kali/welcome-copy.md'].content, tree['/home/kali/Documents/welcome.md'].content);
  assert.ok(tree['/home/kali/Documents/welcome.md']);
});
test('copy into a directory keeps the original name', () => {
  let tree = createSeedTree();
  tree = copy(tree, '/home/kali/Documents/welcome.md', '/home/kali/Downloads');
  assert.ok(tree['/home/kali/Downloads/welcome.md']);
});
test('move relocates a file', () => {
  let tree = createSeedTree();
  tree = move(tree, '/home/kali/Documents/welcome.md', '/home/kali/Downloads');
  assert.ok(tree['/home/kali/Downloads/welcome.md']);
  assert.equal(tree['/home/kali/Documents/welcome.md'], undefined);
});
test('remove requires recursive for non-empty directories', () => {
  const tree = createSeedTree();
  assert.throws(() => remove(tree, '/home/kali/Documents'), (e) => e.code === 'ENOTEMPTY');
  const next = remove(tree, '/home/kali/Documents', true);
  assert.equal(next['/home/kali/Documents/welcome.md'], undefined);
});
test('cannot remove root', () => {
  const tree = createSeedTree();
  assert.throws(() => remove(tree, '/', true), (e) => e.code === 'EINVAL');
});
test('writing a directory path fails', () => {
  const tree = createSeedTree();
  assert.throws(() => writeFile(tree, '/home/kali/Documents', 'x'), (e) => e.code === 'EISDIR');
});
test('file size limit is enforced', () => {
  const tree = createSeedTree();
  assert.throws(() => writeFile(tree, '/home/kali/big.txt', 'x'.repeat(100 * 1024)), (e) => e.code === 'ENOSPC');
});
test('stats count seed nodes', () => {
  const stats = computeStats(createSeedTree());
  assert.ok(stats.files > 10);
  assert.ok(stats.dirs > 5);
  assert.ok(stats.bytes > 0);
});

console.log('\n# export / import validation');
test('round-trips through export/import', () => {
  const tree = createSeedTree();
  const exported = serializeTree(tree);
  const result = parseImportedTree(JSON.parse(JSON.stringify(exported)));
  assert.ok(result.imported > 10);
  assert.equal(result.skipped, 0);
  assert.ok(result.tree['/home/kali/Documents/welcome.md']);
});
test('rejects non-KALI documents', () => {
  assert.throws(() => parseImportedTree({ hello: 'world' }), (e) => e instanceof FsError);
});
test('rejects invalid node types and escapes', () => {
  const result = parseImportedTree({
    app: 'kali-web-os',
    kind: 'virtual-filesystem',
    version: 1,
    nodes: [
      { path: '/home/kali/valid.txt', type: 'file', content: 'ok' },
      { path: '/etc/evil', type: 'script', content: 'nope' },
      { path: 'relative/path', type: 'file', content: 'nope' },
      { path: '/home/kali/..', type: 'file', content: 'nope' },
    ],
  });
  assert.equal(result.imported, 1);
  assert.equal(result.skipped, 3);
  assert.ok(!('relative/path' in result.tree));
});
test('import skips oversized content', () => {
  const result = parseImportedTree({
    app: 'kali-web-os',
    kind: 'virtual-filesystem',
    version: 1,
    nodes: [{ path: '/home/kali/big.txt', type: 'file', content: 'x'.repeat(100 * 1024) }],
  });
  assert.equal(result.imported, 0);
});
test('serialized export cannot contain prototype pollution fields', () => {
  const exported = serializeTree(createSeedTree());
  assert.ok(Array.isArray(exported.nodes));
  for (const node of exported.nodes) {
    assert.deepEqual(Object.keys(node).sort(), ['content', 'path', 'type', 'updatedAt']);
  }
});

console.log('\n# tokenizer');
test('handles quotes and escapes', () => {
  assert.deepEqual(tokenize('echo "hello world"'), ['echo', 'hello world']);
  assert.deepEqual(tokenize("echo 'single quoted'"), ['echo', 'single quoted']);
  assert.deepEqual(tokenize('echo a\\ b'), ['echo', 'a b']);
  assert.deepEqual(tokenize('   '), []);
});
test('rejects unterminated quotes', () => {
  assert.throws(() => tokenize('echo "oops'));
});

console.log('\n# interpreter');
function run(input, options = {}) {
  let tree = options.tree ?? createSeedTree();
  const env = {
    cwd: options.cwd ?? '/home/kali',
    prevCwd: '/home/kali',
    lang: options.lang ?? 'en',
    history: options.history ?? [],
    tree,
    t: options.t ?? t,
    saveTree: (next) => {
      tree = next;
    },
  };
  const result = execute(input, env);
  return { result, tree };
}

test('help lists every allow-listed command', () => {
  const { result } = run('help');
  const text = result.lines.map((l) => l.text).join('\n');
  for (const command of ALLOWED_COMMANDS) {
    assert.ok(text.includes(command), `help should mention ${command}`);
  }
  assert.ok(text.toLowerCase().includes('simulated'));
});
test('pwd and cd behave', () => {
  const first = run('pwd');
  assert.equal(first.result.lines[0].text, '/home/kali');
  const cd = run('cd Lessons');
  assert.equal(cd.result.cwd, '/home/kali/Lessons');
  const up = run('cd ..', { cwd: '/home/kali/Lessons' });
  assert.equal(up.result.cwd, '/home/kali');
  const root = run('cd /');
  assert.equal(root.result.cwd, '/');
  const previous = run('cd -', { cwd: '/home/kali/Lessons' });
  assert.equal(previous.result.lines[0].text, '/home/kali');
});
test('cd to a file fails with ENOTDIR message', () => {
  const { result } = run('cd /etc/hostname');
  assert.equal(result.lines[0].kind, 'error');
  assert.ok(result.lines[0].text.includes('Not a directory'));
});
test('unknown commands are refused', () => {
  for (const input of ['rm -rf /', 'sudo bash', 'curl http://example.com', 'sh -c "ls"', 'javascript:alert(1)']) {
    const { result } = run(input);
    assert.equal(result.lines[0].kind, 'error', `${input} should error`);
    assert.ok(
      result.lines[0].text.includes('command not found') || result.lines[0].text.includes('introuvable'),
      `${input} should be refused`,
    );
  }
});
test('shell metacharacters are inert', () => {
  const { result, tree } = run('echo $(whoami) ; cat /etc/hostname | base64');
  assert.equal(result.lines[0].text, '$(whoami) ; cat /etc/hostname | base64');
  assert.equal(tree['/etc/hostname'].content.trim(), 'kali-sim');
});
test('clear returns the clear flag and no lines', () => {
  const { result } = run('clear');
  assert.equal(result.clear, true);
  assert.equal(result.lines.length, 0);
});
test('ls lists seeded entries', () => {
  const { result } = run('ls');
  const text = result.lines.map((l) => l.text).join(' ');
  assert.ok(text.includes('Documents/'));
  assert.ok(text.includes('Lessons/'));
});
test('ls -l shows a permission string', () => {
  const { result } = run('ls -l ~/Documents/welcome.md');
  assert.match(result.lines[0].text, /^-[r-][w-][x-][r-][w-][x-][r-][w-][x-]/);
});
test('ls on a missing path errors', () => {
  const { result } = run('ls /nope');
  assert.equal(result.lines[0].kind, 'error');
  assert.ok(result.lines[0].text.includes('No such file'));
});
test('cat reads fictional seeded content', () => {
  const { result } = run('cat /etc/hostname');
  assert.equal(result.lines[0].text, 'kali-sim');
});
test('cat of a directory errors', () => {
  const { result } = run('cat /etc');
  assert.equal(result.lines[0].kind, 'error');
});
test('mkdir creates the directory silently like the real tool', () => {
  const { result, tree } = run('mkdir demo');
  assert.equal(result.lines.length, 0);
  assert.ok(tree['/home/kali/demo']);
});
test('touch creates an empty file', () => {
  const { tree } = run('touch ~/newfile.txt');
  assert.equal(tree['/home/kali/newfile.txt'].content, '');
});
test('echo prints literal text', () => {
  assert.equal(run('echo "hello world"').result.lines[0].text, 'hello world');
});
test('whoami/hostname/uname are simulated and labelled', () => {
  assert.equal(run('whoami').result.lines[0].text, 'kali');
  assert.equal(run('hostname').result.lines[0].text, 'kali-sim');
  const uname = run('uname -a').result.lines.map((l) => l.text).join(' ');
  assert.ok(uname.includes('Linux'));
  assert.ok(uname.toLowerCase().includes('simulation'));
});
test('date prints a Linux-style timestamp', () => {
  const { result } = run('date -u');
  assert.match(result.lines[0].text, /^[A-Z][a-z]{2} [A-Z][a-z]{2} [ \d]\d \d{2}:\d{2}:\d{2} UTC \d{4}$/);
});
test('history lists supplied commands', () => {
  const { result } = run('history', { history: ['pwd', 'ls'] });
  assert.ok(result.lines.some((l) => l.text.includes('1  pwd')));
});
test('tree draws the seeded structure', () => {
  const { result } = run('tree ~/Lessons');
  const text = result.lines.map((l) => l.text).join('\n');
  assert.ok(text.includes('01-linux-basics.md'));
});
test('man works for allowed commands and rejects others', () => {
  const { result } = run('man ls');
  const text = result.lines.map((l) => l.text).join('\n');
  assert.ok(text.includes('SYNOPSIS'));
  const missing = run('man rm');
  assert.equal(missing.result.lines[0].kind, 'error');
});
test('overlong input is rejected', () => {
  const { result } = run('echo ' + 'a'.repeat(MAX_INPUT_LENGTH + 10));
  assert.equal(result.lines[0].kind, 'error');
  assert.ok(result.lines[0].text.includes('too long'));
});
test('ANSI escapes and control characters are stripped', () => {
  const { result } = run('echo \u001b[31mred\u001b[0m\u0007');
  assert.equal(result.lines[0].text, 'red');
});
test('no JS execution primitives are reachable', () => {
  const source = [
    'new Function("return 1")',
    'globalThis.process',
    'require("fs")',
  ];
  for (const cmd of source) {
    const { result } = run(cmd);
    assert.equal(result.lines[0].kind, 'error');
  }
});
test('French error messages localise', () => {
  const tr = (key, vars) => translate('fr', key, vars);
  const { result } = run('cat /nope', { t: tr, lang: 'fr' });
  assert.ok(result.lines[0].text.includes('Aucun fichier'));
});

console.log('\n# completion');
test('completes command names', () => {
  const tree = createSeedTree();
  assert.equal(complete('hel', '/home/kali', tree).value, 'help ');
  assert.equal(complete('ec', '/home/kali', tree).value, 'echo ');
});
test('lists ambiguous commands', () => {
  const result = complete('c', '/home/kali', createSeedTree());
  assert.ok(result.candidates.includes('cat'));
  assert.ok(result.candidates.includes('cd'));
});
test('completes paths inside a directory', () => {
  const result = complete('cat ~/Less', '/home/kali', createSeedTree());
  assert.equal(result.value, 'cat ~/Lessons/');
});
test('completes file names', () => {
  const result = complete('cat /etc/hostn', '/home/kali', createSeedTree());
  assert.equal(result.value, 'cat /etc/hostname ');
  const ambiguous = complete('cat /etc/host', '/home/kali', createSeedTree());
  assert.equal(ambiguous.candidates.length, 2);
});

console.log('\n# PWA assets');
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
test('manifest has the required fields', () => {
  assert.equal(typeof manifest.name, 'string');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.ok(manifest.theme_color && manifest.background_color);
});
test('manifest ships installable icons', () => {
  const sizes = manifest.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes('192x192'));
  assert.ok(sizes.includes('512x512'));
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    assert.ok(existsSync(`public/${icon.src.replace('./', '')}`), `${icon.src} must exist`);
  }
});
test('PNG icons really are 512 and 192 pixels', () => {
  for (const [file, expected] of [
    ['public/icons/icon-192.png', 192],
    ['public/icons/icon-512.png', 512],
    ['public/icons/apple-touch-icon.png', 180],
  ]) {
    const buffer = readFileSync(file);
    assert.equal(buffer.toString('ascii', 1, 4), 'PNG');
    assert.equal(buffer.readUInt32BE(16), expected);
    assert.equal(buffer.readUInt32BE(20), expected);
  }
});
test('service worker caches the shell and cleans old versions', () => {
  const sw = readFileSync('public/sw.js', 'utf8');
  assert.ok(sw.includes("addEventListener('install'"));
  assert.ok(sw.includes("addEventListener('fetch'"));
  assert.ok(sw.includes('caches.keys'));
  assert.ok(sw.includes("request.mode === 'navigate'"));
  assert.ok(!/https?:\/\//.test(sw), 'service worker must not reference external origins');
});
test('index.html declares a PWA and safe-area viewport', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.ok(html.includes('rel="manifest"'));
  assert.ok(html.includes('viewport-fit=cover'));
  assert.ok(html.includes('apple-touch-icon'));
  assert.ok(html.includes('name="theme-color"'));
  assert.ok(html.includes('apple-mobile-web-app-capable'));
});

console.log('\n# security static checks');
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}
const sources = walk('src').filter((file) => /\.(ts|tsx)$/.test(file));
test('no eval or Function constructor in the source', () => {
  for (const file of sources) {
    const code = readFileSync(file, 'utf8');
    assert.ok(!/\beval\s*\(/.test(code), `${file} uses eval`);
    assert.ok(!/new\s+Function\s*\(/.test(code), `${file} uses new Function`);
  }
});
test('no HTML injection sinks', () => {
  for (const file of sources) {
    const code = readFileSync(file, 'utf8');
    assert.ok(!code.includes('dangerouslySetInnerHTML'), `${file} uses dangerouslySetInnerHTML`);
    assert.ok(!/\.innerHTML\s*=/.test(code), `${file} assigns innerHTML`);
    assert.ok(!/document\.write/.test(code), `${file} uses document.write`);
  }
});
test('no network calls, sockets or host APIs from the app', () => {
  for (const file of sources) {
    const code = readFileSync(file, 'utf8');
    assert.ok(!/\bfetch\s*\(/.test(code), `${file} calls fetch`);
    assert.ok(!/XMLHttpRequest/.test(code), `${file} uses XMLHttpRequest`);
    assert.ok(!/WebSocket/.test(code), `${file} uses WebSocket`);
    assert.ok(!/https?:\/\//.test(code), `${file} references an external URL`);
  }
});
test('terminal only dispatches allow-listed handlers', () => {
  const code = readFileSync('src/apps/terminal/interpreter.ts', 'utf8');
  assert.ok(code.includes('Object.hasOwn(handlers, name)'));
  assert.ok(!code.includes('child_process'));
  assert.ok(!code.includes('require('));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
