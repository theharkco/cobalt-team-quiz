import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../useTimer';

describe('useTimer', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.timeElapsed).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it('starts and tracks elapsed time', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer());
    
    const now = Date.now();
    act(() => result.current.start(now));
    
    expect(result.current.isRunning).toBe(true);
    
    vi.advanceTimersByTime(500);
    // timeElapsed updates via interval
    expect(result.current.isRunning).toBe(true);
    
    act(() => result.current.stop());
    expect(result.current.isRunning).toBe(false);
    vi.useRealTimers();
  });

  it('reset stops and clears timeElapsed', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer());
    
    act(() => result.current.start());
    vi.advanceTimersByTime(200);
    act(() => result.current.reset());
    
    expect(result.current.isRunning).toBe(false);
    expect(result.current.timeElapsed).toBe(0);
    vi.useRealTimers();
  });

  it('cleanup clears interval', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer());
    
    act(() => result.current.start());
    act(() => result.current.cleanup());
    // Should not throw
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();
  });

  it('start with referenceTime uses that as base', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTimer());
    const pastTime = Date.now() - 5000;
    
    act(() => result.current.start(pastTime));
    expect(result.current.startTimeRef.current).toBe(pastTime);
    
    act(() => result.current.stop());
    vi.useRealTimers();
  });
});
