import { describe, it, expect, vi } from 'vitest';
import { retryOnce } from '../retryAsync';

describe('retryOnce', () => {
  it('returns result on first successful call', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryOnce(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries once on failure and returns second result', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('recovered');
    
    vi.useFakeTimers();
    const promise = retryOnce(fn);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws if both attempts fail', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'));
    
    vi.useFakeTimers();
    const promise = retryOnce(fn);
    await vi.advanceTimersByTimeAsync(1000);
    
    await expect(promise).rejects.toThrow('second');
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
