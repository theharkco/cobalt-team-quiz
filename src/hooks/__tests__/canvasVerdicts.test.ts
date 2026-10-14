import { describe, expect, it } from 'vitest';
import { mergeGuesses } from '../useCanvasGame';
import type { CanvasGuess } from '@/types/canvas';

const guess: CanvasGuess = { id: 'g1', game_id: 'game', player_id: 'p1', masterpiece_index: 1, addition_index: 1, guess: 'cat', is_correct: false, points_earned: 0, created_at: '2026-10-14T22:00:00Z' };

describe('host-confirmed canvas verdicts', () => {
  it('never treats a pending database guess as incorrect', () => {
    expect(mergeGuesses([], [guess])[0].verdict).toBeUndefined();
  });
  it('preserves an immediate incorrect broadcast through database refresh', () => {
    expect(mergeGuesses([{ ...guess, verdict: 'incorrect' }], [guess])[0].verdict).toBe('incorrect');
  });
  it('preserves immediate correct feedback and points before persistence', () => {
    expect(mergeGuesses([{ ...guess, verdict: 'correct', is_correct: true, points_earned: 95 }], [guess])[0]).toMatchObject({ verdict: 'correct', is_correct: true, points_earned: 95 });
  });
  it('lets persisted correct results override an old rejection', () => {
    expect(mergeGuesses([{ ...guess, verdict: 'incorrect' }], [{ ...guess, is_correct: true }])[0].verdict).toBe('correct');
  });
});