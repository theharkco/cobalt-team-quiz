import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasHostClock } from '../useCanvasHostClock';

class ClockWorker {
  static instance: ClockWorker;
  onmessage: (() => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  constructor() { ClockWorker.instance = this; }
}

describe('canvas host background clock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    vi.stubGlobal('Worker', ClockWorker);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('advances from worker messages even when window timers never run', () => {
    const { result, unmount } = renderHook(() => useCanvasHostClock());
    vi.setSystemTime(61000);
    act(() => ClockWorker.instance.onmessage?.());
    expect(result.current).toBe(61000);
    expect(vi.getTimerCount()).toBe(0);
    unmount();
    expect(ClockWorker.instance.terminate).toHaveBeenCalledOnce();
  });

  it('catches up immediately when the tab returns without replaying old timestamps', () => {
    const { result, unmount } = renderHook(() => useCanvasHostClock());
    vi.setSystemTime(120000);
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current).toBe(120000);
    vi.setSystemTime(121000);
    act(() => window.dispatchEvent(new Event('pageshow')));
    expect(result.current).toBe(121000);
    unmount();
  });

  it('falls back if workers are unavailable and cleans up', () => {
    vi.stubGlobal('Worker', class { constructor() { throw new Error('Unavailable'); } });
    const { result, unmount } = renderHook(() => useCanvasHostClock());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(2000);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('falls back on a worker loading failure without creating duplicate timers', () => {
    const { result, unmount } = renderHook(() => useCanvasHostClock());
    act(() => { ClockWorker.instance.onerror?.(); ClockWorker.instance.onerror?.(); });
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(1500);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});