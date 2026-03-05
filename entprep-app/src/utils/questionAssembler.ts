import type { Question, ProfileBlock } from '../types/index';
import { getPool } from './questionStore';
import { shuffleArray } from './questionHelpers';
import { shuffleOptions } from './questionHelpers';

/**
 * Assemble a 40-question profile section for ENT exam mode.
 * Pulls questions from the pool, filtering by type/block, and arranges them
 * in the correct block order: 25 single + 5 context + 5 multiple + 5 matching.
 *
 * Falls back gracefully: if not enough questions of a specific type exist,
 * fills remaining slots with single-choice questions.
 */
export async function assembleProfileSection(
  sid: string,
  blocks: ProfileBlock[],
  shuffle: boolean = true,
  lang?: 'ru' | 'kk',
): Promise<Question[]> {
  const pool = await getPool(sid, lang);
  if (!pool || pool.length === 0) return [];

  const result: Question[] = [];

  for (const block of blocks) {
    const { count, questionType } = block;

    // Filter pool by question type or block field
    let candidates: Question[];
    if (questionType === 'single' && block.key === 'context') {
      // Context block: look for questions with block='context' or those with passages
      candidates = pool.filter(q =>
        q.block === 'context' || (q.pt && q.px)
      );
    } else {
      candidates = pool.filter(q => {
        const qt = q.type || 'single';
        return qt === questionType;
      });
    }

    // Shuffle and pick
    const picked = shuffle
      ? shuffleArray(candidates).slice(0, count)
      : candidates.slice(0, count);

    // If not enough questions of this type, fill with single-choice
    if (picked.length < count) {
      const usedOis = new Set([...result.map(q => q._oi), ...picked.map(q => q._oi)]);
      const fillers = pool
        .filter(q => !usedOis.has(q._oi) && (q.type || 'single') === 'single')
        .slice(0, count - picked.length);
      picked.push(...fillers);
    }

    // Shuffle options and add to result
    const processed = shuffle
      ? picked.map(q => shuffleOptions(q))
      : picked.map(q => ({ ...q, o: [...q.o] }));

    result.push(...processed);
  }

  return result;
}

/**
 * Get the block info for a question at a given index within a profile section.
 */
export function getBlockForIndex(
  index: number,
  blocks: ProfileBlock[],
): ProfileBlock | null {
  for (const block of blocks) {
    if (index >= block.range[0] && index <= block.range[1]) {
      return block;
    }
  }
  return null;
}
