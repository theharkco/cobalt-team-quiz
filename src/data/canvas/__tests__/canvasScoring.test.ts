import { describe, it, expect } from 'vitest';
import { teamPointsForTurn, individualAwards, pickArtist, isCorrectGuess } from '../canvasScoring';
import { pickPrompt, ALL_PROMPTS } from '../promptBanks';

const pts = (awards: { playerId: string; points: number }[]) => Object.fromEntries(awards.map((a) => [a.playerId, a.points]));

describe('pass the pencil scoring', () => {
  it('team points by artist turn', () => {
    expect([1, 2, 3].map((turn) => teamPointsForTurn(turn))).toEqual([100, 200, 300]);
  });

  it('scales team points with turn duration and rounds to integers', () => {
    expect([1, 2, 3].map((turn) => teamPointsForTurn(turn, 15))).toEqual([200, 400, 600]);
    expect([1, 2, 3].map((turn) => teamPointsForTurn(turn, 60))).toEqual([50, 100, 150]);
    expect([1, 2, 3].map((turn) => teamPointsForTurn(turn, 45))).toEqual([67, 133, 200]);
    for (let seconds = 10; seconds <= 90; seconds += 5) {
      expect(teamPointsForTurn(2, seconds)).toBeGreaterThan(teamPointsForTurn(1, seconds));
      expect(teamPointsForTurn(3, seconds)).toBeGreaterThan(teamPointsForTurn(2, seconds));
    }
  });

  it('guards invalid scoring inputs', () => {
    expect(teamPointsForTurn(0, 0)).toBe(100);
    expect(teamPointsForTurn(9, NaN)).toBe(300);
    expect(teamPointsForTurn(NaN, -1)).toBe(100);
  });

  it('first artist success', () => {
    expect(pts(individualAwards(['a'], ['b', 'c']))).toEqual({ a: 100, b: 100, c: 40 });
  });

  it('third artist rescue pays contributors and bonus', () => {
    expect(pts(individualAwards(['a', 'b', 'c'], ['d', 'e', 'a']))).toEqual({ a: 50, b: 50, c: 150, d: 100, e: 40 });
  });

  it('no guess, no points', () => {
    expect(individualAwards(['a', 'b'], [])).toEqual([]);
  });

  it('rotation: fewest draws, never repeats within the word', () => {
    const players = [{ id: 'a', draw_count: 0 }, { id: 'b', draw_count: 1 }, { id: 'c', draw_count: 0 }];
    expect(pickArtist(players, ['a'], () => 0)).toBe('c');
    expect(pickArtist(players, ['a', 'c'])).toBe('b');
    expect(pickArtist(players, ['a', 'b', 'c'])).toBeNull();
  });

  it('accepts reasonable guess variations', () => {
    expect(isCorrectGuess('Helicoptr', 'helicopter')).toBe(true);
    expect(isCorrectGuess('a bike', 'bicycle', ['bike'])).toBe(true);
    expect(isCorrectGuess('rollercoaster', 'roller coaster')).toBe(true);
    expect(isCorrectGuess('cat', 'car')).toBe(false);
  });

  it('prompts do not repeat', () => {
    const p = pickPrompt(ALL_PROMPTS.slice(1).map((x) => x.answer));
    expect(p.answer).toBe(ALL_PROMPTS[0].answer);
    expect(ALL_PROMPTS.length).toBeGreaterThanOrEqual(140);
  });
});
