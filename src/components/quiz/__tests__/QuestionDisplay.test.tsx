import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuestionDisplay from '../QuestionDisplay';
import type { QuizQuestion } from '@/data/questions';

const mcQuestion: QuizQuestion = {
  id: 1,
  type: 'multiple-choice',
  question: '🌍 Which country?',
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'C',
  category: 'Geography',
};

const imageQuestion: QuizQuestion = {
  id: 2,
  type: 'blurred-image',
  question: '👤 Who is this?',
  correctAnswer: 'Test',
  imageUrl: '/test.jpg',
  blurLevels: [40, 20, 0],
  category: 'People',
};

const musicQuestion: QuizQuestion = {
  id: 3,
  type: 'music',
  question: '🎵 Name the artist!',
  options: ['X', 'Y'],
  correctAnswer: 'X',
  spotifyEmbedUrl: 'https://open.spotify.com/embed/track/abc',
  category: 'Music',
};

describe('QuestionDisplay', () => {
  it('renders question text and header', () => {
    render(<QuestionDisplay question={mcQuestion} questionNumber={1} totalQuestions={15} />);
    expect(screen.getByText('🌍 Which country?')).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 15')).toBeInTheDocument();
    expect(screen.getByText('Geography')).toBeInTheDocument();
  });

  it('shows options for host view when not hidden', () => {
    render(<QuestionDisplay question={mcQuestion} questionNumber={1} totalQuestions={15} isHost />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('hides options when hideOptions is true', () => {
    render(<QuestionDisplay question={mcQuestion} questionNumber={1} totalQuestions={15} isHost hideOptions />);
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  it('does not show options for non-host view', () => {
    render(<QuestionDisplay question={mcQuestion} questionNumber={1} totalQuestions={15} />);
    expect(screen.queryByText('A')).not.toBeInTheDocument();
  });

  it('renders blurred image for image questions', () => {
    const { container } = render(
      <QuestionDisplay question={imageQuestion} questionNumber={1} totalQuestions={15} />
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('src')).toBe('/test.jpg');
  });

  it('renders music emoji for music questions', () => {
    render(<QuestionDisplay question={musicQuestion} questionNumber={1} totalQuestions={15} />);
    expect(screen.getByText('🎵')).toBeInTheDocument();
  });

  it('renders iframe in a cropped container for music questions', () => {
    const { container } = render(
      <QuestionDisplay question={musicQuestion} questionNumber={1} totalQuestions={15} />
    );
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    const wrapper = iframe?.closest('.overflow-hidden');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.classList.contains('h-[30px]')).toBe(true);
  });

  it('does not render category when not provided', () => {
    const q = { ...mcQuestion, category: undefined };
    const { container } = render(
      <QuestionDisplay question={q} questionNumber={1} totalQuestions={15} />
    );
    expect(container.querySelector('.bg-muted')).not.toBeInTheDocument();
  });
});
