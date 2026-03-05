import type { UserData } from '../types/index';

const STORAGE_KEY = 'entprep_data';

function loadData(): UserData | null {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

function saveData(d: UserData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {}
}

export { loadData, saveData };
