import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CanvasGuessFeed from './CanvasGuessFeed';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';

const game = { masterpiece_index: 2, phase: 'drawing', status: 'playing' } as CanvasGame;
const players = [{ id: 'a', name: 'Alex' }, { id: 'b', name: 'Billie' }] as CanvasPlayer[];
const guess = (fields: Partial<CanvasGuess>): CanvasGuess => ({ id: 'one', game_id: 'game', player_id: 'a', masterpiece_index: 2, addition_index: 1, created_at: '2026-10-14T23:00:00Z', guess: 'secret word', is_correct: false, points_earned: 0, ...fields });

describe('shared guess chat', () => {
  it('shows names and rejected guesses while concealing pending and correct answers', () => {
    const view = render(<CanvasGuessFeed game={game} players={players} guesses={[guess({})]} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Checking…')).toBeInTheDocument();
    expect(screen.queryByText('secret word')).not.toBeInTheDocument();
    view.rerender(<CanvasGuessFeed game={game} players={players} guesses={[guess({ verdict: 'incorrect', guess: 'toaster' }), guess({ id: 'two', player_id: 'b', is_correct: true, points_earned: 87 })]} />);
    expect(screen.getByText('toaster')).toBeInTheDocument();
    expect(screen.getByText('Billie')).toBeInTheDocument();
    expect(screen.getByText('+87')).toBeInTheDocument();
    expect(screen.queryByText('secret word')).not.toBeInTheDocument();
  });
  it('keeps earlier word history and sorts chronologically', () => {
    render(<CanvasGuessFeed game={game} players={players} guesses={[guess({ id: 'later', verdict: 'incorrect', guess: 'last' }), guess({ id: 'earlier', masterpiece_index: 1, guess: 'first', created_at: '2026-10-14T22:00:00Z' })]} />);
    expect(screen.getByRole('log')).toHaveTextContent(/Word 1.*Alex.*first.*Word 2.*Alex.*last/);
  });
});