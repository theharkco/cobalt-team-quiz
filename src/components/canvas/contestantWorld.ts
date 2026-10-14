import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';

export type ContestantStatus = 'drawing' | 'artist' | 'correct' | 'guessing';
export interface WorldContestant {
  id: string;
  name: string;
  status: ContestantStatus;
  bubble?: { id: string; text: string };
  isMe: boolean;
}

/** Never expose pending guesses: the host may still confirm that they contain the answer. */
export function worldRoster(game: CanvasGame, players: CanvasPlayer[], guesses: CanvasGuess[], now: number, meId?: string): WorldContestant[] {
  const round = guesses.filter((g) => g.masterpiece_index === game.masterpiece_index);
  const active = game.phase === 'drawing' || game.phase === 'grace';
  return players.map((p) => {
    const correct = round.some((g) => g.player_id === p.id && g.is_correct);
    const status = correct ? 'correct' : active && p.id === game.current_artist_id ? 'drawing' : game.round_artist_ids.includes(p.id) ? 'artist' : 'guessing';
    const last = round.filter((g) => g.player_id === p.id).at(-1);
    const bubble = status === 'guessing' && last?.verdict === 'incorrect' && now - Date.parse(last.created_at) < 4500
      ? { id: last.id, text: last.guess } : undefined;
    return { id: p.id, name: p.name, status, bubble, isMe: p.id === meId };
  });
}

/** Fixed slots keep labels separated; small local patrols make the plaza feel alive. */
export function worldDestination(status: ContestantStatus, slot: number, count: number, time: number): [number, number, number] {
  if (status === 'drawing') return [-6.1, 0.12, 0];
  const columns = status === 'correct' ? Math.min(3, Math.max(1, Math.ceil(Math.sqrt(count / 2)))) : Math.min(5, Math.max(2, Math.ceil(Math.sqrt(count))));
  const rows = Math.ceil(count / columns);
  const x = status === 'correct' ? 5.5 + (slot % columns - (columns - 1) / 2) * 1.05 : -0.9 + (slot % columns - (columns - 1) / 2) * 1.65;
  const z = (Math.floor(slot / columns) - (rows - 1) / 2) * Math.min(2, 9 / Math.max(1, rows));
  if (status === 'correct' || status === 'artist') return [x, 0.08, z];
  return [x + Math.sin(time * 0.7 + slot * 2.4) * 0.48, 0.08, z + Math.cos(time * 0.6 + slot * 1.8) * 0.48];
}