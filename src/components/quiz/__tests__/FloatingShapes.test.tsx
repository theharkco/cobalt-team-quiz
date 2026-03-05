import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FloatingShapes from '../FloatingShapes';

describe('FloatingShapes', () => {
  it('renders floating emoji shapes', () => {
    const { container } = render(<FloatingShapes />);
    const shapes = container.querySelectorAll('.animate-float');
    expect(shapes.length).toBe(8);
  });

  it('contains expected emojis', () => {
    const { container } = render(<FloatingShapes />);
    expect(container.textContent).toContain('⭐');
    expect(container.textContent).toContain('🏆');
    expect(container.textContent).toContain('🚀');
  });
});
