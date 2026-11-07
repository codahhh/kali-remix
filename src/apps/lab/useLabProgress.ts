import { useCallback, useEffect, useState } from 'react';

export interface LessonScore {
  score: number;
  total: number;
  at: number;
}

export type LabProgress = Record<string, LessonScore>;

export const LAB_PROGRESS_KEY = 'kaliwebos.lab.v1';

function sanitize(input: unknown): LabProgress {
  if (typeof input !== 'object' || input === null) return {};
  const result: LabProgress = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof key !== 'string' || key.length > 64) continue;
    if (typeof value !== 'object' || value === null) continue;
    const entry = value as Partial<LessonScore>;
    if (
      typeof entry.score === 'number' &&
      Number.isFinite(entry.score) &&
      typeof entry.total === 'number' &&
      Number.isFinite(entry.total) &&
      entry.total > 0 &&
      entry.score >= 0 &&
      entry.score <= entry.total
    ) {
      result[key] = {
        score: Math.round(entry.score),
        total: Math.round(entry.total),
        at: typeof entry.at === 'number' && Number.isFinite(entry.at) ? entry.at : Date.now(),
      };
    }
  }
  return result;
}

function load(): LabProgress {
  try {
    const raw = localStorage.getItem(LAB_PROGRESS_KEY);
    if (!raw) return {};
    return sanitize(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function useLabProgress(): {
  progress: LabProgress;
  completedCount: number;
  record: (lessonId: string, score: LessonScore) => void;
  reset: () => void;
} {
  const [progress, setProgress] = useState<LabProgress>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(LAB_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      /* best effort */
    }
  }, [progress]);

  const record = useCallback((lessonId: string, score: LessonScore) => {
    setProgress((current) => ({ ...current, [lessonId]: score }));
  }, []);

  const reset = useCallback(() => setProgress({}), []);

  return {
    progress,
    completedCount: Object.keys(progress).length,
    record,
    reset,
  };
}

/** Remove stored lab progress (used by Settings → Reset workspace). */
export function clearLabProgress(): void {
  try {
    localStorage.removeItem(LAB_PROGRESS_KEY);
  } catch {
    /* storage may be unavailable */
  }
}
