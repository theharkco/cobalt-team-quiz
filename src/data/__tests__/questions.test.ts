import { describe, it, expect } from 'vitest';
import {
  checkAnswer,
  calculateScore,
  QUIZ_QUESTIONS,
  PLAYER_COLORS,
  type MatchQuality,
} from '../questions';

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
    // "Tokyo" -> "Tokyoo" should be close (similarity >= 0.75)
    const tokyoQ = QUIZ_QUESTIONS.find((q) => q.correctAnswer === 'Tokyo')!;
    expect(checkAnswer(tokyoQ, 'Tokyoo')).toBe('close');
  });

  it('returns close for substring containment', () => {
    const daVinciQ = QUIZ_QUESTIONS.find((q) => q.correctAnswer === 'Leonardo da Vinci')!;
    expect(checkAnswer(daVinciQ, 'leonardo')).toBe('exact'); // in acceptable answers
    expect(checkAnswer(daVinciQ, 'vinci')).toBe('close'); // substring of "da vinci"
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
    const score = calculateScore('exact', 0);
    expect(score).toBe(1500); // 1000 base + 500 bonus
  });

  it('gives max points for instant close answer', () => {
    const score = calculateScore('close', 0);
    expect(score).toBe(800); // 600 base + 200 bonus
  });

  it('reduces bonus over bonusWindow (3s)', () => {
    const fullBonus = calculateScore('exact', 0);
    const halfBonus = calculateScore('exact', 1500);
    const noBonus = calculateScore('exact', 3000);
    expect(fullBonus).toBeGreaterThan(halfBonus);
    expect(halfBonus).toBeGreaterThan(noBonus);
    expect(noBonus).toBe(1000); // base, no bonus
  });

  it('penalizes after bonus window, never below minimum', () => {
    const atEnd = calculateScore('exact', 15000);
    expect(atEnd).toBeGreaterThanOrEqual(500);

    const closeAtEnd = calculateScore('close', 15000);
    expect(closeAtEnd).toBeGreaterThanOrEqual(300);
  });

  it('score decreases monotonically with time', () => {
    const times = [0, 1000, 3000, 5000, 10000, 14000, 15000];
    const scores = times.map((t) => calculateScore('exact', t));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('close match scores are always less than exact match scores at same time', () => {
    const times = [0, 1500, 3000, 7000, 15000];
    times.forEach((t) => {
      expect(calculateScore('exact', t)).toBeGreaterThan(calculateScore('close', t));
    });
  });
});
