import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Leaderboard from '../Leaderboard';
import type { Player } from '@/types/quiz';

// Mock confetti
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const players: Player[] = [
  { id: '1', name: 'Alice', score: 1000, color: '#FF6B6B', session_id: 's1' },
  { id: '2', name: 'Bob', score: 800, color: '#4ECDC4', session_id: 's1' },
  { id: '3', name: 'Charlie', score: 600, color: '#45B7D1', session_id: 's1' },
  { id: '4', name: 'Diana', score: 400, color: '#FFEAA7', session_id: 's1' },
];

describe('Leaderboard', () => {
  it('renders leaderboard title', () => {
    render(<Leaderboard players={players} />);
    expect(screen.getByText('📊 Leaderboard')).toBeInTheDocument();
  });

  it('displays all players', () => {
    render(<Leaderboard players={players} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();
  });

  it('shows score gained when previousScores provided', () => {
    render(
      <Leaderboard
        players={players}
        previousScores={{ '1': 500, '2': 500, '3': 500, '4': 400 }}
      />
    );
    expect(screen.getByText('+500')).toBeInTheDocument(); // Alice gained 500
    expect(screen.getByText('+300')).toBeInTheDocument(); // Bob gained 300
  });

  it('renders final results view with podium', () => {
    render(<Leaderboard players={players} isFinal />);
    expect(screen.getByText('🏆 Final Results! 🏆')).toBeInTheDocument();
  });

  it('shows medals for top 3 in regular view', () => {
    render(<Leaderboard players={players} />);
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('renders empty leaderboard without crashing', () => {
    render(<Leaderboard players={[]} />);
    expect(screen.getByText('📊 Leaderboard')).toBeInTheDocument();
  });

  it('sorts players by score descending', () => {
    const unsorted: Player[] = [
      { id: '1', name: 'Low', score: 100, color: '#fff', session_id: 's1' },
      { id: '2', name: 'High', score: 900, color: '#fff', session_id: 's1' },
    ];
    render(<Leaderboard players={unsorted} />);
    const names = screen.getAllByText(/Low|High/);
    expect(names[0].textContent).toBe('High');
  });
});
