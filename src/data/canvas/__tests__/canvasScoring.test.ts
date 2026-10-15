import { describe, it, expect } from 'vitest';
import { teamPointsForTurn, turnBasePoints, guesserPointsForGuess, individualAwards, pickArtist, isCorrectGuess } from '../canvasScoring';
import { pickPrompt, ALL_PROMPTS } from '../promptBanks';

const pts = (awards: { playerId: string; points: number }[]) => Object.fromEntries(awards.map((a) => [a.playerId, a.points]));

describe('pass the pencil scoring', () => {
  it('team points by artist turn — earlier artists award the group more', () => {
    expect([1, 2, 3].map((turn) => teamPointsForTurn(turn))).toEqual([300, 200, 100]);
    expect([1, 2, 3].map((turn) => turnBasePoints(turn))).toEqual([300, 200, 100]);
  });

  it('team points are normalized — turn length does not scale the base', () => {
    expect([1, 2, 3].map((turn) => teamPointsForTurn(turn, 15))).toEqual([300, 200, 100]);
    expect([1, 2, 3].map((turn) => teamPointsForTurn(turn, 60))).toEqual([300, 200, 100]);
  });

  it('team points decay with time spent in the turn, floored at 20% of base', () => {
    const start = '2026-10-14T22:00:00Z';
    const at = (s: number) => new Date(Date.parse(start) + s * 1000).toISOString();
    expect(teamPointsForTurn(1, 30, start, start)).toBe(300);
    expect(teamPointsForTurn(1, 30, start, at(15))).toBe(180);
    expect(teamPointsForTurn(1, 30, start, at(30))).toBe(60);
    expect(teamPointsForTurn(1, 30, start, at(45))).toBe(60);
    expect(teamPointsForTurn(2, 30, start, at(15))).toBe(120);
    expect(teamPointsForTurn(3, 15, start, at(15))).toBe(20);
    // A slow turn-1 solve still beats an instant turn-2 solve.
    expect(teamPointsForTurn(1, 30, start, at(30))).toBeLessThan(teamPointsForTurn(2, 30, start, start));
  });

  it('guards invalid scoring inputs', () => {
    expect(teamPointsForTurn(0, 0)).toBe(300);
    expect(teamPointsForTurn(9, NaN)).toBe(100);
    expect(teamPointsForTurn(NaN, -1)).toBe(300);
    expect(teamPointsForTurn(1, 30, 'not-a-date', 'also-not')).toBe(300);
  });

  it('first artist success', () => {
    expect(pts(individualAwards(['a'], ['b', 'c']))).toEqual({ a: 100, b: 100, c: 100 });
  });

  it('third artist rescue pays contributors and the time-based drawer award', () => {
    expect(pts(individualAwards(['a', 'b', 'c'], ['d', 'e', 'a'], {}, 120))).toEqual({ a: 50, b: 50, c: 120, d: 100, e: 100 });
  });

  it('guesser points use the turn base and decay within the current turn only', () => {
    const start = '2026-10-14T22:00:00Z';
    const at = (s: number) => new Date(Date.parse(start) + s * 1000).toISOString();
    expect(guesserPointsForGuess(1, 30, start, start)).toBe(300);
    expect(guesserPointsForGuess(1, 30, start, at(15))).toBe(180);
    expect(guesserPointsForGuess(1, 30, start, at(30))).toBe(60);
    // Handoff resets the clock but lowers the base.
    expect(guesserPointsForGuess(2, 30, start, start)).toBe(200);
    expect(guesserPointsForGuess(3, 30, start, at(15))).toBe(60);
    // Missing timestamps fall back to the full base.
    expect(guesserPointsForGuess(1, 30, null, start)).toBe(300);
  });

  it('saved guesser awards match their immediate feedback, without rank or attempt penalties', () => {
    expect(pts(individualAwards(['a'], ['b', 'c', 'b'], { b: 85, c: 82 }))).toEqual({ a: 100, b: 85, c: 82 });
    expect(pts(individualAwards(['a'], ['c', 'b'], { b: 85, c: 82 }))).toEqual({ a: 100, b: 85, c: 82 });
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
