import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NavLink } from '../NavLink';

describe('NavLink', () => {
  it('renders a link with correct text', () => {
    render(
      <MemoryRouter>
        <NavLink to="/test">Test Link</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('Test Link')).toBeInTheDocument();
  });

  it('applies className', () => {
    render(
      <MemoryRouter>
        <NavLink to="/test" className="custom-class">Link</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('Link')).toHaveClass('custom-class');
  });

  it('applies activeClassName when route matches', () => {
    render(
      <MemoryRouter initialEntries={['/active']}>
        <NavLink to="/active" activeClassName="is-active">Active</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('Active')).toHaveClass('is-active');
  });

  it('does not apply activeClassName when route does not match', () => {
    render(
      <MemoryRouter initialEntries={['/other']}>
        <NavLink to="/test" activeClassName="is-active">Not Active</NavLink>
      </MemoryRouter>
    );
    expect(screen.getByText('Not Active')).not.toHaveClass('is-active');
  });
});
