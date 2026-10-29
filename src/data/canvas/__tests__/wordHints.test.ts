import { describe, expect, it } from 'vitest';
import { maskedWordHint } from '../wordHints';

describe('progressive word hints', () => {
  it('starts masked and preserves spaces', () => {
    expect(maskedWordHint('pirate ship', 1, 0, 30)).toBe('______ ____');
  });
  it('reveals progressively and never retracts at handoff', () => {
    const first = maskedWordHint('pirate ship', 2, 30, 30);
    const handoff = maskedWordHint('pirate ship', 3, 0, 30);
    const final = maskedWordHint('pirate ship', 3, 30, 30);
    expect(first).toBe(handoff);
    expect(final.replace(/[_ ]/g, '')).toHaveLength(6);
    expect(final).toContain('_');
    Array.from(first).forEach((char, i) => { if (char !== '_') expect(final[i]).toBe(char); });
  });
  it('shows no letters during the first artist turn', () => {
    expect(maskedWordHint('pirate ship', 1, 30, 30)).toBe('______ ____');
    expect(maskedWordHint('pirate ship', 2, 30, 30)).not.toBe('______ ____');
  });
  it('normalizes time to the selected duration and keeps short words partly hidden', () => {
    expect(maskedWordHint('cat', 3, 90, 90)).toContain('_');
    expect(maskedWordHint('pirate ship', 2, 15, 30)).toBe(maskedWordHint('pirate ship', 2, 45, 90));
  });
});