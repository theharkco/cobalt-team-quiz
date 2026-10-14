import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CanvasLeaderboard, { rankPersonalBests } from './CanvasLeaderboard';
import type { CanvasGame, CanvasPlayer } from '@/types/canvas';

const historical = Array.from({ length: 14 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}`, canvas_score: i * 100 }));
vi.mock('@/hooks/useCanvasGame', () => ({ canvasDb: { from: (table: string) => {
  const query = { select: () => query, eq: () => query, in: () => query, order: () => query,
    range: () => Promise.resolve({ data: table === 'canvas_games' ? [{ session_id: 'finished', team_score: 2500 }] : historical, error: null }) };
  return query;
} } }));

describe('pencil records', () => {
  it('keeps one best score per normalized name and returns ten in descending order', () => {
    const result = rankPersonalBests([...historical, { id: 'repeat', name: ' Player   13 ', canvas_score: 1500 }]);
    expect(result).toHaveLength(10);
    expect(result[0].id).toBe('repeat');
    expect(result.filter((p) => p.name.trim().replace(/\s+/g, ' ') === 'Player 13')).toHaveLength(1);
  });
  it('reads completed team records and individual scores and switches to current standings', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CanvasLeaderboard game={{ status: 'playing', team_score: 300 } as CanvasGame} players={[{ id: 'live', name: 'Current player', canvas_score: 42 }] as CanvasPlayer[]} />
    </QueryClientProvider>);
    expect(await screen.findByText('2,500')).toBeInTheDocument();
    expect(await screen.findByText('Player 13')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'This game' }), { button: 0, ctrlKey: false });
    expect(await screen.findByText('Current player')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});