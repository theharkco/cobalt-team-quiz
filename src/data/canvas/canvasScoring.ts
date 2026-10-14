export const ADDITION_SECONDS = 35;
export const QUICK_GUESS_MS = 15_000;
export const EXTRA_GUESS_WINDOW_MS = 2500;

export const teamPointsForAddition = (addition: number) => 100 * Math.max(1, addition);

export interface IndividualAward { playerId: string; points: number }

/**
 * Individual points for a successful addition.
 * correctGuessers must be ordered by guess time (first = fastest).
 */
export function individualAwards(artistId: string, correctGuessers: string[], firstGuessElapsedMs: number): IndividualAward[] {
  const out: IndividualAward[] = [];
  if (correctGuessers.length === 0) return out;
  out.push({ playerId: artistId, points: 100 + (firstGuessElapsedMs <= QUICK_GUESS_MS ? 50 : 0) });
  const seen = new Set<string>();
  correctGuessers.forEach((id, i) => {
    if (seen.has(id) || id === artistId) return;
    seen.add(id);
    out.push({ playerId: id, points: i === 0 ? 100 : 30 });
  });
  return out;
}

export interface RotationPlayer { id: string; draw_count: number; created_at?: string }

/** Fewest draws first; never repeat the previous artist if anyone else is available. */
export function pickArtist(players: RotationPlayer[], lastArtistId: string | null, rand: () => number = Math.random): string | null {
  if (players.length === 0) return null;
  const pool = players.length > 1 ? players.filter((p) => p.id !== lastArtistId) : players;
  const min = Math.min(...pool.map((p) => p.draw_count));
  const candidates = pool.filter((p) => p.draw_count === min);
  return candidates[Math.floor(rand() * candidates.length)].id;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const t = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = t;
    }
  }
  return dp[n];
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\b(a|an|the)\b/g, ' ').replace(/\s+/g, ' ').trim();

const singular = (s: string) => s.replace(/(es|s)$/, '');

/** Tolerant guess matching: alternates, plurals, small typos, or the answer word inside a phrase. */
export function isCorrectGuess(guess: string, answer: string, alternates: string[] = []): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const targets = [answer, ...alternates].map(normalize).filter(Boolean);
  for (const t of targets) {
    if (g === t || singular(g) === singular(t)) return true;
    const tolerance = t.length <= 4 ? 0 : t.length <= 7 ? 1 : 2;
    if (levenshtein(g, t) <= tolerance) return true;
    if (g.split(' ').some((w) => w === t || singular(w) === singular(t) || (t.length > 4 && levenshtein(w, t) <= tolerance))) return true;
  }
  return false;
}
