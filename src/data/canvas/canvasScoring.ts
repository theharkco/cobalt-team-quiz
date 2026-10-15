export const TURN_SECONDS = 30;
export const PEN_COLORS = ['#1f2937', '#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#8b5cf6', '#ec4899', '#92400e', '#9ca3af'];
export const PEN_WIDTHS = [{ label: 'Thin', value: 0.004 }, { label: 'Medium', value: 0.007 }, { label: 'Thick', value: 0.014 }];
export const MAX_ARTISTS = 3;
export const EXTRA_GUESS_WINDOW_MS = 2000;

/** Base award per artist turn: earlier artists are worth more (300/200/100). Normalized — turn length does not scale it. */
export const turnBasePoints = (turn: number) => {
  const artist = Number.isFinite(turn) ? Math.min(MAX_ARTISTS, Math.max(1, Math.floor(turn))) : 1;
  return 100 * (MAX_ARTISTS - artist + 1);
};

/** Linear decay from base to 20% of base across the turn's seconds. */
const decay = (base: number, elapsedSeconds: number, turnSeconds: number) => {
  const seconds = Number.isFinite(turnSeconds) && turnSeconds > 0 ? turnSeconds : TURN_SECONDS;
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const progress = Math.min(1, elapsed / seconds);
  return Math.round(base * (1 - 0.8 * progress));
};

const elapsedInTurn = (turnStartedAt: string | null | undefined, at: string | null | undefined): number | null => {
  const start = turnStartedAt ? Date.parse(turnStartedAt) : NaN;
  const end = at ? Date.parse(at) : NaN;
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, (end - start) / 1000) : null;
};

/**
 * Group award for a solved word: 300/200/100 by artist turn, decaying with the
 * time spent in that turn. Without timestamps (previews) returns the base value.
 * The drawing artist earns the same amount as a personal award.
 */
export const teamPointsForTurn = (turn: number, seconds = TURN_SECONDS, turnStartedAt?: string | null, solvedAt?: string | null) => {
  const base = turnBasePoints(turn);
  const elapsed = elapsedInTurn(turnStartedAt, solvedAt);
  return elapsed === null ? base : decay(base, elapsed, seconds);
};

export interface IndividualAward { playerId: string; points: number }

/** Guesser points: the turn's base (300/200/100), decaying with time spent in the current turn only — handoffs reset the clock but lower the base. */
export function guesserPointsForGuess(turn: number, turnSeconds: number, turnStartedAt: string | null, guessedAt: string): number {
  const base = turnBasePoints(turn);
  const elapsed = elapsedInTurn(turnStartedAt, guessedAt) ?? 0;
  return decay(base, elapsed, turnSeconds);
}

/**
 * Individual points for a guessed word.
 * roundArtists: artists in drawing order (last = active when guessed).
 * correctGuessers: ordered by guess time (first = fastest).
 */
export function individualAwards(roundArtists: string[], correctGuessers: string[], guesserPoints: Record<string, number> = {}, drawerPoints?: number): IndividualAward[] {
  if (correctGuessers.length === 0 || roundArtists.length === 0) return [];
  const totals = new Map<string, number>();
  const add = (id: string, pts: number) => totals.set(id, (totals.get(id) ?? 0) + pts);
  const active = roundArtists[roundArtists.length - 1];
  roundArtists.slice(0, -1).forEach((id) => add(id, 50));
  add(active, drawerPoints ?? 100);
  const artists = new Set(roundArtists);
  const seen = new Set<string>();
  correctGuessers.forEach((id) => {
    if (seen.has(id) || artists.has(id)) return;
    add(id, guesserPoints[id] ?? 100);
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

export type GuessVerdict = 'correct' | 'very-close' | 'close' | 'incorrect';

/** Host-only spelling/partial-phrase feedback; not a semantic similarity or points score. */
export function evaluateGuessVerdict(guess: string, answer: string, alternates: string[] = []): GuessVerdict {
  if (isCorrectGuess(guess, answer, alternates)) return 'correct';
  const g = normalize(guess);
  if (g.length < 3) return 'incorrect';
  const targets = [answer, ...alternates].map(normalize).filter(Boolean);
  let best = 0;
  for (const t of targets) {
    const sG = squash(g);
    const sT = squash(t);
    best = Math.max(best, 1 - levenshtein(sG, sT) / Math.max(sG.length, sT.length));
    const words = g.split(' ');
    const targetWords = t.split(' ');
    // Whole meaningful words: "ship" is close to "pirate ship", "hip" isn't.
    if (targetWords.length > 1 && words.every((word) => word.length >= 3 && targetWords.includes(word))) {
      best = Math.max(best, words.length / targetWords.length >= 0.66 ? 0.85 : 0.7);
    }
  }
  return best >= 0.82 ? 'very-close' : best >= 0.65 ? 'close' : 'incorrect';
}
