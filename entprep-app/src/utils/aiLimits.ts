// AI usage daily limits (stored in localStorage)
// Free users: 3 AI explanations per day, 1 AI plan total

const STORAGE_KEY = 'entprep_ai_usage';

interface AIUsage {
  explainCount: number;
  explainDate: string; // YYYY-MM-DD
  planGenerated: boolean;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function load(): AIUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { explainCount: 0, explainDate: today(), planGenerated: false };
    return JSON.parse(raw);
  } catch {
    return { explainCount: 0, explainDate: today(), planGenerated: false };
  }
}

function save(usage: AIUsage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

const DAILY_EXPLAIN_LIMIT = 3;

export function getExplainRemaining(): number {
  const usage = load();
  if (usage.explainDate !== today()) return DAILY_EXPLAIN_LIMIT;
  return Math.max(0, DAILY_EXPLAIN_LIMIT - usage.explainCount);
}

export function useExplain(): boolean {
  const usage = load();
  // Reset if new day
  if (usage.explainDate !== today()) {
    usage.explainCount = 0;
    usage.explainDate = today();
  }
  if (usage.explainCount >= DAILY_EXPLAIN_LIMIT) return false;
  usage.explainCount++;
  save(usage);
  return true;
}

export function canGeneratePlan(): boolean {
  const usage = load();
  return !usage.planGenerated;
}

export function usePlan(): boolean {
  const usage = load();
  if (usage.planGenerated) return false;
  usage.planGenerated = true;
  save(usage);
  return true;
}
