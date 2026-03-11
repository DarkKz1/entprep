import type { UserData, SRCard } from '../types/index';

const STORAGE_KEY = 'entprep_data';

function loadData(): UserData | null {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}

function saveData(d: UserData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return true;
  } catch (e) {
    console.warn('saveData: localStorage write failed (quota?)', e);
    return false;
  }
}

function loadSrCards(): SRCard[] {
  return loadData()?.srCards || [];
}

export { loadData, saveData, loadSrCards };
