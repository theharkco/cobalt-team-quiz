import { describe, expect, it } from 'vitest';
import { ALL_PROMPTS, EASY, MEDIUM, HARD, pickPrompt } from '../promptBanks';

describe('amateur-friendly drawing words', () => {
  it('keeps a varied, unique bank without abstract or single-shape prompts', () => {
    expect(ALL_PROMPTS.length).toBeGreaterThan(140);
    expect(new Set(ALL_PROMPTS.map((p) => p.answer)).size).toBe(ALL_PROMPTS.length);
    const removed = ['global warming', 'deadline', 'out of office', 'jet lag', 'speed dating', 'job interview', 'monday morning', 'brain freeze', 'black hole', 'time machine', 'underwater city', 'heart', 'star', 'sun', 'cloud'];
    for (const word of removed) expect(ALL_PROMPTS.some((p) => p.answer === word)).toBe(false);
    expect(ALL_PROMPTS.every((p) => p.text && p.answer)).toBe(true);
  });
  it('weights words 10% easy, 50% medium, 40% hard', () => {
    expect(pickPrompt([], () => 0.05)).toEqual(EASY[Math.floor(.05 * EASY.length)]);
    expect(pickPrompt([], () => 0.5)).toEqual(MEDIUM[Math.floor(.5 * MEDIUM.length)]);
    expect(pickPrompt([], () => 0.65)).toEqual(HARD[Math.floor(.65 * HARD.length)]);
    expect(pickPrompt([], () => 0.95)).toEqual(HARD[Math.floor(.95 * HARD.length)]);
  });
  it('avoids repeats until the whole bank is exhausted', () => {
    const used = MEDIUM.map((p) => p.answer);
    expect(used).not.toContain(pickPrompt(used, () => 0.5).answer);
    expect(ALL_PROMPTS).toContain(pickPrompt(ALL_PROMPTS.map((p) => p.answer), () => 0.5));
  });
});