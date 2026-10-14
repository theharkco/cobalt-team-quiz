import { describe, expect, it } from 'vitest';
import { roundAction } from '../canvasRound';
import { guesserPointsForGuess, individualAwards } from '../canvasScoring';

describe('everyone can solve the word', () => {
  it('does not close the word after the first correct guess or a two-second delay', () => {
    expect(roundAction(['b', 'c'], ['b'], false)).toBe('continue');
    expect(roundAction(['b', 'c'], ['b'], false)).toBe('continue');
    expect(roundAction(['b', 'c'], ['b', 'c'], false)).toBe('success');
  });
  it('finishes successfully at the artist timeout if anyone solved, otherwise passes', () => {
    expect(roundAction(['b', 'c'], ['b'], true)).toBe('success');
    expect(roundAction(['b', 'c'], [], true)).toBe('pass');
  });
  it('awards later guessers their own elapsed-time points exactly once', () => {
    const start = '2026-10-14T22:00:00Z';
    const b = guesserPointsForGuess(1, 30, start, '2026-10-14T22:00:03Z');
    const c = guesserPointsForGuess(1, 30, start, '2026-10-14T22:00:20Z');
    expect(b).toBeGreaterThan(c);
    expect(individualAwards(['a'], ['b', 'c', 'b'], { b, c })).toEqual([
      { playerId: 'a', points: 100 }, { playerId: 'b', points: b }, { playerId: 'c', points: c },
    ]);
  });
});