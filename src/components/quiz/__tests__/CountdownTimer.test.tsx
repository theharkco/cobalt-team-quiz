import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountdownTimer from '../CountdownTimer';

describe('CountdownTimer', () => {
  it('renders with initial duration', () => {
    render(<CountdownTimer duration={15} timeElapsed={0} onComplete={vi.fn()} isRunning={false} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders SVG circles', () => {
    const { container } = render(
      <CountdownTimer duration={15} timeElapsed={0} onComplete={vi.fn()} isRunning={false} />
    );
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('shows correct time based on timeElapsed', () => {
    render(<CountdownTimer duration={15} timeElapsed={5000} onComplete={vi.fn()} isRunning={true} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('calls onComplete when time runs out', () => {
    const onComplete = vi.fn();
    render(<CountdownTimer duration={15} timeElapsed={15000} onComplete={onComplete} isRunning={true} />);
    expect(onComplete).toHaveBeenCalled();
  });

  it('does not count down when not running', () => {
    render(<CountdownTimer duration={15} timeElapsed={0} onComplete={vi.fn()} isRunning={false} />);
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('accepts custom size prop', () => {
    const { container } = render(
      <CountdownTimer duration={15} timeElapsed={0} onComplete={vi.fn()} isRunning={false} size={80} />
    );
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('80');
  });

  it('shows mid-question time correctly for late joiners', () => {
    render(<CountdownTimer duration={15} timeElapsed={10000} onComplete={vi.fn()} isRunning={true} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
