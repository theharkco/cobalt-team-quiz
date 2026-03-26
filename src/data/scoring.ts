import type { MatchQuality } from './questionTypes';

/**
 * Score for select-wrong: points scale with how many wrong answers found.
 * All-or-nothing bonus: finding ALL wrong answers gives a big bonus.
 */
export function calculateSelectWrongScore(
  wrongFoundCount: number,
  totalWrongCount: number,
  timeTakenMs: number
): number {
  if (wrongFoundCount === 0 || totalWrongCount === 0) return 0;

  const perWrongPoints = 200;
  const basePoints = wrongFoundCount * perWrongPoints;

  // All-or-nothing bonus: 500 extra points if you found ALL wrong answers
  const allFoundBonus = wrongFoundCount === totalWrongCount ? 500 : 0;

  // Speed bonus (only if all found)
  let speedBonus = 0;
  if (wrongFoundCount === totalWrongCount && timeTakenMs <= 5000) {
    speedBonus = Math.round(300 * (1 - timeTakenMs / 5000));
  }

  return basePoints + allFoundBonus + speedBonus;
}

export function calculateScore(match: MatchQuality, timeTakenMs: number): number {
  if (match === 'none') return 0;
  const basePoints = match === 'exact' ? 1000 : 600;
  const maxBonus = match === 'exact' ? 500 : 200;
  const bonusWindow = 3000;
  const totalTime = 15000;

  if (timeTakenMs <= bonusWindow) {
    const bonus = Math.round(maxBonus * (1 - timeTakenMs / bonusWindow));
    return basePoints + bonus;
  }
  const remaining = totalTime - bonusWindow;
  const elapsed = timeTakenMs - bonusWindow;
  const minPoints = match === 'exact' ? 500 : 300;
  const penalty = Math.round((basePoints - minPoints) * (elapsed / remaining));
  return Math.max(minPoints, basePoints - penalty);
}
