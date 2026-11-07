/**
 * Headless UI smoke test. Boots the real application in jsdom, drives the
 * desktop with DOM events and checks that every application renders and reacts.
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  '<!doctype html><html lang="en"><head><meta name="theme-color" content="#000"></head><body><div id="root"></div></body></html>',
  { url: 'https://kali-web-os.test/', pretendToBeVisual: true },
);

const { window } = dom;
type GlobalShim = Record<string, unknown>;
const g = globalThis as GlobalShim;

// ---------------------------------------------------------------- environment
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

function define(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

define('window', window);
define('document', window.document);
define('navigator', window.navigator);
define('HTMLElement', window.HTMLElement);
define('HTMLInputElement', window.HTMLInputElement);
define('HTMLTextAreaElement', window.HTMLTextAreaElement);
define('Event', window.Event);
define('KeyboardEvent', window.KeyboardEvent);
define('PointerEvent', window.PointerEvent ?? window.MouseEvent);
define('MouseEvent', window.MouseEvent);
define('localStorage', window.localStorage);
define('sessionStorage', window.sessionStorage);
g.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 16);
g.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
g.getComputedStyle = window.getComputedStyle.bind(window);
g.IS_REACT_ACT_ENVIRONMENT = true;

const errors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '));
  originalError(...args);
};

const { createRoot } = await import('react-dom/client');
const React = await import('react');
const { App } = await import('../src/App');
const { PreferencesProvider } = await import('../src/state/PreferencesContext');
const { ToastProvider } = await import('../src/state/ToastContext');
const { FsProvider } = await import('../src/state/FsContext');
const { PwaProvider } = await import('../src/state/PwaContext');
const { WindowProvider } = await import('../src/state/WindowContext');

const act = React.act;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const root = createRoot(window.document.getElementById('root') as HTMLElement);
await act(async () => {
  root.render(
    React.createElement(
      PreferencesProvider,
      null,
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          FsProvider,
          null,
          React.createElement(
            PwaProvider,
            null,
            React.createElement(WindowProvider, null, React.createElement(App, null)),
          ),
        ),
      ),
    ),
  );
});
await act(async () => {
  await sleep(200);
});

const bodyText = () => window.document.body.textContent ?? '';
const $$ = (selector: string): HTMLElement[] =>
  Array.from(window.document.querySelectorAll(selector)) as HTMLElement[];
const byLabel = (label: string, scope: ParentNode = window.document): HTMLElement[] =>
  Array.from(scope.querySelectorAll(`[aria-label="${label}"]`)) as HTMLElement[];

async function click(el: HTMLElement | undefined, label: string): Promise<void> {
  if (!el) throw new Error(`Element not found for click: ${label}`);
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(40);
  });
}

async function setInput(el: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  const proto =
    el instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  await act(async () => {
    setter?.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    await sleep(20);
  });
}

async function press(el: HTMLElement, key: string, init: KeyboardEventInit = {}): Promise<void> {
  await act(async () => {
    el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
    await sleep(40);
  });
}

function dockButton(label: string): HTMLElement | undefined {
  const dock = window.document.querySelector('nav[aria-label="Dock"]');
  return dock ? byLabel(label, dock)[0] : undefined;
}

console.log('\n# shell');
check('app mounts without throwing', bodyText().length > 100);
check('status panel is present', Boolean(window.document.querySelector('header[role="banner"]')));
check('desktop icons are present', byLabel('Terminal').length > 0);
check('simulation disclaimer is visible', /simulation|simul/i.test(bodyText()));

console.log('\n# launcher');
await click(byLabel('Application launcher')[0], 'launcher');
check('launcher dialog opens', Boolean(window.document.querySelector('[role="dialog"][aria-label="Application launcher"]')));
check(
  'launcher dialog is announced as modal',
  Boolean(window.document.querySelector('[role="dialog"][aria-label="Application launcher"][aria-modal="true"]')),
);
const search = window.document.querySelector(
  'input[placeholder="Search applications…"]',
) as HTMLInputElement | null;
await act(async () => {
  await sleep(120);
});
check('launcher search is focused', window.document.activeElement === search, String(window.document.activeElement?.tagName));
if (search) {
  await setInput(search, 'term');
  check('launcher filters results', bodyText().includes('Terminal'));
  await press(search, 'Enter');
}
check('terminal opened from launcher', Boolean(window.document.getElementById('terminal-input')));

console.log('\n# terminal');
const termInput = window.document.getElementById('terminal-input') as HTMLInputElement | null;
if (termInput) {
  await click(window.document.getElementById('terminal-input') ?? undefined, 'terminal focus');
  await setInput(termInput, 'help');
  await press(termInput, 'Enter');
  check('help lists commands', bodyText().includes('Supported commands'));
  await setInput(termInput, 'ls -l');
  await press(termInput, 'Enter');
  check('ls -l renders permissions', /-rw-|-rwx|drwx/.test(bodyText()));
  await setInput(termInput, 'mkdir demo-from-test');
  await press(termInput, 'Enter');
  await setInput(termInput, 'cd demo-from-test');
  await press(termInput, 'Enter');
  await setInput(termInput, 'pwd');
  await press(termInput, 'Enter');
  check('virtual cd/pwd works', bodyText().includes('/home/kali/demo-from-test'));
  await setInput(termInput, 'rm -rf /');
  await press(termInput, 'Enter');
  check('dangerous command is refused', bodyText().includes('command not found'));
  await setInput(termInput, 'man ls');
  await press(termInput, 'Enter');
  check('simulated man page renders', bodyText().includes('SIMULATED MANUAL'));
  await setInput(termInput, 'cat ~/Documents/welcome.md');
  await press(termInput, 'Enter');
  check('cat reads simulated files', bodyText().includes('Welcome to KALI WEB OS'));
  await setInput(termInput, 'clear');
  await press(termInput, 'Enter');
  check('clear empties the scrollback', !bodyText().includes('Welcome to KALI WEB OS'));
  await setInput(termInput, '');
}

console.log('\n# files');
await click(dockButton('Files'), 'dock files');
check('files window opens', bodyText().includes('Home folder') || bodyText().includes('Documents'));
check('seed files are listed', bodyText().includes('Libraries') || bodyText().includes('Lessons') || bodyText().includes('Documents'));
const newFolder = byLabel('New folder')[0];
await click(newFolder, 'new folder');
check('new-folder dialog opens', bodyText().includes('New folder'));
const dialogInput = window.document.querySelector(
  'input[autofocus], [data-autofocus]',
) as HTMLInputElement | null;
const nameField =
  dialogInput ??
  (Array.from(window.document.querySelectorAll('[role="dialog"] input')) as HTMLInputElement[]).at(-1);
if (nameField) {
  await setInput(nameField as HTMLInputElement, 'test-folder');
  const create = Array.from(window.document.querySelectorAll('[role="dialog"] button')).find((el) =>
    (el.textContent ?? '').trim() === 'Create',
  ) as HTMLElement | undefined;
  await click(create, 'create folder');
  check('folder created through the dialog', bodyText().includes('test-folder'));
}

console.log('\n# editor');
// Open a seeded markdown file from the desktop icon (single click selects, double opens).
const welcomeIcon = byLabel('welcome.md')[0];
if (welcomeIcon) {
  await act(async () => {
    welcomeIcon.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
    await sleep(80);
  });
}
const editorArea = window.document.querySelector(
  '[role="dialog"] textarea[aria-label="File path"]',
) as HTMLTextAreaElement | null;
check('text editor opens a seeded file', Boolean(editorArea));
if (editorArea) {
  check('file content is loaded', (editorArea.value ?? '').includes('Welcome to KALI WEB OS'));
  await setInput(editorArea, `${editorArea.value}\n\nEdited by the smoke test.`);
  const saveButtons = Array.from(window.document.querySelectorAll('button')).filter((el) =>
    (el.textContent ?? '').trim() === 'Save',
  ) as HTMLElement[];
  await click(saveButtons[0], 'save');
  check('save writes to the virtual filesystem', bodyText().includes('Saved'));
}

console.log('\n# cyber lab');
await click(dockButton('Cyber Lab'), 'dock lab');
check('lab lesson list renders', bodyText().includes('Linux fundamentals'));
const lessonButtons = Array.from(window.document.querySelectorAll('button')).filter((el) =>
  (el.textContent ?? '').includes('Linux fundamentals'),
) as HTMLElement[];
await click(lessonButtons[0], 'lesson');
check('lesson detail opens', bodyText().includes('Everything hangs from'));
// Answer the first question.
const radios = $$('input[type="radio"]');
if (radios[0]) {
  await click(radios[1], 'second answer');
  const checkButton = Array.from(window.document.querySelectorAll('button')).find((el) =>
    (el.textContent ?? '').trim() === 'Check answer',
  ) as HTMLElement | undefined;
  await click(checkButton, 'check answer');
  check('quiz gives feedback', bodyText().includes('Correct') || bodyText().includes('Not quite'));
}

console.log('\n# network');
await click(dockButton('Network'), 'dock network');
check('network shows browser info', bodyText().includes('Browser-reported network information'));
check('network explains limitations', bodyText().includes('cannot') || bodyText().includes('Un navigateur'));
const runFlow = Array.from(window.document.querySelectorAll('button')).find((el) =>
  (el.textContent ?? '').includes('Simulate a request'),
) as HTMLElement | undefined;
await click(runFlow, 'simulate request');
check('simulated flow starts', bodyText().includes('Simulating') || bodyText().includes('WS-01'));

console.log('\n# system monitor');
await click(dockButton('System Monitor'), 'dock monitor');
check('monitor renders', bodyText().includes('SIMULATED') || bodyText().includes('Simulated'));
check('monitor labels simulated metrics', bodyText().includes('do NOT read your device') || bodyText().includes('ne lisent PAS'));

console.log('\n# settings');
await click(dockButton('Settings'), 'dock settings');
check('settings render', bodyText().includes('Appearance') && bodyText().includes('Wallpaper'));
const frenchButton = Array.from(window.document.querySelectorAll('button')).find(
  (el) => (el.textContent ?? '').trim() === 'Français',
) as HTMLElement | undefined;
await click(frenchButton, 'language fr');
check('language switches to French', bodyText().includes('Apparence') && bodyText().includes('Paramètres'));
const englishButton = Array.from(window.document.querySelectorAll('button')).find(
  (el) => (el.textContent ?? '').trim() === 'English',
) as HTMLElement | undefined;
await click(englishButton, 'language en');
check('language switches back to English', bodyText().includes('Appearance'));

const clickByText = async (label: string, text: string): Promise<void> => {
  const target = Array.from(window.document.querySelectorAll('button')).find(
    (el) => (el.textContent ?? '').trim() === text,
  ) as HTMLElement | undefined;
  await click(target, label);
};
const rootStyle = window.document.documentElement.style;
const darkAccent = rootStyle.getPropertyValue('--accent').trim();
await clickByText('light theme', 'Light');
check('theme switches to light', window.document.documentElement.dataset.theme === 'light');
check(
  'light theme darkens the accent for contrast',
  rootStyle.getPropertyValue('--accent').trim() !== darkAccent &&
    rootStyle.getPropertyValue('--accent').trim().length > 0,
);
check('accent label flips to light text on dark accents', rootStyle.getPropertyValue('--accent-contrast').trim().startsWith('2'));
await clickByText('dark theme', 'Dark');
check('theme switches back to dark', window.document.documentElement.dataset.theme === 'dark');
check('accent is restored in dark theme', rootStyle.getPropertyValue('--accent').trim() === darkAccent);

const wallpaperRadios = $$('[role="radiogroup"] [role="radio"], [role="radiogroup"] button');
const targetWallpaper = wallpaperRadios.find((el) => (el.getAttribute('aria-label') ?? '').match(/Aurora/i));
if (targetWallpaper) {
  await click(targetWallpaper, 'aurora wallpaper');
  check(
    'wallpaper preference applies to the document',
    window.document.documentElement.dataset.wallpaper === 'aurora' ||
      Boolean(window.document.querySelector('.wallpaper[data-wallpaper="aurora"]')),
  );
}

// Reset confirmation must be required.
const resetButton = Array.from(window.document.querySelectorAll('button')).find((el) =>
  (el.textContent ?? '').includes('Erase files and preferences'),
) as HTMLElement | undefined;
await click(resetButton, 'reset workspace');
check('reset asks for confirmation', bodyText().includes('Reset KALI WEB OS?'));
const cancelReset = Array.from(window.document.querySelectorAll('[role="dialog"] button')).find(
  (el) => (el.textContent ?? '').trim() === 'Keep my data',
) as HTMLElement | undefined;
await click(cancelReset, 'cancel reset');
check('reset is cancelled safely', !bodyText().includes('Reset KALI WEB OS?'));

console.log('\n# window management');
const closeButtons = byLabel('Close window — Settings');
check('window close control exists', closeButtons.length > 0);
await click(closeButtons[0], 'close settings');
check('window closes', !bodyText().includes('Preferences are stored on this device'));

console.log('\n# mobile layout');
Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true, writable: true });
window.dispatchEvent(new window.Event('resize'));
await act(async () => {
  await sleep(200);
});
const mobileNav = window.document.querySelector('nav[aria-label="Taskbar"]');
check('mobile bottom navigation renders', Boolean(mobileNav));
check(
  'mobile navigation exposes home/apps/windows/settings',
  mobileNav ? byLabel('Home', mobileNav).length > 0 && byLabel('Apps', mobileNav).length > 0 && byLabel('Windows', mobileNav).length > 0 && byLabel('Settings', mobileNav).length > 0 : false,
);
const homeButtons = Array.from(window.document.querySelectorAll('button')).filter((el) =>
  (el.textContent ?? '').includes('Cyber Lab'),
) as HTMLElement[];
check('mobile home screen lists applications', homeButtons.length > 0);
const mobileLauncher = mobileNav ? byLabel('Apps', mobileNav)[0] : undefined;
await click(mobileLauncher, 'mobile apps');
check('mobile launcher opens', Boolean(window.document.querySelector('[role="dialog"][aria-label="Application launcher"]')));
const closeLauncher = byLabel('Close').find((el) => el.closest('[role="dialog"]'));
await click(closeLauncher, 'close launcher');
check('launcher is closed before opening the switcher', !window.document.querySelector('[role="dialog"][aria-label="Application launcher"]'));
const windowsNav = mobileNav ? byLabel('Windows', mobileNav)[0] : undefined;
await click(windowsNav, 'mobile windows');
const modalsNow = $$('[role="dialog"][aria-modal="true"]');
check('mobile window switcher opens', modalsNow.length > 0, `modals=${modalsNow.length} text=${bodyText().slice(-200)}`);
await press(window.document.body, 'Escape');
check('Escape closes the mobile switcher', window.document.querySelectorAll('[role="dialog"][aria-modal="true"]').length === 0);
await act(async () => {
  await sleep(80);
});
check('no crash after switching to mobile', bodyText().length > 100);

console.log('\n# accessibility basics');
const unlabeled = $$('button:not([aria-label]):not([aria-hidden="true"])').filter(
  (el) => (el.textContent ?? '').trim().length === 0 && !el.getAttribute('title'),
);
check('all icon buttons have labels', unlabeled.length === 0, unlabeled.map((el) => el.outerHTML.slice(0, 120)).join(' | '));
check(
  'no modal overlay is left open',
  $$('[role="dialog"][aria-modal="true"]').length === 0,
  $$('[role="dialog"][aria-modal="true"]').map((el) => (el as HTMLElement).outerHTML.slice(0, 160)).join(' || '),
);
check('no fatal console errors', errors.filter((line) => /TypeError|ReferenceError|not a function/.test(line)).length === 0, errors.join(' | '));

await act(async () => {
  root.unmount();
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
