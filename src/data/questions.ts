// Re-export everything from the split modules for backwards compatibility
export type { QuestionType, QuizQuestion, MatchQuality, Difficulty } from './questionTypes';
export { QUIZ_QUESTIONS, PLAYER_COLORS } from './questionData';
export { calculateScore } from './scoring';
export { checkAnswer } from './answerMatching';
