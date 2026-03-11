import { supabase } from '../config/supabase';
import type { TestResult, Settings, SRCard } from '../types/index';
import { syncProfileStats } from './socialHelpers';
import { calcTotalXP, getLevel } from './xpHelpers';
import { calcStreak } from './adaptiveHelpers';
import { mergeSrCards } from './srEngine';

interface CloudData {
  hist: TestResult[];
  prof: string[];
  st: Settings;
  srCards?: SRCard[];
}

export async function cloudLoad(userId: string): Promise<CloudData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_data')
    .select('hist, prof, st')
    .eq('id', userId)
    .single();
  if (error && error.code === 'PGRST116') return null;
  if (error) { console.error('cloudLoad:', error); return null; }
  const raw = data as { hist: TestResult[]; prof: string[]; st: Settings & { srCards?: SRCard[] } };
  // Unpack srCards from st field
  const srCards = raw.st?.srCards || [];
  const st = { ...raw.st };
  delete (st as Record<string, unknown>).srCards;
  return { hist: raw.hist, prof: raw.prof, st, srCards };
}

export async function cloudSave(userId: string, { hist, prof, st, srCards }: CloudData): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'no supabase' };
  // Pack srCards into st field to avoid schema changes
  const stWithSr = srCards && srCards.length > 0 ? { ...st, srCards } : st;
  const { error } = await supabase
    .from('user_data')
    .upsert({ id: userId, hist, prof, st: stWithSr, updated_at: new Date().toISOString() });
  if (error) { console.error('cloudSave:', error); return { ok: false, error: error.message }; }

  // Also sync XP/level/streak/avatar to profiles table (fire-and-forget)
  try {
    const totalXP = calcTotalXP(hist);
    const { level } = getLevel(totalXP);
    const { current: streak } = calcStreak(hist);
    const avatarUrl = supabase ? (await supabase.auth.getUser()).data.user?.user_metadata?.avatar_url : undefined;
    syncProfileStats(userId, totalXP, level, streak, avatarUrl);
  } catch (e) { console.warn('cloudSave: profile stats sync failed', e); }

  return { ok: true };
}

export function mergeData(local: CloudData | null, cloud: CloudData | null): CloudData {
  if (!cloud) return local!;
  if (!local) return cloud;
  const allHist = [...(cloud.hist || []), ...(local.hist || [])];
  const seen = new Set<string>();
  const hist = allHist.filter(h => {
    const key = `${h.dt}_${h.su}_${h.sc}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  const prof = (cloud.prof?.length > 0) ? cloud.prof : (local.prof || []);
  const st = { ...(cloud.st || {}), ...(local.st || {}) } as Settings;
  if (!st.exp && st.exp !== false) st.exp = true;
  if (!st.tmr && st.tmr !== false) st.tmr = true;
  if (!st.shf && st.shf !== false) st.shf = true;
  const srCards = mergeSrCards(local.srCards || [], cloud.srCards || []);
  return { hist, prof, st, srCards };
}
