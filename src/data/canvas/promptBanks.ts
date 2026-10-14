export type Difficulty = 'easy' | 'medium' | 'hard';

export interface CanvasPrompt {
  /** Word shown to artists */
  text: string;
  /** The word guessers must find */
  answer: string;
  alternates?: string[];
  difficulty?: Difficulty;
}

const make = (difficulty: Difficulty) => (list: (string | string[])[]): CanvasPrompt[] =>
  list.map((e) => {
    const [answer, ...alternates] = Array.isArray(e) ? e : [e];
    return { text: answer[0].toUpperCase() + answer.slice(1), answer, alternates, difficulty };
  });

export const EASY = make('easy')([
  'pizza', ['bicycle', 'bike'], 'elephant', 'umbrella', ['sunglasses', 'shades', 'glasses'], ['snowman', 'snow man'],
  'rocket', 'banana peel', ['cat', 'kitten', 'kitty'], ['dog', 'puppy'], 'goldfish bowl', 'treehouse', 'palm tree', 'sunflower', ['moon', 'crescent'],
  'starfish', 'flower pot', ['car', 'automobile'], 'sailboat', ['airplane', 'plane', 'aeroplane', 'jet'], 'pineapple', ['ice cream', 'icecream'],
  'birthday cake', 'balloon', 'snake', ['spider', 'tarantula'], 'ghost', 'robot', 'crown', 'top hat', 'roller skate', 'padlock', 'alarm clock', 'bookshelf',
  'rocking chair', 'guitar', 'drum', 'love letter', 'thunderstorm', 'rainbow', ['duck', 'duckling'], 'frog', 'penguin', 'giraffe', 'mushroom',
  'carrot', 'fried egg', 'burger', 'cookie', 'bunk bed', 'desk lamp', 'kite', 'castle', 'football goal', 'telephone', 'candlestick',
]);

export const MEDIUM = make('medium')([
  ['helicopter', 'chopper'], 'lighthouse', ['roller coaster', 'rollercoaster'], ['washing machine', 'washer'], 'skateboard',
  'volcano', ['firefighter', 'fireman'], ['treasure chest', 'treasure'], 'astronaut', 'pirate', 'mermaid', 'dinosaur',
  'octopus', 'campfire', 'snowboard', 'submarine', 'tractor', 'scarecrow', 'hot air balloon', 'ferris wheel', 'wizard',
  'vampire', 'unicorn', 'dragon', 'cactus', 'igloo', 'tent', 'waterfall', 'island', 'bridge', 'windmill', 'microwave',
  'toaster', 'vacuum cleaner', 'toothbrush', 'barbecue', 'trampoline', 'ladder', 'magnet', 'telescope', 'parachute',
  'pyramid', 'tornado', 'sandcastle', 'snail', 'kangaroo', 'wheelchair', 'birthday party', 'cowboy', 'superhero',
  'magnifying glass', 'skeleton', 'zombie', ['juggling', 'juggler'], 'weightlifting', 'bowling', 'fishing', 'surfing',
]);

export const HARD = make('hard')([
  'pirate ship', 'traffic jam', ['maze', 'labyrinth'], ['flying saucer', 'ufo'], 'shipwreck',
  'suitcase', 'satellite', 'haunted house', 'crystal ball', 'snow globe', 'briefcase',
  'puppet show', 'vending machine', 'popcorn machine', 'musical chairs', 'treasure map',
  'shooting star', 'solar eclipse', 'ski lift', ['rabbit in a hat', 'rabbit out of a hat'], 'picnic', 'sleepwalking', 'airport',
  'milkshake', 'photo booth', 'camper van', 'pillow fight', 'bow and arrow', 'wedding cake', 'lifeguard', 'hourglass',
  'hammock', 'fire extinguisher', 'karaoke', 'washing line',
]);

export const ALL_PROMPTS: CanvasPrompt[] = [...EASY, ...MEDIUM, ...HARD];

/** Concrete objects first, with occasional multi-object scenes; no abstract concepts. */
export function pickPrompt(usedAnswers: string[], rand: () => number = Math.random): CanvasPrompt {
  const used = new Set(usedAnswers.map((a) => a.toLowerCase()));
  const r = rand();
  const bank = r < 0.25 ? EASY : r < 0.9 ? MEDIUM : HARD;
  const fresh = (b: CanvasPrompt[]) => b.filter((p) => !used.has(p.answer.toLowerCase()));
  const pool = fresh(bank).length ? fresh(bank) : fresh(ALL_PROMPTS).length ? fresh(ALL_PROMPTS) : ALL_PROMPTS;
  return pool[Math.floor(rand() * pool.length)];
}
