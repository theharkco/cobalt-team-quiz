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
    vi.useFakeTimers();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('recovered');
    
    const promise = retryOnce(fn);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws if both attempts fail', async () => {
    vi.useFakeTimers();
    const err1 = new Error('first');
    const err2 = new Error('second');
    const fn = vi.fn()
      .mockRejectedValueOnce(err1)
      .mockRejectedValueOnce(err2);
    
    const promise = retryOnce(fn);
    await vi.advanceTimersByTimeAsync(1000);
    
    await expect(promise).rejects.toThrow('second');
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
