import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import FloatingShapes from '../FloatingShapes';

describe('FloatingShapes', () => {
  it('renders nothing in the paper redesign', () => {
    const { container } = render(<FloatingShapes />);
    expect(container.firstChild).toBeNull();
  });
});
