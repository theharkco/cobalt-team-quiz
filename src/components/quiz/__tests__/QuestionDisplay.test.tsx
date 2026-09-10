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
  audioPreviewUrl: 'https://example.com/preview.m4a',
  trackName: 'Some Song',
  artistName: 'X',
  category: 'Music',
};

const legacyMusicQuestion: QuizQuestion = {
  ...musicQuestion,
  id: 4,
  audioPreviewUrl: undefined,
  spotifyEmbedUrl: 'https://open.spotify.com/embed/track/abc',
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

  it('renders an audio element on the host for music questions', () => {
    const { container } = render(
      <QuestionDisplay question={musicQuestion} questionNumber={1} totalQuestions={15} isHost />
    );
    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio?.getAttribute('src')).toBe('https://example.com/preview.m4a');
  });

  it('also outputs audio on player devices so everyone hears the clip', () => {
    const { container } = render(
      <QuestionDisplay question={musicQuestion} questionNumber={1} totalQuestions={15} />
    );
    const audio = container.querySelector('audio');
    expect(audio).toBeInTheDocument();
    expect(audio?.getAttribute('src')).toBe('https://example.com/preview.m4a');
  });

  it('reveals the track name once the answer is revealed', () => {
    render(
      <QuestionDisplay question={musicQuestion} questionNumber={1} totalQuestions={15} isHost revealAnswer />
    );
    expect(screen.getByText('Some Song')).toBeInTheDocument();
  });

  it('falls back to the legacy embed when no clip is set', () => {
    const { container } = render(
      <QuestionDisplay question={legacyMusicQuestion} questionNumber={1} totalQuestions={15} />
    );
    expect(container.querySelector('iframe')).toBeInTheDocument();
  });

  it('does not render category when not provided', () => {
    const q = { ...mcQuestion, category: undefined };
    const { container } = render(
      <QuestionDisplay question={q} questionNumber={1} totalQuestions={15} />
    );
    expect(container.querySelector('.bg-muted')).not.toBeInTheDocument();
  });
});
