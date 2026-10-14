import { describe, expect, it } from 'vitest';
import { worldDestination, worldRoster } from './contestantWorld';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';

const game = { masterpiece_index: 1, phase: 'drawing', current_artist_id: 'a', round_artist_ids: ['a'] } as CanvasGame;
const players = ['a', 'b', 'c'].map((id) => ({ id, name: id })) as CanvasPlayer[];
const guess = { id: 'g', player_id: 'b', masterpiece_index: 1, guess: 'secret', created_at: new Date(1000).toISOString(), is_correct: false } as CanvasGuess;
describe('contestant world', () => {
  it('keeps pending and correct guesses secret; only rejected text appears', () => {
    expect(worldRoster(game, players, [guess], 1100)[1].bubble).toBeUndefined();
    expect(worldRoster(game, players, [{ ...guess, verdict: 'incorrect' }], 1100)[1].bubble?.text).toBe('secret');
    const solved = worldRoster(game, players, [{ ...guess, is_correct: true }], 1100)[1];
    expect(solved.status).toBe('correct'); expect(solved.bubble).toBeUndefined();
  });
  it('expires bubbles and never brings a previous word into this world', () => {
    expect(worldRoster(game, players, [{ ...guess, verdict: 'incorrect' }], 6000)[1].bubble).toBeUndefined();
    expect(worldRoster(game, players, [{ ...guess, masterpiece_index: 0, is_correct: true }], 1100)[1].status).toBe('guessing');
  });
  it('roams the plaza but stays in the green zone after solving', () => {
    expect(worldDestination('guessing', 0, 3, 0)).not.toEqual(worldDestination('guessing', 0, 3, 3));
    expect(worldDestination('correct', 0, 3, 0)).toEqual(worldDestination('correct', 0, 3, 30));
    expect(worldDestination('correct', 0, 3, 0)[0]).toBeGreaterThan(4);
  });
});