import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CanvasParticipantView from './CanvasParticipantView';
import type { useCanvasGame } from '@/hooks/useCanvasGame';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useCanvasGame', () => ({ canvasDb: { rpc } }));
vi.mock('@/components/quiz/QuizScreen', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('./CanvasLeaderboard', () => ({ default: () => null }));
vi.mock('./ContestantStage', () => ({ default: () => null }));
vi.mock('./CanvasGuessFeed', () => ({ default: () => null }));
vi.mock('./CorrectBurst', () => ({ default: () => null }));
vi.mock('./DrawingCanvas', () => ({ default: ({ editable }: { editable: boolean }) => <div data-testid="canvas" data-editable={String(editable)} /> }));
vi.mock('./CanvasHud', () => ({
  CanvasStats: () => null, ArtistHandoff: () => null, TurnPips: () => null, AdditionTimer: () => null,
  DrawTools: () => <div>Drawing tools</div>, PassBanner: () => null, NewWordBanner: () => null, RevealBanner: () => null,
  ArtistBanner: ({ word }: { word?: string }) => <div>{word}</div>,
  ArtistFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const makeState = () => ({
  loaded: true, game: { id: 'game', status: 'playing', phase: 'drawing', masterpiece_index: 1, addition_index: 1, current_artist_id: 'other', round_artist_ids: ['other'], addition_seconds: 30 },
  players: [{ id: 'host', name: 'Host', canvas_score: 0 }, { id: 'other', name: 'Other', canvas_score: 0 }],
  guesses: [], strokes: [], live: [], sendGuess: vi.fn(), sendLive: vi.fn(), commitStroke: vi.fn(),
} as unknown as ReturnType<typeof useCanvasGame>);

describe('shared participating host screen', () => {
  beforeEach(() => rpc.mockReset().mockResolvedValue({ data: [{ prompt: 'Pirate ship', answer: 'pirate ship' }] }));
  it('lets a guessing host submit without fetching or displaying the secret and keeps controls', () => {
    const state = makeState();
    render(<CanvasParticipantView state={state} playerId="host" now={0} hostControls={<div>Host controls</div>} />);
    expect(rpc).not.toHaveBeenCalled();
    expect(screen.queryByText('Pirate ship')).not.toBeInTheDocument();
    expect(screen.getByText('Host controls')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your guess'), { target: { value: 'boat' } });
    fireEvent.submit(screen.getByLabelText('Your guess').closest('form') as HTMLFormElement);
    expect(state.sendGuess).toHaveBeenCalledWith('host', 'boat');
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-editable', 'false');
  });
  it('shows drawing tools only when host draws, locks guesses after passing, hides secret on new word', async () => {
    const state = makeState();
    if (!state.game) throw new Error('Missing fixture');
    state.game = { ...state.game, current_artist_id: 'host', round_artist_ids: ['host'] };
    const view = render(<CanvasParticipantView state={state} playerId="host" now={0} />);
    await act(async () => {});
    expect(screen.getByText('Pirate ship')).toBeInTheDocument();
    expect(screen.getByText('Drawing tools')).toBeInTheDocument();
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-editable', 'true');
    state.game = { ...state.game, current_artist_id: 'other', round_artist_ids: ['host', 'other'] };
    view.rerender(<CanvasParticipantView state={state} playerId="host" now={0} />);
    expect(screen.getByRole('heading', { name: 'You passed the pencil' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Your guess')).not.toBeInTheDocument();
    state.game = { ...state.game, masterpiece_index: 2, round_artist_ids: ['other'] };
    view.rerender(<CanvasParticipantView state={state} playerId="host" now={0} />);
    expect(screen.getByLabelText('Your guess')).toBeInTheDocument();
    expect(screen.queryByText('Pirate ship')).not.toBeInTheDocument();
  });
});