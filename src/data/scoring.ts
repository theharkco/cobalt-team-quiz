import type { MatchQuality } from './questionTypes';

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
