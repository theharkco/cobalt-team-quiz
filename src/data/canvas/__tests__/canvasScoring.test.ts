import { describe, it, expect } from 'vitest';
import { teamPointsForAddition, individualAwards, pickArtist, isCorrectGuess } from '../canvasScoring';
import { pickPrompt, bankForAddition, SUBJECTS, EXTRAS } from '../promptBanks';

describe('canvas scoring', () => {
  it('team points scale with addition number', () => {
    expect([1, 2, 5].map(teamPointsForAddition)).toEqual([100, 200, 500]);
  });

  it('awards artist, first and other guessers', () => {
    expect(individualAwards('a', ['b', 'c', 'd'], 10_000)).toEqual([
      { playerId: 'a', points: 150 }, { playerId: 'b', points: 100 },
      { playerId: 'c', points: 30 }, { playerId: 'd', points: 30 },
    ]);
    expect(individualAwards('a', ['b'], 20_000)[0].points).toBe(100);
    expect(individualAwards('a', [], 1000)).toEqual([]);
  });

  it('picks fewest-drawn artist and avoids repeats', () => {
    const players = [{ id: 'a', draw_count: 0 }, { id: 'b', draw_count: 1 }, { id: 'c', draw_count: 0 }];
    expect(pickArtist(players, 'a', () => 0)).toBe('c');
    expect(pickArtist([{ id: 'a', draw_count: 3 }], 'a')).toBe('a');
    expect(pickArtist([], null)).toBeNull();
  });

  it('accepts reasonable guess variations', () => {
    expect(isCorrectGuess('Giraffe', 'giraffe')).toBe(true);
    expect(isCorrectGuess('girafe', 'giraffe')).toBe(true);
    expect(isCorrectGuess('a bike', 'bicycle', ['bike'])).toBe(true);
    expect(isCorrectGuess('chicken', 'chickens')).toBe(true);
    expect(isCorrectGuess('it is a shark!', 'shark')).toBe(true);
    expect(isCorrectGuess('cat', 'car')).toBe(false);
    expect(isCorrectGuess('', 'cat')).toBe(false);
  });

  it('prompt banks follow the scene structure', () => {
    expect(bankForAddition(1)).toBe(SUBJECTS);
    expect(bankForAddition(9)).toBe(EXTRAS);
    const pr = pickPrompt(1, ['giraffe'], () => 0);
    expect(pr.answer).not.toBe('giraffe');
  });
});
