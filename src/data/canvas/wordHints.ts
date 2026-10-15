export interface WordHint { round: number; mask: string }

/** Only the host calls this; clients receive the resulting mask, never the hidden letters. */
export function maskedWordHint(answer: string, turn: number, elapsed: number, seconds: number): string {
  const chars = Array.from(answer);
  const letters = chars.map((char, index) => ({ char, index })).filter(({ char }) => /[\p{L}\p{N}]/u.test(char));
  const progress = Math.min(1, Math.max(0, elapsed / Math.max(1, seconds)));
  const stage = Math.min(12, Math.max(0, (turn - 1) * 4 + Math.floor(progress * 4)));
  const count = Math.min(Math.floor(letters.length * 0.6), Math.floor(letters.length * stage / 20));
  // Stable, scattered reveals: handoffs never hide letters already shown.
  const seed = chars.reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);
  const ordered = [...letters].sort((a, b) => ((a.index * 37 + seed) % 101) - ((b.index * 37 + seed) % 101));
  const visible = new Set(ordered.slice(0, count).map(({ index }) => index));
  return chars.map((char, index) => /[\p{L}\p{N}]/u.test(char) && !visible.has(index) ? '_' : char).join('');
}