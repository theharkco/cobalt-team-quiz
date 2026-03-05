import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('counts down when running', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<CountdownTimer duration={15} onComplete={onComplete} isRunning={true} />);
    
    // After 1 second, should show 14
    vi.advanceTimersByTime(1100);
    expect(screen.getByText('14')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('calls onComplete when time runs out', () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<CountdownTimer duration={2} onComplete={onComplete} isRunning={true} />);
    
    vi.advanceTimersByTime(2200);
    expect(onComplete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not count down when not running', () => {
    vi.useFakeTimers();
    render(<CountdownTimer duration={15} onComplete={vi.fn()} isRunning={false} />);
    vi.advanceTimersByTime(5000);
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
