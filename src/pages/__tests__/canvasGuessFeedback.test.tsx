import { fireEvent, render, screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CanvasPlayerView from '../CanvasPlayerView';

const state = vi.hoisted(() => ({
  game: { id: 'game', status: 'playing', phase: 'drawing', masterpiece_index: 1, current_artist_id: 'artist', round_artist_ids: ['artist'], addition_seconds: 30 },
  players: [{ id: 'me', name: 'Me', canvas_score: 0 }, { id: 'artist', name: 'Artist', canvas_score: 0 }],
  guesses: [] as Record<string, unknown>[], sendGuess: vi.fn(),
}));
vi.mock('react-router-dom', () => ({ useParams: () => ({ sessionId: 'session', playerId: 'me' }) }));
vi.mock('@/hooks/useCanvasGame', () => ({ useCanvasGame: () => ({ ...state, loaded: true, strokes: [], live: [] }), useNow: () => 0, canvasDb: { rpc: () => Promise.resolve({ data: [{ prompt: 'Pirate ship', answer: 'pirate ship' }] }) } }));
vi.mock('@/components/canvas/ContestantStage', () => ({ default: () => <div>The team</div> }));
vi.mock('@/components/canvas/CanvasLeaderboard', () => ({ default: () => null }));
vi.mock('@/components/canvas/CanvasGuessFeed', () => ({ default: () => null }));
vi.mock('@/components/canvas/CorrectBurst', () => ({ default: () => null }));
vi.mock('@/components/quiz/QuizScreen', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/canvas/DrawingCanvas', () => ({ default: () => <div data-testid="drawing-canvas" /> }));
vi.mock('@/components/canvas/CanvasHud', () => ({
  CanvasStats: () => null, ArtistBanner: () => null, ArtistHandoff: () => null, TurnPips: () => null,
  AdditionTimer: () => null, DrawTools: () => null, PassBanner: () => null, NewWordBanner: () => null, RevealBanner: () => null,
  ArtistFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('canvas wrong-guess feedback', () => {
  beforeEach(() => { state.guesses = []; state.game.round_artist_ids = ['artist']; state.sendGuess.mockReset(); });
  it('clearly blocks guessing after drawing and restores it for the next word', async () => {
    state.game.round_artist_ids = ['artist', 'me'];
    const view = render(<CanvasPlayerView />);
    expect(screen.getByRole('heading', { name: 'You passed the pencil' })).toBeInTheDocument();
    expect(screen.getByText(/You’ve seen the word, so you can’t guess this round/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Your guess' })).not.toBeInTheDocument();
    await act(async () => {});
    state.game.round_artist_ids = ['artist'];
    view.rerender(<CanvasPlayerView />);
    expect(screen.getByRole('textbox', { name: 'Your guess' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'You passed the pencil' })).not.toBeInTheDocument();
  });
  it('reacts to host rejection without advancing a delay, keeps the input, and has no history', () => {
    const view = render(<CanvasPlayerView />);
    const input = screen.getByRole('textbox', { name: 'Your guess' });
    fireEvent.change(input, { target: { value: 'cat' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(state.sendGuess).toHaveBeenCalledWith('me', 'cat');
    expect(screen.queryByText('Not quite!')).not.toBeInTheDocument();
    act(() => { state.guesses = [{ id: 'guess', player_id: 'me', masterpiece_index: 1, guess: 'cat', verdict: 'incorrect', is_correct: false }]; });
    view.rerender(<CanvasPlayerView />);
    expect(screen.getByRole('status')).toHaveTextContent('Not quite!');
    expect(screen.getByRole('textbox', { name: 'Your guess' })).toBe(input);
    expect(screen.queryByText('cat')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'dog' } });
    expect(input).toHaveValue('dog');
    expect(input.compareDocumentPosition(screen.getByTestId('drawing-canvas')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('never shows wrong feedback for an unconfirmed guess', () => {
    state.guesses = [{ id: 'pending', player_id: 'me', masterpiece_index: 1, guess: 'cat', is_correct: false }];
    render(<CanvasPlayerView />);
    expect(screen.queryByText('Not quite!')).not.toBeInTheDocument();
  });
});