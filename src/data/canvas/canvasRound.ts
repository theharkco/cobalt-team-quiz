/** Keep drawing after a solve. Finish only when everyone has solved or the turn expires. */
export function roundAction(eligibleIds: string[], correctIds: string[], expired: boolean): 'continue' | 'success' | 'pass' {
  const correct = new Set(correctIds);
  if (correct.size > 0 && (expired || eligibleIds.every((id) => correct.has(id)))) return 'success';
  return expired ? 'pass' : 'continue';
}