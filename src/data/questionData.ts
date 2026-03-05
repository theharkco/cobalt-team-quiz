import type { QuizQuestion } from './questionTypes';

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // --- MULTIPLE CHOICE (6) ---
  {
    id: 1,
    type: 'multiple-choice',
    question: '💰 Which PE firm completed the largest leveraged buyout in history (TXU Energy, 2007)?',
    options: ['Blackstone', 'KKR', 'Apollo', 'Carlyle'],
    correctAnswer: 'KKR',
    category: 'Private Equity',
  },
  {
    id: 2,
    type: 'multiple-choice',
    question: '🤖 What does the "T" stand for in GPT?',
    options: ['Training', 'Transformer', 'Transfer', 'Token'],
    correctAnswer: 'Transformer',
    category: 'LLM Technology',
  },
  {
    id: 3,
    type: 'multiple-choice',
    question: '💼 What is the typical management fee structure in private equity?',
    options: ['1 and 10', '2 and 20', '3 and 30', '1.5 and 15'],
    correctAnswer: '2 and 20',
    category: 'Private Equity',
  },
  {
    id: 4,
    type: 'multiple-choice',
    question: '🧠 Which technique lets LLMs solve complex problems by generating intermediate steps?',
    options: ['Few-shot learning', 'Chain-of-thought', 'Fine-tuning', 'Beam search'],
    correctAnswer: 'Chain-of-thought',
    category: 'LLM Technology',
  },
  {
    id: 5,
    type: 'multiple-choice',
    question: '🎬 In the movie "Ex Machina," what is the name of the AI robot?',
    options: ['Samantha', 'Ava', 'Sophia', 'Alexa'],
    correctAnswer: 'Ava',
    category: 'AI Pop Culture',
  },
  {
    id: 6,
    type: 'multiple-choice',
    question: '📊 What does MOIC stand for in private equity?',
    options: ['Multiple on Invested Capital', 'Margin of Internal Cost', 'Mean of Investment Cash', 'Multiple on Initial Commitment'],
    correctAnswer: 'Multiple on Invested Capital',
    category: 'Private Equity',
  },

  // --- FREE TEXT (3) ---
  {
    id: 7,
    type: 'free-text',
    question: '🤖 What company created ChatGPT?',
    correctAnswer: 'OpenAI',
    acceptableAnswers: ['openai', 'open ai', 'open-ai'],
    category: 'AI Pop Culture',
  },
  {
    id: 8,
    type: 'free-text',
    question: '🧠 What is the process called when a pre-trained LLM is further trained on a specific dataset?',
    correctAnswer: 'Fine-tuning',
    acceptableAnswers: ['fine-tuning', 'fine tuning', 'finetuning'],
    category: 'LLM Technology',
  },
  {
    id: 9,
    type: 'free-text',
    question: '🎬 What is the name of the sentient AI in the movie "2001: A Space Odyssey"?',
    correctAnswer: 'HAL 9000',
    acceptableAnswers: ['hal 9000', 'hal', 'hal9000'],
    category: 'AI Pop Culture',
  },

  // --- BLURRED IMAGE (3) ---
  {
    id: 10,
    type: 'blurred-image',
    question: '👤 Who is this?',
    correctAnswer: 'Jonathan Nilsfors',
    acceptableAnswers: ['jonathan nilsfors', 'nilsfors', 'jonathan'],
    imageUrl: '/images/jonathan-nilsfors.jpg',
    blurLevels: [50, 38, 28, 18, 10, 4, 0],
    category: 'Famous People',
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
    question: '🏛️ What famous landmark is this?',
    correctAnswer: 'Angkor Wat',
    acceptableAnswers: ['angkor wat', 'angkor', 'ankor wat', 'angkor vat'],
    imageUrl: '/images/angkor-wat.jpg',
    blurLevels: [45, 32, 22, 14, 7, 2, 0],
    category: 'Landmarks',
  },

  // --- MUSIC (3) - Spotify embeds ---
  {
    id: 13,
    type: 'music',
    question: '🎵 Name the artist of this song!',
    options: ['Steely Dan', 'The Doobie Brothers', 'Chicago', 'Toto'],
    correctAnswer: 'Steely Dan',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/27OeeYzk6klgBh23ENUkXL?utm_source=generator&theme=0',
    category: 'Music',
  },
  {
    id: 14,
    type: 'music',
    question: '🎵 Which artist performs this hit?',
    options: ['Supertramp', 'Electric Light Orchestra', '10cc', 'Alan Parsons Project'],
    correctAnswer: 'Supertramp',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/2kN5sBeGBOM2MfaRhscRFp?utm_source=generator&theme=0',
    category: 'Music',
  },
  {
    id: 15,
    type: 'music',
    question: '🎵 Who sings this classic?',
    options: ['King Crimson', 'Yes', 'Genesis', 'Jethro Tull'],
    correctAnswer: 'King Crimson',
    spotifyEmbedUrl: 'https://open.spotify.com/embed/track/5kAGSAVFjBJlIFH3jSHJnz?utm_source=generator&theme=0',
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
