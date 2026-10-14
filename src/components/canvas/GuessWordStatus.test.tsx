import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GuessWordStatus from './GuessWordStatus';
import type { CanvasGame } from '@/types/canvas';

const game = { phase: 'drawing', masterpiece_index: 1, addition_index: 1, addition_started_at: new Date(1000).toISOString() } as CanvasGame;
describe('guesser word continuity', () => {
  it('distinguishes a new word from a handoff and keeps the same-word signal visible', () => {
    const view = render(<GuessWordStatus game={game} now={1200} />);
    expect(screen.getByRole('heading')).toHaveTextContent('New word — fresh drawing!');
    view.rerender(<GuessWordStatus game={{ ...game, addition_index: 2 }} now={9000} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Same word — keep guessing');
    expect(screen.getByText('New artist, same drawing. The answer hasn’t changed.')).toBeInTheDocument();
    view.rerender(<GuessWordStatus game={{ ...game, masterpiece_index: 2, addition_started_at: new Date(9000).toISOString() }} now={9200} />);
    expect(screen.getByRole('heading')).toHaveTextContent('New word — fresh drawing!');
    expect(screen.getByText('Word 2 · Artist 1 of 3')).toBeInTheDocument();
  });
  it('does not call a revealed or idle word new', () => {
    const view = render(<GuessWordStatus game={{ ...game, phase: 'reveal' }} now={1200} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    view.rerender(<GuessWordStatus game={game} now={10000} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Guess word 1');
  });
});