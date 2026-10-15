import { describe, expect, it } from 'vitest';
import { evaluateGuessVerdict } from '../canvasScoring';

describe('near-miss hints', () => {
  it('keeps accepted answers and typos correct', () => {
    expect(evaluateGuessVerdict('pirate ship', 'pirate ship')).toBe('correct');
    expect(evaluateGuessVerdict('pirat ship', 'pirate ship')).toBe('correct');
    expect(evaluateGuessVerdict('sofa', 'couch', ['sofa'])).toBe('correct');
  });
  it('recognizes partial phrases and progressively closer spelling', () => {
    expect(evaluateGuessVerdict('ship', 'pirate ship')).toBe('close');
    expect(evaluateGuessVerdict('red fire', 'red fire engine')).toBe('very-close');
    expect(evaluateGuessVerdict('elxxxant', 'elephant')).toBe('incorrect');
    expect(evaluateGuessVerdict('fire xxxine', 'fire engine')).toBe('close');
    expect(evaluateGuessVerdict('xxxx extinguisher', 'fire extinguisher')).toBe('close');
    expect(evaluateGuessVerdict('xxxestinguisher', 'fire extinguisher')).toBe('very-close');
  });
  it('does not encourage tiny fragments or unrelated guesses', () => {
    expect(evaluateGuessVerdict('c', 'cat')).toBe('incorrect');
    expect(evaluateGuessVerdict('hip', 'pirate ship')).toBe('incorrect');
    expect(evaluateGuessVerdict('banana', 'pirate ship')).toBe('incorrect');
  });
});