import type { QuizQuestion } from './questionTypes';

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
    question: '🎨 What famous painting is this?',
    correctAnswer: 'Mona Lisa',
    acceptableAnswers: ['mona lisa', 'the mona lisa', 'la gioconda', 'la joconde'],
    imageUrl: '/images/mona-lisa.jpg',
    blurLevels: [50, 38, 28, 18, 10, 4, 0],
    category: 'Art',
  },
  {
    id: 11,
    type: 'blurred-image',
    question: '🏙️ What famous building is this?',
    correctAnswer: 'Empire State Building',
    acceptableAnswers: ['empire state building', 'empire state', 'the empire state building'],
    imageUrl: '/images/empire-state.jpg',
    blurLevels: [50, 35, 25, 15, 8, 3, 0],
    category: 'Landmarks',
  },
  {
    id: 12,
    type: 'blurred-image',
    question: '🌉 What famous landmark is this?',
    correctAnswer: 'Golden Gate Bridge',
    acceptableAnswers: ['golden gate bridge', 'golden gate', 'the golden gate bridge', 'golden gate brug'],
    imageUrl: '/images/golden-gate.jpg',
    blurLevels: [45, 32, 22, 14, 7, 2, 0],
    category: 'Landmarks',
  },

  // --- MUSIC (3) - Spotify embeds ---
  {
    id: 13,
    type: 'music',
    question: '🎵 Name the artist of this song!',
    options: ['Toto', 'Foreigner', 'Journey', 'Boston'],
    correctAnswer: 'Toto',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/2374M0fQpWi3dLnB54qaLX?utm_source=generator&theme=0',
    category: 'Music',
  },
  {
    id: 14,
    type: 'music',
    question: '🎵 Which artist performs this hit?',
    options: ['Fleetwood Mac', 'Eagles', 'Lynyrd Skynyrd', 'Dire Straits'],
    correctAnswer: 'Dire Straits',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/37Tmv4NnfQeb0ZgUC4fOJj?utm_source=generator&theme=0',
    category: 'Music',
  },
  {
    id: 15,
    type: 'music',
    question: '🎵 Who sings this classic?',
    options: ['Eurythmics', 'Blondie', 'Talking Heads', 'The Pretenders'],
    correctAnswer: 'Talking Heads',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/2L43KOKMRj35HYLl3Skdhx?utm_source=generator&theme=0',
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
