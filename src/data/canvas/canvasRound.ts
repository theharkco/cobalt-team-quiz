/**
 * Keep drawing after a solve. Finish early only when everyone has solved.
 * At the artist timeout the word ends only if more than half of the guessers solved
 * (or on the last artist with at least one solver); otherwise the pencil passes.
 */
export function roundAction(
  eligibleIds: string[], correctIds: string[], expired: boolean, turn = 1, maxTurns = 3,
): 'continue' | 'success' | 'pass' {
  const correct = new Set(correctIds);
  const solved = eligibleIds.filter((id) => correct.has(id)).length;
  if (correct.size > 0 && eligibleIds.every((id) => correct.has(id))) return 'success';
  if (!expired) return 'continue';
  if (solved * 2 > eligibleIds.length) return 'success';
  if (turn >= maxTurns && correct.size > 0) return 'success';
  return 'pass';
}
