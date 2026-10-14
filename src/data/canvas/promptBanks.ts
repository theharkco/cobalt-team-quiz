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
  'rocket', 'banana', ['cat', 'kitten', 'kitty'], ['dog', 'puppy'], 'fish', 'house', 'tree', 'sun', ['moon', 'crescent'],
  'star', 'flower', ['car', 'automobile'], 'boat', ['airplane', 'plane', 'aeroplane', 'jet'], 'apple', ['ice cream', 'icecream'],
  'cake', 'balloon', 'snake', ['spider', 'tarantula'], 'ghost', 'robot', 'crown', 'hat', 'shoe', 'key', 'clock', 'book',
  'chair', 'guitar', 'drum', 'heart', 'cloud', 'rainbow', ['duck', 'duckling'], 'frog', 'penguin', 'giraffe', 'mushroom',
  'carrot', 'egg', 'burger', 'cookie', 'bed', 'lamp', 'kite', 'castle', 'football', 'phone', 'candle',
]);

export const MEDIUM = make('medium')([
  ['helicopter', 'chopper'], 'lighthouse', ['roller coaster', 'rollercoaster'], ['washing machine', 'washer'], 'skateboard',
  'volcano', ['firefighter', 'fireman'], ['treasure chest', 'treasure'], 'astronaut', 'pirate', 'mermaid', 'dinosaur',
  'octopus', 'campfire', 'snowboard', 'submarine', 'tractor', 'scarecrow', 'hot air balloon', 'ferris wheel', 'wizard',
  'vampire', 'unicorn', 'dragon', 'cactus', 'igloo', 'tent', 'waterfall', 'island', 'bridge', 'windmill', 'microwave',
  'toaster', 'vacuum cleaner', 'toothbrush', 'barbecue', 'trampoline', 'ladder', 'magnet', 'telescope', 'parachute',
  'pyramid', 'tornado', 'sandcastle', 'snail', 'kangaroo', 'wheelchair', 'birthday party', 'cowboy', 'superhero',
  ['detective', 'sherlock'], 'skeleton', 'zombie', 'juggler', 'yoga', 'bowling', 'fishing', 'surfing',
]);

export const HARD = make('hard')([
  'time machine', 'traffic jam', 'escape room', ['alien invasion', 'aliens', 'ufo'], ['underwater city', 'atlantis'],
  ['secret agent', 'spy'], 'space station', 'haunted house', 'black hole', 'global warming', 'job interview',
  ['video call', 'zoom call', 'teams call'], 'monday morning', 'coffee break', 'speed dating', 'treasure hunt',
  'shooting star', 'solar eclipse', 'zombie apocalypse', 'magic trick', 'first date', 'sleepwalking', 'jet lag',
  'brain freeze', 'photobomb', 'road trip', 'pillow fight', 'bank robbery', 'wedding cake', 'sunburn', 'deadline',
  'out of office', 'fire drill', 'karaoke', 'bad hair day',
]);

export const ALL_PROMPTS: CanvasPrompt[] = [...EASY, ...MEDIUM, ...HARD];

/** Pick a word not yet used this session (easy-leaning mix). */
export function pickPrompt(usedAnswers: string[], rand: () => number = Math.random): CanvasPrompt {
  const used = new Set(usedAnswers.map((a) => a.toLowerCase()));
  const r = rand();
  const bank = r < 0.45 ? EASY : r < 0.85 ? MEDIUM : HARD;
  const fresh = (b: CanvasPrompt[]) => b.filter((p) => !used.has(p.answer.toLowerCase()));
  const pool = fresh(bank).length ? fresh(bank) : fresh(ALL_PROMPTS).length ? fresh(ALL_PROMPTS) : ALL_PROMPTS;
  return pool[Math.floor(rand() * pool.length)];
}
