import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Index from '../Index';

const mocks = vi.hoisted(() => ({ createSession: vi.fn(), findSession: vi.fn(), joinSession: vi.fn(), setError: vi.fn() }));
vi.mock('@/hooks/useQuizSession', () => ({ useQuizSession: () => ({ ...mocks, error: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/hooks/useCanvasGame', () => ({ canvasDb: {} }));
vi.mock('@/components/quiz/PartyBackdrop', () => ({ default: () => null, BouncyWord: ({ text }: { text: string }) => <span>{text}</span> }));
vi.mock('@/components/quiz/TypewriterTagline', () => ({ default: () => null }));
vi.mock('@/components/quiz/QuizPicker', () => ({ default: ({ onBack }: { onBack: () => void }) => <button onClick={onBack}>Picker back</button> }));

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}</output><button onClick={() => navigate(-1)}>Browser back</button></>;
}
function open(entry = '/') {
  render(<MemoryRouter initialEntries={[entry]}><LocationProbe /><Routes><Route path="/" element={<Index />} /><Route path="*" element={<p>Destination</p>} /></Routes></MemoryRouter>);
}
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('front-page game navigation', () => {
  it('chooses a game before exposing actions or creating a session', async () => {
    open();
    expect(screen.queryByRole('button', { name: 'Host a quiz' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Quiz/ }));
    expect(await screen.findByRole('button', { name: 'Host a quiz' })).toBeInTheDocument();
    expect(screen.getByLabelText('Got a game code?')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quiz' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Back to games' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Pass the Pencil/ }));
    expect(await screen.findByRole('button', { name: 'Host a game' })).toBeInTheDocument();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('returns from the quiz picker to actions and supports browser Back', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: /^Quiz/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Host a quiz' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/?mode=quiz&host=quiz');
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(await screen.findByRole('button', { name: 'Make a quiz' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(await screen.findByRole('button', { name: /^Quiz/ })).toHaveFocus();
  });

  it('keeps the legacy picker link and builder destination', async () => {
    open('/?host=quiz');
    fireEvent.click(screen.getByRole('button', { name: 'Picker back' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Make a quiz' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/create');
  });

  it.each([['canvas', "What's your name?", '/canvas/session/player'], ['quiz', "What's your team called?", '/play/session/player']])('joins %s independently of the selected game', async (gameMode, label, destination) => {
    mocks.findSession.mockResolvedValue({ game_mode: gameMode });
    mocks.joinSession.mockResolvedValue({ id: 'player', session_id: 'session' });
    open('/?mode=quiz');
    fireEvent.change(screen.getByLabelText('Got a game code?'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find game' }));
    fireEvent.change(await screen.findByLabelText(label), { target: { value: 'Simon' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join game' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(destination));
  });
});