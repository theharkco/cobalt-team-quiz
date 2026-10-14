import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContestantStage from './ContestantStage';
import type { CanvasGame, CanvasGuess, CanvasPlayer } from '@/types/canvas';

const game = { masterpiece_index: 1, phase: 'drawing', current_artist_id: 'artist', round_artist_ids: ['artist'] } as CanvasGame;
const players = [{ id: 'artist', name: 'Alex', canvas_score: 20 }, { id: 'me', name: 'Billie', canvas_score: 50 }] as CanvasPlayer[];
const guess = (fields: Partial<CanvasGuess>) => ({ id: 'guess', player_id: 'me', masterpiece_index: 1, created_at: new Date(1000).toISOString(), guess: 'secret word', is_correct: false, ...fields }) as CanvasGuess;

describe('floating contestant presence', () => {
  it('ranks twenty players by points with unique stable colors and varied faces', () => {
    const large = Array.from({ length: 20 }, (_, i) => ({ id: `player-${String(i).padStart(2, '0')}`, name: `Player ${i}`, canvas_score: i * 10 })) as CanvasPlayer[];
    const view = render(<ContestantStage game={game} players={large} guesses={[]} now={1000} />);
    const nodes = Array.from(view.container.querySelectorAll('[data-player-id]'));
    expect(nodes[0]).toHaveAttribute('data-player-id', 'player-19');
    expect(new Set(nodes.map((el) => el.getAttribute('data-color'))).size).toBe(20);
    expect(new Set(nodes.map((el) => el.getAttribute('data-face'))).size).toBe(6);
    const color = nodes[0].getAttribute('data-color');
    view.rerender(<ContestantStage game={game} players={large.map((p) => ({ ...p, canvas_score: p.id === 'player-19' ? 0 : p.canvas_score }))} guesses={[]} now={1000} />);
    expect(view.container.querySelector('[data-player-id="player-19"]')).toHaveAttribute('data-color', color);
  });
  it('renders characters without WebGL and identifies the artist and local player', () => {
    const { container } = render(<ContestantStage game={game} players={players} guesses={[]} now={1000} meId="me" />);
    expect(screen.getByLabelText('Floating contestants')).toBeInTheDocument();
    expect(container.querySelectorAll('.pencil-mascot')).toHaveLength(2);
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByText('Billie')).toHaveTextContent('Billie · you');
    expect(container.querySelector('[data-status="drawing"]')).toHaveTextContent('Alex');
  });
  it('only shows host-confirmed incorrect guesses; never leaks a pending or correct answer', () => {
    const view = render(<ContestantStage game={game} players={players} guesses={[guess({})]} now={1200} />);
    expect(screen.queryByText('secret word')).not.toBeInTheDocument();
    view.rerender(<ContestantStage game={game} players={players} guesses={[guess({ verdict: 'incorrect' })]} now={1200} />);
    expect(screen.getByText('secret word')).toBeInTheDocument();
    expect(screen.getByText('secret word').closest('[role="status"]')).toHaveClass('pencil-speech-wrong');
    view.unmount();
    const { container } = render(<ContestantStage game={game} players={players} guesses={[guess({ is_correct: true, verdict: 'correct' })]} now={1200} />);
    expect(screen.queryByText('secret word')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Correct guess')).toBeInTheDocument();
    expect(container.querySelector('[data-status="correct"]')).toHaveTextContent('Got it!');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });
});