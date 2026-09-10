import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import QuestionDisplay from '../QuestionDisplay';
import MusicPlayer from '../MusicPlayer';
import { QUIZ_QUESTIONS } from '@/data/questions';
import type { QuizQuestion } from '@/data/questions';

/**
 * The music clip must behave the same on the host screen and on every player
 * phone: silent until the question actually starts, playing while the question
 * runs, stopped the moment the player answers or the clock runs out, and reset
 * back to the beginning when the next music question arrives.
 */
let play: ReturnType<typeof vi.spyOn>;
let pause: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { value: 1, configurable: true });
  Object.defineProperty(HTMLMediaElement.prototype, 'duration', { value: 30, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const musicQuestion: QuizQuestion = {
  id: 900,
  type: 'music',
  question: '🎵 Name the artist!',
  options: ['X', 'Y'],
  correctAnswer: 'X',
  audioPreviewUrl: 'https://example.com/one.m4a',
  trackName: 'Song One',
  artistName: 'X',
  category: 'Music',
};

const secondMusicQuestion: QuizQuestion = {
  ...musicQuestion,
  id: 901,
  audioPreviewUrl: 'https://example.com/two.m4a',
  trackName: 'Song Two',
};

const renderQuestion = (props: Partial<React.ComponentProps<typeof QuestionDisplay>> = {}) =>
  render(
    <QuestionDisplay
      question={musicQuestion}
      questionNumber={1}
      totalQuestions={10}
      timeElapsedMs={1200}
      {...props}
    />
  );

describe('music clip start / stop lifecycle', () => {
  it('stays silent during the pre-countdown (before the clock starts)', () => {
    renderQuestion({ timeElapsedMs: 0 });
    expect(play).not.toHaveBeenCalled();
  });

  it('starts the clip once the question is running', () => {
    renderQuestion();
    expect(play).toHaveBeenCalled();
  });

  it('starts the clip on player phones too, not just the host', () => {
    renderQuestion({ isHost: false });
    expect(play).toHaveBeenCalled();
    play.mockClear();
    renderQuestion({ isHost: true });
    expect(play).toHaveBeenCalled();
  });

  it('stops the clip as soon as the player has answered', () => {
    const { rerender } = renderQuestion();
    expect(play).toHaveBeenCalled();
    rerender(
      <QuestionDisplay
        question={musicQuestion}
        questionNumber={1}
        totalQuestions={10}
        timeElapsedMs={4000}
        hideOptions
      />
    );
    expect(pause).toHaveBeenCalled();
  });

  it('stops the clip when the answer is revealed on time-out', () => {
    const { rerender } = renderQuestion();
    rerender(
      <QuestionDisplay
        question={musicQuestion}
        questionNumber={1}
        totalQuestions={10}
        timeElapsedMs={30000}
        revealAnswer
      />
    );
    expect(pause).toHaveBeenCalled();
  });

  it('never plays while the answer is revealed', () => {
    renderQuestion({ revealAnswer: true, timeElapsedMs: 30000 });
    expect(play).not.toHaveBeenCalled();
  });
});

describe('music clip reset between questions', () => {
  it('rewinds to the start when the next music question loads', () => {
    const { container, rerender } = render(
      <MusicPlayer previewUrl="https://example.com/one.m4a" playing startEpochMs={Date.now() - 8000} />
    );
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio.currentTime).toBeGreaterThan(7);

    rerender(<MusicPlayer previewUrl="https://example.com/two.m4a" playing startEpochMs={Date.now()} />);
    expect(audio.getAttribute('src')).toBe('https://example.com/two.m4a');
    expect(audio.currentTime).toBeLessThan(0.35);
  });

  it('swaps the clip source when the question changes mid-quiz', () => {
    const { container, rerender } = renderQuestion();
    rerender(
      <QuestionDisplay
        question={secondMusicQuestion}
        questionNumber={2}
        totalQuestions={10}
        timeElapsedMs={100}
      />
    );
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe('https://example.com/two.m4a');
  });

  it('hides the track name until the answer is revealed', () => {
    const { queryByText, rerender } = renderQuestion();
    expect(queryByText('Song One')).not.toBeInTheDocument();
    rerender(
      <QuestionDisplay
        question={musicQuestion}
        questionNumber={1}
        totalQuestions={10}
        timeElapsedMs={30000}
        revealAnswer
      />
    );
    expect(queryByText('Song One')).toBeInTheDocument();
  });
});

describe('every built-in music question is playable', () => {
  const musicQuestions = QUIZ_QUESTIONS.filter((q) => q.type === 'music');

  it('has at least one music question', () => {
    expect(musicQuestions.length).toBeGreaterThan(0);
  });

  musicQuestions.forEach((q) => {
    it(`plays and stops correctly for "${q.trackName ?? q.question}"`, () => {
      expect(q.audioPreviewUrl ?? q.spotifyEmbedUrl).toBeTruthy();
      if (!q.audioPreviewUrl) return; // legacy embed question, nothing to drive

      play.mockClear();
      pause.mockClear();
      const { container, rerender } = render(
        <QuestionDisplay question={q} questionNumber={1} totalQuestions={10} timeElapsedMs={1000} />
      );
      const audio = container.querySelector('audio') as HTMLAudioElement;
      expect(audio.getAttribute('src')).toBe(q.audioPreviewUrl);
      expect(play).toHaveBeenCalled();

      rerender(
        <QuestionDisplay
          question={q}
          questionNumber={1}
          totalQuestions={10}
          timeElapsedMs={30000}
          revealAnswer
        />
      );
      expect(pause).toHaveBeenCalled();
    });
  });
});
