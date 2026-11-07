import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  Copy,
  FlaskConical,
  GraduationCap,
  Lock,
  Network,
  RotateCcw,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
} from 'lucide-react';
import { usePreferences } from '../../state/PreferencesContext';
import { useToast } from '../../state/ToastContext';
import { useWindows } from '../../state/WindowContext';
import { localized } from '../../lib/localized';
import { LESSONS, type Lesson, type LabIcon } from './lessons';
import { LogExercise, PermissionExercise } from './Exercises';
import { useLabProgress } from './useLabProgress';
import { Button } from '../../components/ui/Button';
import { Badge, ProgressBar } from '../../components/ui/Controls';
import { EmptyState } from '../../components/ui/Feedback';
import type { AppProps } from '../registry';

const ICONS: Record<LabIcon, typeof Terminal> = {
  linux: Terminal,
  permissions: ShieldCheck,
  network: Network,
  logs: ScrollText,
  defense: Shield,
};

export function CyberLabApp(_props: AppProps): ReactNode {
  const { t, lang, locale } = usePreferences();
  const { progress, completedCount, record } = useLabProgress();
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeLesson = LESSONS.find((lesson) => lesson.id === activeId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-1/20">
      <header className="shrink-0 border-b border-surface-line bg-gradient-to-r from-emerald-400/[0.07] via-transparent to-transparent px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[13px] font-semibold text-text-hi">{t('lab.title')}</h2>
            <p className="truncate text-[10px] text-text-low">{t('lab.subtitle')}</p>
          </div>
          <Badge tone="sim">{t('lab.disclaimerShort')}</Badge>
          <div className="w-full sm:w-52">
            <div className="flex items-center justify-between text-[10px] text-text-low">
              <span>{t('lab.progress')}</span>
              <span>
                {completedCount}/{LESSONS.length}
              </span>
            </div>
            <div className="mt-1">
              <ProgressBar
                value={completedCount}
                max={LESSONS.length}
                label={t('lab.progress')}
              />
            </div>
          </div>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-text-low">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400/80" aria-hidden="true" />
          {t('lab.disclaimer')}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto kali-scroll">
        {activeLesson ? (
          <LessonView
            key={activeLesson.id}
            lesson={activeLesson}
            onBack={() => setActiveId(null)}
            score={progress[activeLesson.id]}
            onComplete={(score, total) =>
              record(activeLesson.id, { score, total, at: Date.now() })
            }
            t={t}
            lang={lang}
            locale={locale}
          />
        ) : (
          <div className="mx-auto w-full max-w-5xl p-3 sm:p-4">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {LESSONS.map((lesson) => {
                const Icon = ICONS[lesson.icon];
                const done = progress[lesson.id];
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setActiveId(lesson.id)}
                    className="group flex flex-col gap-2 rounded-xl border border-surface-line bg-surface-win/60 p-3 text-left transition-all hover:border-accent/40 hover:bg-surface-soft focus-ring sm:p-4"
                  >
                    <span className="flex items-start gap-2.5">
                      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/20 to-cyan-500/5 text-emerald-300">
                        <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
                        <span className="absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-ink-0 text-[9px] font-bold text-text-mid">
                          {lesson.number}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-semibold text-text-hi">
                            {localized(lesson.title, lang)}
                          </span>
                          {done ? (
                            <Badge tone="success">
                              {done.score}/{done.total}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-text-low">
                          {localized(lesson.summary, lang)}
                        </span>
                      </span>
                    </span>
                    <span className="mt-auto flex flex-wrap items-center gap-2 text-[10px] text-text-low">
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3 w-3" aria-hidden="true" />
                        {t('lab.minutes', { count: lesson.minutes })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" aria-hidden="true" />
                        {lesson.level === 'beginner' ? t('lab.beginner') : t('lab.intermediate')}
                      </span>
                      {lesson.exercise ? (
                        <span className="inline-flex items-center gap-1 rounded border border-violet-400/25 bg-violet-400/10 px-1 py-0.5 text-violet-300">
                          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                          {t('lab.exercise')}
                        </span>
                      ) : null}
                      <span className="ml-auto inline-flex items-center gap-1 font-medium text-accented opacity-0 transition-opacity group-hover:opacity-100">
                        {done ? t('lab.continueLesson') : t('lab.startLesson')} →
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
              <p className="flex items-center gap-2 text-[11px] font-semibold text-amber-200">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                {t('install.limitationsTitle')}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-mid">{t('lab.disclaimer')}</p>
              <p className="mt-1 text-[10px] text-text-low">{t('lab.lessonFooter')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface LessonViewProps {
  lesson: Lesson;
  onBack: () => void;
  score: { score: number; total: number; at: number } | undefined;
  onComplete: (score: number, total: number) => void;
  t: ReturnType<typeof usePreferences>['t'];
  lang: ReturnType<typeof usePreferences>['prefs']['lang'];
  locale: string;
}

function LessonView({ lesson, onBack, score, onComplete, t, lang, locale }: LessonViewProps): ReactNode {
  const { push } = useToast();
  const { openApp } = useWindows();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const Icon = ICONS[lesson.icon];
  const question = lesson.questions[questionIndex];
  const total = lesson.questions.length;
  const correctCount = useMemo(
    () => Object.values(results).filter(Boolean).length,
    [results],
  );

  const copy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      push(t('lab.copied'), 'success');
    } catch {
      push(t('terminal.copyFailed'), 'error');
    }
  };

  const openTerminal = (): void => {
    openApp('terminal', {
      props: lesson.terminalTask ? { command: lesson.terminalTask.command } : {},
    });
  };

  if (finished) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
        <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-400/10 to-transparent p-5 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <h3 className="mt-3 text-base font-semibold text-text-hi">{t('lab.lessonComplete')}</h3>
          <p className="mt-1 text-xs text-text-mid">
            {t('lab.lessonCompleteBody', { score: correctCount, total })}
          </p>
          <div className="mx-auto mt-4 max-w-xs">
            <ProgressBar
              value={correctCount}
              max={total}
              label={t('lab.quizScore')}
              tone={correctCount === total ? 'accent' : 'warning'}
            />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" icon={<ArrowLeft />} onClick={onBack}>
              {t('lab.backToLessons')}
            </Button>
            <Button
              variant="ghost"
              icon={<RotateCcw />}
              onClick={() => {
                setResults({});
                setQuestionIndex(0);
                setChoice(null);
                setChecked(false);
                setFinished(false);
              }}
            >
              {t('lab.retryLesson')}
            </Button>
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] text-text-low">{t('lab.lessonFooter')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-3 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={onBack}>
          {t('lab.backToLessons')}
        </Button>
        <span className="text-[10px] uppercase tracking-wider text-text-low">
          {t('lab.lessonNumber', { number: lesson.number })}
        </span>
      </div>

      <header className="mt-2 flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/20 to-cyan-500/5 text-emerald-300">
          <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-text-hi sm:text-lg">
            {localized(lesson.title, lang)}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-text-mid">
            {localized(lesson.summary, lang)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">
              <Timer className="h-2.5 w-2.5" aria-hidden="true" />
              {t('lab.minutes', { count: lesson.minutes })}
            </Badge>
            <Badge tone="accent">
              {lesson.level === 'beginner' ? t('lab.beginner') : t('lab.intermediate')}
            </Badge>
            {score ? (
              <Badge tone="success">
                {t('lab.alreadyDone', {
                  date: new Intl.DateTimeFormat(locale, {
                    day: '2-digit',
                    month: 'short',
                  }).format(new Date(score.at)),
                  score: score.score,
                  total: score.total,
                })}
              </Badge>
            ) : null}
          </div>
        </div>
      </header>

      <article className="mt-4 space-y-3">
        {lesson.sections.map((section) => (
          <section
            key={section.heading.en}
            className="rounded-xl border border-surface-line bg-surface-win/50 p-3.5"
          >
            <h3 className="text-[13px] font-semibold text-text-hi">
              {localized(section.heading, lang)}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-text-mid">
              {localized(section.body, lang)}
            </p>
            {section.bullets ? (
              <ul className="mt-2 space-y-1">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet.en}
                    className="flex items-start gap-2 text-[11.5px] leading-relaxed text-text-mid"
                  >
                    <span
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    {localized(bullet, lang)}
                  </li>
                ))}
              </ul>
            ) : null}
            {section.compare ? (
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <code className="block overflow-x-auto rounded-lg border border-surface-line bg-ink-0/60 px-2.5 py-2 font-mono text-[10.5px] text-accented">
                  {localized(section.compare.left, lang)}
                </code>
                <code className="block overflow-x-auto rounded-lg border border-surface-line bg-ink-0/60 px-2.5 py-2 font-mono text-[10.5px] text-emerald-300">
                  {localized(section.compare.right, lang)}
                </code>
              </div>
            ) : null}
          </section>
        ))}
      </article>

      {lesson.exercise === 'permissions' ? (
        <div className="mt-3">
          <PermissionExercise />
        </div>
      ) : null}
      {lesson.exercise === 'logs' ? (
        <div className="mt-3">
          <LogExercise />
        </div>
      ) : null}

      {lesson.terminalTask ? (
        <section className="mt-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Terminal className="h-4 w-4 text-accented" aria-hidden="true" />
            <h3 className="text-[13px] font-semibold text-text-hi">{t('lab.terminalTask')}</h3>
            <Badge tone="sim">{t('common.simulated')}</Badge>
          </div>
          <p className="mt-1.5 text-xs text-text-mid">{localized(lesson.terminalTask.text, lang)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-surface-line bg-ink-0/60 px-2.5 py-1.5 font-mono text-[11px] text-accented">
              $ {lesson.terminalTask.command}
            </code>
            <Button
              size="sm"
              variant="secondary"
              icon={<Copy />}
              onClick={() => void copy(lesson.terminalTask?.command ?? '')}
              aria-label={t('lab.copyCommand')}
            >
              {t('lab.copyCommand')}
            </Button>
            <Button size="sm" variant="primary" icon={<Terminal />} onClick={openTerminal}>
              {t('lab.runInTerminal')}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mt-3 rounded-xl border border-surface-line bg-surface-soft/40 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-text-hi">{t('lab.questionPrompt')}</h3>
          <span className="text-[10px] text-text-low">
            {t('lab.question', { current: questionIndex + 1, total })}
          </span>
        </div>

        {question ? (
          <div className="mt-2">
            <p className="text-xs font-medium leading-relaxed text-text-hi">
              {localized(question.prompt, lang)}
            </p>
            <div className="mt-2 space-y-1.5">
              {question.options.map((option, index) => {
                const isChoice = choice === index;
                const isCorrect = question.correct === index;
                const showState = checked;
                return (
                  <label
                    key={option.en}
                    className={[
                      'flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-[11.5px] leading-relaxed transition-colors',
                      showState && isCorrect
                        ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                        : showState && isChoice && !isCorrect
                          ? 'border-rose-400/50 bg-rose-500/10 text-rose-200'
                          : isChoice
                            ? 'border-accent/50 bg-accent/10 text-text-hi'
                            : 'border-surface-line bg-ink-0/25 text-text-mid hover:bg-surface-soft',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name={`quiz-${lesson.id}-${question.id}`}
                      checked={isChoice}
                      disabled={checked}
                      onChange={() => {
                        setChoice(index);
                        setChecked(false);
                      }}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[rgb(var(--accent))]"
                    />
                    <span>{localized(option, lang)}</span>
                  </label>
                );
              })}
            </div>

            {checked && question ? (
              <div
                role="status"
                className={[
                  'mt-2 rounded-lg border px-3 py-2 text-[11.5px] leading-relaxed',
                  results[question.id]
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                    : 'border-amber-400/30 bg-amber-400/10 text-amber-200',
                ].join(' ')}
              >
                <p className="font-semibold">
                  {results[question.id] ? t('lab.correct') : t('lab.incorrect')}
                </p>
                <p className="mt-0.5 text-text-mid">{localized(question.explanation, lang)}</p>
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={choice === null || checked}
                onClick={() => {
                  if (choice === null) return;
                  setChecked(true);
                  setResults((current) => ({
                    ...current,
                    [question.id]: choice === question.correct,
                  }));
                }}
              >
                {t('lab.check')}
              </Button>
              {checked ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (questionIndex + 1 >= total) {
                      const finalResults = { ...results };
                      const score = Object.values(finalResults).filter(Boolean).length;
                      onComplete(score, total);
                      setFinished(true);
                    } else {
                      setQuestionIndex((index) => index + 1);
                      setChoice(null);
                      setChecked(false);
                    }
                  }}
                >
                  {questionIndex + 1 >= total ? t('lab.finishLesson') : t('lab.nextQuestion')}
                </Button>
              ) : null}
              <span className="ml-auto text-[10px] text-text-low">
                {t('lab.quizHint')}
              </span>
            </div>
          </div>
        ) : (
          <EmptyState icon={FlaskConical} title={t('common.empty')} compact />
        )}
      </section>

      <p className="mt-4 pb-2 text-center text-[10px] text-text-low">{t('lab.lessonFooter')}</p>
    </div>
  );
}
