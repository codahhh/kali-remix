import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, FileText, RotateCcw, ShieldCheck, Terminal, XCircle } from 'lucide-react';
import { usePreferences } from '../../state/PreferencesContext';
import { useWindows } from '../../state/WindowContext';
import { localized } from '../../lib/localized';
import { LOG_DRILL, PERMISSION_EXERCISE } from './lessons';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Controls';

type Bit = 'r' | 'w' | 'x';
type Perms = Record<'u' | 'g' | 'o', Record<Bit, boolean>>;

const START: Perms = {
  u: { r: true, w: true, x: false },
  g: { r: true, w: false, x: false },
  o: { r: false, w: false, x: false },
};

const BITS: Bit[] = ['r', 'w', 'x'];

function octalFor(perms: Perms): string {
  const group = (value: Record<Bit, boolean>): number =>
    (value.r ? 4 : 0) + (value.w ? 2 : 0) + (value.x ? 1 : 0);
  return `${group(perms.u)}${group(perms.g)}${group(perms.o)}`;
}

function symbolicFor(perms: Perms): string {
  const group = (value: Record<Bit, boolean>): string =>
    `${value.r ? 'r' : '-'}${value.w ? 'w' : '-'}${value.x ? 'x' : '-'}`;
  return group(perms.u) + group(perms.g) + group(perms.o);
}

export function PermissionExercise(): ReactNode {
  const { t } = usePreferences();
  const [perms, setPerms] = useState<Perms>(START);
  const [checked, setChecked] = useState(false);

  const octal = octalFor(perms);
  const recommended = (PERMISSION_EXERCISE.recommendedMode).toString(8).padStart(3, '0');
  const correct = octal === recommended;

  const toggle = (group: 'u' | 'g' | 'o', bit: Bit): void => {
    setChecked(false);
    setPerms((current) => ({
      ...current,
      [group]: { ...current[group], [bit]: !current[group][bit] },
    }));
  };

  return (
    <section
      aria-label={t('lab.permissions')}
      className="rounded-xl border border-surface-line bg-surface-soft/40 p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
          <h3 className="text-[13px] font-semibold text-text-hi">{t('lab.permissions')}</h3>
          <Badge tone="sim">{t('common.simulated')}</Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCcw />}
          onClick={() => {
            setPerms(START);
            setChecked(false);
          }}
        >
          {t('lab.resetExercise')}
        </Button>
      </header>

      <p className="mt-2 text-xs leading-relaxed text-text-mid">{t('lab.permissionScenario')}</p>

      <div className="mt-3 flex items-center gap-2 rounded-lg border border-surface-line bg-ink-0/40 px-3 py-2 font-mono text-[11px]">
        <FileText className="h-4 w-4 shrink-0 text-teal-200" aria-hidden="true" />
        <span className="truncate text-text-hi">{PERMISSION_EXERCISE.fileName}</span>
        <span className="ml-auto shrink-0 text-accented">{symbolicFor(perms)}</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {(['u', 'g', 'o'] as const).map((group) => (
          <div key={group} className="rounded-lg border border-surface-line bg-surface-soft/50 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-low">
              {group === 'u'
                ? t('lab.permissionOwner')
                : group === 'g'
                  ? t('lab.permissionGroup')
                  : t('lab.permissionOther')}
            </p>
            <div className="mt-2 flex gap-1.5">
              {BITS.map((bit) => {
                const active = perms[group][bit];
                return (
                  <button
                    key={bit}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${group} ${bit} ${
                      bit === 'r' ? t('lab.read') : bit === 'w' ? t('lab.write') : t('lab.execute')
                    }`}
                    onClick={() => toggle(group, bit)}
                    className={[
                      'h-8 flex-1 rounded-md border font-mono text-[12px] uppercase transition focus-ring',
                      active
                        ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-200'
                        : 'border-surface-line bg-surface-soft text-text-low hover:text-text-mid',
                    ].join(' ')}
                  >
                    {bit}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-md bg-ink-0/60 px-2 py-1 text-[11px] text-accented">
          chmod {octal} {PERMISSION_EXERCISE.fileName}
        </code>
        <span className="text-[10px] text-text-low">
          {t('lab.currentMode')}: <span className="font-mono text-text-mid">{octal}</span>
        </span>
        <span className="text-[10px] text-text-low">· {t('lab.permissionGoal')}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="primary" onClick={() => setChecked(true)}>
            {t('lab.check')}
          </Button>
        </div>
      </div>

      {checked ? (
        <p
          role="status"
          className={[
            'mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed',
            correct
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border-amber-400/30 bg-amber-400/10 text-amber-200',
          ].join(' ')}
        >
          {correct ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {correct ? t('lab.correctPermissions') : t('lab.wrongPermissions')}
        </p>
      ) : null}

      <p className="mt-3 text-[10px] text-text-low">{t('lab.exerciseNote')}</p>
    </section>
  );
}

export function LogExercise(): ReactNode {
  const { t, lang } = usePreferences();
  const { openApp } = useWindows();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState(false);

  const expected = useMemo(
    () => new Set(LOG_DRILL.filter((line) => line.suspicious).map((line) => line.id)),
    [],
  );
  const correct =
    selected.size === expected.size && [...selected].every((id) => expected.has(id));

  const toggle = (id: string): void => {
    setChecked(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section
      aria-label={t('lab.logExercise')}
      className="rounded-xl border border-surface-line bg-surface-soft/40 p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-amber-300" aria-hidden="true" />
          <h3 className="text-[13px] font-semibold text-text-hi">{t('lab.logExercise')}</h3>
          <Badge tone="sim">{t('common.simulated')}</Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCcw />}
          onClick={() => {
            setSelected(new Set());
            setChecked(false);
          }}
        >
          {t('lab.resetExercise')}
        </Button>
      </header>

      <p className="mt-2 text-xs leading-relaxed text-text-mid">{t('lab.logExerciseHint')}</p>
      <p className="mt-1 text-[11px] font-medium text-text-hi">{t('lab.logTitle')}</p>

      <ul className="mt-2 space-y-1.5">
        {LOG_DRILL.map((line, index) => {
          const active = selected.has(line.id);
          return (
            <li key={line.id}>
              <label
                className={[
                  'flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-colors',
                  active
                    ? 'border-accent/45 bg-accent/10'
                    : 'border-surface-line bg-ink-0/25 hover:bg-surface-soft',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(line.id)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-[rgb(var(--accent))]"
                  aria-label={t('lab.logLine', { number: index + 1 })}
                />
                <span className="min-w-0">
                  <code className="block break-words font-mono text-[10.5px] leading-relaxed text-text-mid">
                    {line.text}
                  </code>
                  {checked ? (
                    <span
                      className={[
                        'mt-1 block text-[10.5px] leading-relaxed',
                        line.suspicious ? 'text-emerald-300' : 'text-text-low',
                      ].join(' ')}
                    >
                      {line.suspicious ? '✓ ' : '· '}
                      {localized(line.explanation, lang)}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-text-low">
          {t('lab.logSelected', { count: selected.size })}
        </span>
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<Terminal />}
            onClick={() => {
              openApp('terminal', { props: { command: 'cat ~/Logs/auth.log' } });
            }}
          >
            {t('lab.runInTerminal')}
          </Button>
          <Button size="sm" variant="primary" onClick={() => setChecked(true)}>
            {t('lab.checkSelection')}
          </Button>
        </div>
      </div>

      {checked ? (
        <p
          role="status"
          className={[
            'mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed',
            correct
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : 'border-amber-400/30 bg-amber-400/10 text-amber-200',
          ].join(' ')}
        >
          {correct ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {correct ? t('lab.logCorrect') : t('lab.logIncorrect')}
        </p>
      ) : null}
    </section>
  );
}
