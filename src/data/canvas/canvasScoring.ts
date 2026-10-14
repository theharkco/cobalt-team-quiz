export const TURN_SECONDS = 15;
export const MAX_ARTISTS = 3;
export const EXTRA_GUESS_WINDOW_MS = 2000;

/** Team points for a word guessed during artist turn 1, 2 or 3. */
export const teamPointsForTurn = (turn: number) => 100 * Math.min(MAX_ARTISTS, Math.max(1, turn));

export interface IndividualAward { playerId: string; points: number }

/**
 * Individual points for a guessed word.
 * roundArtists: artists in drawing order (last = active when guessed).
 * correctGuessers: ordered by guess time (first = fastest).
 */
export function individualAwards(roundArtists: string[], correctGuessers: string[]): IndividualAward[] {
  if (correctGuessers.length === 0 || roundArtists.length === 0) return [];
  const totals = new Map<string, number>();
  const add = (id: string, pts: number) => totals.set(id, (totals.get(id) ?? 0) + pts);
  const active = roundArtists[roundArtists.length - 1];
  roundArtists.slice(0, -1).forEach((id) => add(id, 50));
  add(active, 100 + (roundArtists.length >= MAX_ARTISTS ? 50 : 0));
  const artists = new Set(roundArtists);
  const seen = new Set<string>();
  correctGuessers.forEach((id) => {
    if (seen.has(id) || artists.has(id)) return;
    add(id, seen.size === 0 ? 100 : 40);
    seen.add(id);
  });
  return [...totals].map(([playerId, points]) => ({ playerId, points }));
}

export interface RotationPlayer { id: string; draw_count: number; created_at?: string }

/** Fewest draws first, random tie-break, never someone who already drew this word. */
export function pickArtist(players: RotationPlayer[], excludeIds: string[], rand: () => number = Math.random): string | null {
  const pool = players.filter((p) => !excludeIds.includes(p.id));
  if (pool.length === 0) return null;
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
const squash = (s: string) => s.replace(/ /g, '');

/** Tolerant guess matching: synonyms, plurals, spacing, small typos, or the answer inside a phrase. */
export function isCorrectGuess(guess: string, answer: string, alternates: string[] = []): boolean {
  const g = normalize(guess);
  if (!g) return false;
  const targets = [answer, ...alternates].map(normalize).filter(Boolean);
  for (const t of targets) {
    if (g === t || singular(g) === singular(t) || squash(g) === squash(t)) return true;
    const tolerance = t.length <= 4 ? 0 : t.length <= 7 ? 1 : 2;
    if (levenshtein(squash(g), squash(t)) <= tolerance) return true;
    if (!t.includes(' ') && g.split(' ').some((w) => w === t || singular(w) === singular(t) || (t.length > 4 && levenshtein(w, t) <= tolerance))) return true;
    if (t.includes(' ') && g.includes(t)) return true;
  }
  return false;
}
