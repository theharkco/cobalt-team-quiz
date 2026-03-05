import { describe, it, expect } from 'vitest';
import {
  checkAnswer,
  calculateScore,
  QUIZ_QUESTIONS,
  PLAYER_COLORS,
} from '@/data/questions';
// Also verify direct imports from split modules work
import { checkAnswer as checkAnswerDirect } from '@/data/answerMatching';
import { calculateScore as calculateScoreDirect } from '@/data/scoring';
import { QUIZ_QUESTIONS as questionsDirect, PLAYER_COLORS as colorsDirect } from '@/data/questionData';
import type { QuizQuestion, MatchQuality, QuestionType } from '@/data/questionTypes';

describe('Re-exports match direct imports', () => {
  it('checkAnswer is the same function', () => {
    expect(checkAnswer).toBe(checkAnswerDirect);
  });
  it('calculateScore is the same function', () => {
    expect(calculateScore).toBe(calculateScoreDirect);
  });
  it('QUIZ_QUESTIONS is the same array', () => {
    expect(QUIZ_QUESTIONS).toBe(questionsDirect);
  });
  it('PLAYER_COLORS is the same array', () => {
    expect(PLAYER_COLORS).toBe(colorsDirect);
  });
});

describe('Types are importable', () => {
  it('QuestionType is valid', () => {
    const t: QuestionType = 'multiple-choice';
    expect(t).toBe('multiple-choice');
  });
  it('MatchQuality is valid', () => {
    const m: MatchQuality = 'exact';
    expect(m).toBe('exact');
  });
});

describe('QUIZ_QUESTIONS', () => {
  it('has 15 questions', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(15);
  });

  it('each question has required fields', () => {
    QUIZ_QUESTIONS.forEach((q) => {
      expect(q.id).toBeDefined();
      expect(q.type).toBeDefined();
      expect(q.question).toBeDefined();
      expect(q.correctAnswer).toBeDefined();
    });
  });

  it('multiple-choice questions have options', () => {
    QUIZ_QUESTIONS.filter((q) => q.type === 'multiple-choice').forEach((q) => {
      expect(q.options).toBeDefined();
      expect(q.options!.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('blurred-image questions have imageUrl and blurLevels', () => {
    QUIZ_QUESTIONS.filter((q) => q.type === 'blurred-image').forEach((q) => {
      expect(q.imageUrl).toBeDefined();
      expect(q.blurLevels).toBeDefined();
      expect(q.blurLevels!.length).toBeGreaterThan(0);
    });
  });

  it('music questions have spotifyEmbedUrl', () => {
    QUIZ_QUESTIONS.filter((q) => q.type === 'music').forEach((q) => {
      expect(q.spotifyEmbedUrl).toBeDefined();
    });
  });
});

describe('PLAYER_COLORS', () => {
  it('has at least 20 colors', () => {
    expect(PLAYER_COLORS.length).toBeGreaterThanOrEqual(20);
  });

  it('all colors are valid hex strings', () => {
    PLAYER_COLORS.forEach((c) => {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('checkAnswer', () => {
  const mcQuestion = QUIZ_QUESTIONS.find((q) => q.type === 'multiple-choice')!;
  const ftQuestion = QUIZ_QUESTIONS.find((q) => q.type === 'free-text')!;

  it('returns exact for correct multiple-choice answer', () => {
    expect(checkAnswer(mcQuestion, mcQuestion.correctAnswer)).toBe('exact');
  });

  it('returns none for wrong multiple-choice answer', () => {
    const wrong = mcQuestion.options!.find((o) => o !== mcQuestion.correctAnswer)!;
    expect(checkAnswer(mcQuestion, wrong)).toBe('none');
  });

  it('is case-insensitive', () => {
    expect(checkAnswer(ftQuestion, ftQuestion.correctAnswer.toUpperCase())).toBe('exact');
    expect(checkAnswer(ftQuestion, ftQuestion.correctAnswer.toLowerCase())).toBe('exact');
  });

  it('returns exact for acceptable answers', () => {
    if (ftQuestion.acceptableAnswers) {
      ftQuestion.acceptableAnswers.forEach((a) => {
        expect(checkAnswer(ftQuestion, a)).toBe('exact');
      });
    }
  });

  it('returns close for similar answers (fuzzy match)', () => {
    const tokyoQ = QUIZ_QUESTIONS.find((q) => q.correctAnswer === 'Tokyo')!;
    expect(checkAnswer(tokyoQ, 'Tokyoo')).toBe('close');
  });

  it('returns close for substring containment', () => {
    const daVinciQ = QUIZ_QUESTIONS.find((q) => q.correctAnswer === 'Leonardo da Vinci')!;
    expect(checkAnswer(daVinciQ, 'leonardo')).toBe('exact');
    expect(checkAnswer(daVinciQ, 'vinci')).toBe('close');
  });

  it('returns none for completely wrong free-text answer', () => {
    expect(checkAnswer(ftQuestion, 'xyzzyplugh')).toBe('none');
  });

  it('handles empty answer', () => {
    expect(checkAnswer(ftQuestion, '')).toBe('none');
  });

  it('handles whitespace-padded answer', () => {
    expect(checkAnswer(ftQuestion, `  ${ftQuestion.correctAnswer}  `)).toBe('exact');
  });
});

describe('calculateScore', () => {
  it('returns 0 for no match', () => {
    expect(calculateScore('none', 5000)).toBe(0);
    expect(calculateScore('none', 0)).toBe(0);
  });

  it('gives max points for instant exact answer', () => {
    expect(calculateScore('exact', 0)).toBe(1500);
  });

  it('gives max points for instant close answer', () => {
    expect(calculateScore('close', 0)).toBe(800);
  });

  it('reduces bonus over bonusWindow (3s)', () => {
    const fullBonus = calculateScore('exact', 0);
    const halfBonus = calculateScore('exact', 1500);
    const noBonus = calculateScore('exact', 3000);
    expect(fullBonus).toBeGreaterThan(halfBonus);
    expect(halfBonus).toBeGreaterThan(noBonus);
    expect(noBonus).toBe(1000);
  });

  it('penalizes after bonus window, never below minimum', () => {
    expect(calculateScore('exact', 15000)).toBeGreaterThanOrEqual(500);
    expect(calculateScore('close', 15000)).toBeGreaterThanOrEqual(300);
  });

  it('score decreases monotonically with time', () => {
    const times = [0, 1000, 3000, 5000, 10000, 14000, 15000];
    const scores = times.map((t) => calculateScore('exact', t));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('close match scores are always less than exact match scores at same time', () => {
    [0, 1500, 3000, 7000, 15000].forEach((t) => {
      expect(calculateScore('exact', t)).toBeGreaterThan(calculateScore('close', t));
    });
  });
});
