import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import CountdownTimer from '../CountdownTimer';

describe('CountdownTimer', () => {
  it('renders with initial duration', () => {
    render(<CountdownTimer duration={15} onComplete={vi.fn()} isRunning={false} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders SVG circles', () => {
    const { container } = render(
      <CountdownTimer duration={15} onComplete={vi.fn()} isRunning={false} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('counts down when running', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<CountdownTimer duration={15} onComplete={onComplete} isRunning={true} />);
    
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByText('14')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('calls onComplete when time runs out', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<CountdownTimer duration={1} onComplete={onComplete} isRunning={true} />);
    
    // Advance past the full duration in small increments to trigger state updates
    for (let i = 0; i < 12; i++) {
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    }
    expect(onComplete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not count down when not running', async () => {
    vi.useFakeTimers();
    render(<CountdownTimer duration={15} onComplete={vi.fn()} isRunning={false} />);
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('15')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('accepts custom size prop', () => {
    const { container } = render(
      <CountdownTimer duration={15} onComplete={vi.fn()} isRunning={false} size={80} />
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('80');
  });
});
