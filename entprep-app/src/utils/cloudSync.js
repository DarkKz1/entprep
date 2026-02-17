import { supabase } from '../config/supabase.js';

// Load user data from Supabase
export async function cloudLoad(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_data')
    .select('hist, prof, st')
    .eq('id', userId)
    .single();
  if (error && error.code === 'PGRST116') return null; // no row found
  if (error) { console.error('cloudLoad:', error); return null; }
  return data;
}

// Save user data to Supabase (upsert)
export async function cloudSave(userId, { hist, prof, st }) {
  if (!supabase) return;
  const { error } = await supabase
    .from('user_data')
    .upsert({ id: userId, hist, prof, st, updated_at: new Date().toISOString() });
  if (error) console.error('cloudSave:', error);
}

// Merge local + cloud data on first login
export function mergeData(local, cloud) {
  if (!cloud) return local;
  if (!local) return cloud;
  // hist: combine, deduplicate by dt+su+sc key
  const allHist = [...(cloud.hist || []), ...(local.hist || [])];
  const seen = new Set();
  const hist = allHist.filter(h => {
    const key = `${h.dt}_${h.su}_${h.sc}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  // prof: cloud takes priority (if present)
  const prof = (cloud.prof?.length > 0) ? cloud.prof : (local.prof || []);
  // st: cloud takes priority
  const st = cloud.st || local.st || { exp: true, tmr: true, shf: true };
  return { hist, prof, st };
}
