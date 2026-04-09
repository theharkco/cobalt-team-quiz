import type { QuizQuestion, MatchQuality } from './questionTypes';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * For 'select-wrong' questions, answer is a JSON-encoded string[] of selected options.
 * Returns 'exact' if all wrong answers selected and no correct ones,
 * 'close' if some wrong answers found without selecting correct ones,
 * 'none' if any correct answer was selected or nothing valid selected.
 */
export function checkSelectWrongAnswer(
  question: QuizQuestion,
  selectedAnswers: string[]
): { match: MatchQuality; wrongFoundCount: number; totalWrongCount: number } {
  const correctSet = new Set((question.correctAnswers || []).map(a => a.toLowerCase()));
  const allOptions = question.options || [];
  const wrongOptions = allOptions.filter(o => !correctSet.has(o.toLowerCase()));
  const totalWrong = wrongOptions.length;

  // Check if player selected any correct answer (penalty)
  const selectedCorrect = selectedAnswers.some(a => correctSet.has(a.toLowerCase()));
  if (selectedCorrect || selectedAnswers.length === 0) {
    return { match: 'none', wrongFoundCount: 0, totalWrongCount: totalWrong };
  }

  const wrongSet = new Set(wrongOptions.map(o => o.toLowerCase()));
  const wrongFound = selectedAnswers.filter(a => wrongSet.has(a.toLowerCase())).length;

  if (wrongFound === totalWrong) {
    return { match: 'exact', wrongFoundCount: wrongFound, totalWrongCount: totalWrong };
  }
  if (wrongFound > 0) {
    return { match: 'close', wrongFoundCount: wrongFound, totalWrongCount: totalWrong };
  }
  return { match: 'none', wrongFoundCount: 0, totalWrongCount: totalWrong };
}

export function checkAnswer(question: QuizQuestion, answer: string): MatchQuality {
  // Closest-without-going-over uses deferred scoring — no instant match
  if (question.type === 'closest-without-going-over') return 'none';

  const normalizedAnswer = answer.trim().toLowerCase();
  const correctNorm = question.correctAnswer.toLowerCase();

  // Multiple-choice and music: strict exact match only
  if (question.type === 'multiple-choice' || question.type === 'music') {
    return normalizedAnswer === correctNorm ? 'exact' : 'none';
  }

  // Exact match against correct answer
  if (normalizedAnswer === correctNorm) return 'exact';

  // Exact match against acceptable answers
  if (question.acceptableAnswers) {
    for (const a of question.acceptableAnswers) {
      if (normalizedAnswer === a.toLowerCase()) return 'exact';
    }
  }

  // Fuzzy matching — check all acceptable answers + correct answer
  const candidates = [correctNorm, ...(question.acceptableAnswers?.map(a => a.toLowerCase()) || [])];
  let bestSim = 0;

  for (const candidate of candidates) {
    // Substring containment
    if (candidate.length > 3 && normalizedAnswer.includes(candidate)) return 'close';
    if (normalizedAnswer.length > 3 && candidate.includes(normalizedAnswer)) return 'close';

    // Levenshtein similarity
    const sim = similarity(normalizedAnswer, candidate);
    bestSim = Math.max(bestSim, sim);
  }

  // Threshold: >= 0.75 similarity = close match
  if (bestSim >= 0.75) return 'close';

  return 'none';
}
