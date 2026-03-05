import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreCountdownOverlay from '../PreCountdownOverlay';
import type { QuizQuestion } from '@/data/questionTypes';

const question: QuizQuestion = {
  id: 1,
  type: 'multiple-choice',
  question: '🌍 Which country?',
  options: ['A', 'B'],
  correctAnswer: 'A',
  category: 'Geography',
};

describe('PreCountdownOverlay', () => {
  it('renders countdown number', () => {
    render(<PreCountdownOverlay countdown={3} question={question} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders category name', () => {
    render(<PreCountdownOverlay countdown={2} question={question} />);
    expect(screen.getByText('Geography')).toBeInTheDocument();
  });

  it('renders emoji from question', () => {
    render(<PreCountdownOverlay countdown={1} question={question} />);
    expect(screen.getByText('🌍')).toBeInTheDocument();
  });

  it('renders fallback emoji when no emoji in question', () => {
    const noEmojiQ = { ...question, question: 'Which country?' };
    render(<PreCountdownOverlay countdown={1} question={noEmojiQ} />);
    expect(screen.getByText('❓')).toBeInTheDocument();
  });

  it('skips category section when no category', () => {
    const noCatQ = { ...question, category: undefined };
    const { container } = render(<PreCountdownOverlay countdown={3} question={noCatQ} />);
    expect(container.querySelector('.uppercase')).not.toBeInTheDocument();
  });
});
