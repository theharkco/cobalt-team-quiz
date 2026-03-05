export type QuestionType = 'multiple-choice' | 'free-text' | 'blurred-image' | 'music';

export interface QuizQuestion {
  id: number;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[]; // for fuzzy matching free text
  imageUrl?: string;
  blurLevels?: number[]; // blur values at different time points (px)
  spotifyEmbedUrl?: string;
  category?: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // --- MULTIPLE CHOICE (6) ---
  {
    id: 1,
    type: 'multiple-choice',
    question: '🌍 Which country has the most time zones?',
    options: ['Russia', 'USA', 'France', 'China'],
    correctAnswer: 'France',
    category: 'Geography',
  },
  {
    id: 2,
    type: 'multiple-choice',
    question: '🧪 What is the chemical symbol for gold?',
    options: ['Go', 'Gd', 'Au', 'Ag'],
    correctAnswer: 'Au',
    category: 'Science',
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: '🎮 In what year was the first iPhone released?',
    options: ['2005', '2006', '2007', '2008'],
    correctAnswer: '2007',
    category: 'Technology',
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: '🏀 Which NBA team has won the most championships?',
    options: ['LA Lakers', 'Chicago Bulls', 'Boston Celtics', 'Golden State Warriors'],
    correctAnswer: 'Boston Celtics',
    category: 'Sports',
  },
  {
    id: 5,
    type: 'multiple-choice',
    question: '🎬 Who directed the movie "Inception"?',
    options: ['Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Martin Scorsese'],
    correctAnswer: 'Christopher Nolan',
    category: 'Movies',
  },
  {
    id: 6,
    type: 'multiple-choice',
    question: '🐙 How many hearts does an octopus have?',
    options: ['1', '2', '3', '4'],
    correctAnswer: '3',
    category: 'Nature',
  },

  // --- FREE TEXT (3) ---
  {
    id: 7,
    type: 'free-text',
    question: '🗼 What is the capital of Japan?',
    correctAnswer: 'Tokyo',
    acceptableAnswers: ['tokyo', 'tōkyō', 'tokio'],
    category: 'Geography',
  },
  {
    id: 8,
    type: 'free-text',
    question: '🎨 Who painted the Mona Lisa?',
    correctAnswer: 'Leonardo da Vinci',
    acceptableAnswers: ['leonardo da vinci', 'da vinci', 'leonardo', 'davinci'],
    category: 'Art',
  },
  {
    id: 9,
    type: 'free-text',
    question: '🧮 What is the value of Pi to two decimal places?',
    correctAnswer: '3.14',
    acceptableAnswers: ['3.14', '3,14'],
    category: 'Math',
  },

  // --- BLURRED IMAGE (3) ---
  {
    id: 10,
    type: 'blurred-image',
    question: '👤 Who is this famous person?',
    correctAnswer: 'Albert Einstein',
    acceptableAnswers: ['einstein', 'albert einstein'],
    imageUrl: '/images/einstein.jpg',
    blurLevels: [40, 30, 20, 12, 6, 2, 0],
    category: 'Famous People',
  },
  {
    id: 11,
    type: 'blurred-image',
    question: '🏛️ What famous landmark is this?',
    correctAnswer: 'Eiffel Tower',
    acceptableAnswers: ['eiffel tower', 'eiffel', 'the eiffel tower', 'tour eiffel'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/800px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg',
    blurLevels: [50, 35, 25, 15, 8, 3, 0],
    category: 'Landmarks',
  },
  {
    id: 12,
    type: 'blurred-image',
    question: '🗽 What famous landmark is this?',
    correctAnswer: 'Statue of Liberty',
    acceptableAnswers: ['statue of liberty', 'liberty statue', 'the statue of liberty'],
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Statue_of_Liberty_7.jpg/800px-Statue_of_Liberty_7.jpg',
    blurLevels: [45, 32, 22, 14, 7, 2, 0],
    category: 'Landmarks',
  },

  // --- MUSIC (3) - Spotify embeds ---
  {
    id: 13,
    type: 'music',
    question: '🎵 Name the artist of this song!',
    options: ['Queen', 'The Beatles', 'Led Zeppelin', 'Pink Floyd'],
    correctAnswer: 'Queen',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/4u7EnebtmKWzUH433cf5Qv?utm_source=generator&theme=0',
    category: 'Music',
  },
  {
    id: 14,
    type: 'music',
    question: '🎵 Which artist performs this hit?',
    options: ['Michael Jackson', 'Prince', 'Stevie Wonder', 'James Brown'],
    correctAnswer: 'Michael Jackson',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/3S2R0EVwBSAVMd5UMgKTL0?utm_source=generator&theme=0',
    category: 'Music',
  },
  {
    id: 15,
    type: 'music',
    question: '🎵 Who sings this classic?',
    options: ['ABBA', 'Bee Gees', 'Fleetwood Mac', 'Eagles'],
    correctAnswer: 'ABBA',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/0GjEhVFGZW8afUYGChu3Rr?utm_source=generator&theme=0',
    category: 'Music',
  },
];

export const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#FF8C42', '#98D8C8', '#F7DC6F', '#BB8FCE',
  '#85C1E9', '#F0B27A', '#82E0AA', '#F1948A', '#AED6F1',
  '#D7BDE2', '#A3E4D7', '#FAD7A0', '#A9CCE3', '#D5F5E3',
  '#FADBD8', '#D6EAF8', '#FCF3CF', '#D5D8DC', '#E8DAEF',
  '#D4EFDF', '#F9E79F', '#AEB6BF', '#F5CBA7', '#A2D9CE',
];

export type MatchQuality = 'exact' | 'close' | 'none';

export function calculateScore(match: MatchQuality, timeTakenMs: number): number {
  if (match === 'none') return 0;
  const basePoints = match === 'exact' ? 1000 : 600;
  const maxBonus = match === 'exact' ? 500 : 200;
  const bonusWindow = 3000;
  const totalTime = 15000;

  if (timeTakenMs <= bonusWindow) {
    const bonus = Math.round(maxBonus * (1 - timeTakenMs / bonusWindow));
    return basePoints + bonus;
  }
  const remaining = totalTime - bonusWindow;
  const elapsed = timeTakenMs - bonusWindow;
  const minPoints = match === 'exact' ? 500 : 300;
  const penalty = Math.round((basePoints - minPoints) * (elapsed / remaining));
  return Math.max(minPoints, basePoints - penalty);
}

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

export function checkAnswer(question: QuizQuestion, answer: string): MatchQuality {
  const normalizedAnswer = answer.trim().toLowerCase();
  const correctNorm = question.correctAnswer.toLowerCase();

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
