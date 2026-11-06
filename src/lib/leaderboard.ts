import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAccount } from './account';

export interface LeaderRow {
  rank: number;
  name: string;
  value: number;
  isMe: boolean;
}

export interface Leaderboard {
  points: LeaderRow[];
  streaks: LeaderRow[];
}

function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const cache = new Map<string, { at: number; data: Leaderboard }>();
const TTL = 60_000;

/** Today's top scores and streaks from the account database. Null while loading or when accounts are off. */
export async function fetchLeaderboard(top = 5): Promise<Leaderboard | null> {
  if (!supabase) return null;
  const key = `${localDay()}:${top}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const { data, error } = await supabase.rpc('leaderboard', { day: localDay(), top });
  // Until the database has the leaderboard (or if it is briefly unreachable) show an empty board, not a broken one.
  if (error || !Array.isArray(data)) return { points: [], streaks: [] };
  const rows = data as { kind: string; rank: number; name: string; value: number; is_me: boolean }[];
  const map = (k: string) => rows.filter((r) => r.kind === k).map((r) => ({ rank: r.rank, name: r.name, value: r.value, isMe: r.is_me }));
  const board = { points: map('points'), streaks: map('streak') };
  cache.set(key, { at: Date.now(), data: board });
  return board;
}

/**
 * Undefined while loading, null when it cannot be loaded (accounts off or the database has no leaderboard).
 * Refetches when the visitor signs in/out or earns points (pass a changing `refresh` value).
 */
export function useLeaderboard(top = 5, refresh: unknown = 0): Leaderboard | null | undefined {
  const { email } = useAccount();
  const [board, setBoard] = useState<Leaderboard | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    cache.clear();
    void fetchLeaderboard(top).then((b) => live && setBoard(b));
    return () => {
      live = false;
    };
  }, [top, email, refresh]);
  return board;
}

/** The visitor's nickname for the leaderboard. */
export async function loadNickname(): Promise<{ nickname: string | null; hidden: boolean }> {
  if (!supabase) return { nickname: null, hidden: false };
  const { data } = await supabase.from('profiles').select('nickname, hide_from_leaderboard').maybeSingle();
  return { nickname: (data?.nickname as string | null) ?? null, hidden: Boolean(data?.hide_from_leaderboard) };
}

export async function saveNickname(nickname: string, hidden: boolean): Promise<string | null> {
  if (!supabase) return 'Accounts are off.';
  const userId = (await supabase.auth.getSession()).data.session?.user.id;
  if (!userId) return 'Log in first.';
  const nick = nickname.trim();
  if (nick && !/^[A-Za-z0-9 _.-]{2,24}$/.test(nick)) return 'Use 2 to 24 letters, numbers, spaces, dots, dashes or underscores.';
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, nickname: nick || null, hide_from_leaderboard: hidden, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return error.code === '23505' ? 'That nickname is taken.' : 'Could not save. Try again.';
  cache.clear();
  return null;
}
