// Keeps the learner's progress in their account, so it follows them to every device.
// Local storage stays the source the app reads from; this module copies it to and from Supabase.
import { supabase } from './supabase';
import { bumpProgress, onSession } from './account';
import { emptySnapshot, mergeProgress, sameProgress } from './progressMerge';
import type { PointsLog, ProgressSnapshot } from './progressMerge';

const PREFIX = 'biex:';
const PL300_KEY = 'pbx:pl300';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function localSnapshot(): ProgressSnapshot {
  const snap = emptySnapshot();
  snap.completed = readJSON<string[]>(PREFIX + 'completed', []);
  snap.points = readJSON<PointsLog>(PREFIX + 'points', { awarded: {}, days: {} });
  snap.pl300 = readJSON<Record<string, number>>(PL300_KEY, {});
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX + 'work:')) snap.work[k.slice((PREFIX + 'work:').length)] = readJSON(k, null);
    }
  } catch {
    /* storage unavailable */
  }
  return snap;
}

function applyLocal(s: ProgressSnapshot): void {
  try {
    localStorage.setItem(PREFIX + 'completed', JSON.stringify(s.completed));
    localStorage.setItem(PREFIX + 'points', JSON.stringify(s.points));
    localStorage.setItem(PL300_KEY, JSON.stringify(s.pl300));
    for (const [id, w] of Object.entries(s.work)) if (w != null) localStorage.setItem(PREFIX + 'work:' + id, JSON.stringify(w));
  } catch {
    /* storage full or blocked: the account copy still has everything */
  }
}

let userId: string | null = null;
let lastPushed: ProgressSnapshot | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

async function push(): Promise<void> {
  if (!supabase || !userId) return;
  const snap = localSnapshot();
  if (lastPushed && sameProgress(snap, lastPushed)) return;
  const { error } = await supabase.from('progress').upsert({ user_id: userId, data: snap, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (!error) lastPushed = snap;
}

/** Call after any progress change; saves to the account a moment later (batched). */
export function progressChanged(): void {
  if (!userId) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void push(), 1500);
}

async function pullAndMerge(id: string): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.from('progress').select('data').eq('user_id', id).maybeSingle();
  if (error) return;
  const local = localSnapshot();
  const merged = mergeProgress(local, (data?.data as Partial<ProgressSnapshot> | undefined) ?? null);
  if (!sameProgress(merged, local)) {
    applyLocal(merged);
    bumpProgress();
  }
  await push();
}

onSession((id) => {
  if (id === userId) return;
  userId = id;
  lastPushed = null;
  if (id) void pullAndMerge(id);
});

// Last chance to save when the tab is hidden or closed.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && userId) void push();
  });
}
