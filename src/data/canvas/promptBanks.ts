export interface CanvasPrompt {
  /** Phrase that joins the scene sentence, e.g. "riding a bicycle" */
  text: string;
  /** The word guessers must find */
  answer: string;
  alternates?: string[];
}

const p = (text: string, answer: string, ...alternates: string[]): CanvasPrompt => ({ text, answer, alternates });

export const SUBJECTS: CanvasPrompt[] = [
  p('A giraffe', 'giraffe'), p('A penguin', 'penguin'), p('A robot', 'robot', 'android', 'cyborg'),
  p('A pirate', 'pirate'), p('An octopus', 'octopus', 'squid'), p('A snowman', 'snowman', 'snow man'),
  p('A dinosaur', 'dinosaur', 't-rex', 'trex', 'dino'), p('A cat', 'cat', 'kitten', 'kitty'),
  p('A wizard', 'wizard', 'witch', 'magician'), p('An astronaut', 'astronaut', 'spaceman', 'cosmonaut'),
  p('A frog', 'frog', 'toad'), p('An elephant', 'elephant'), p('A ghost', 'ghost'), p('A cowboy', 'cowboy'),
  p('A snail', 'snail'), p('A shark', 'shark'), p('A banana', 'banana'), p('A duck', 'duck'),
];

export const ACTIONS: CanvasPrompt[] = [
  p('on a skateboard', 'skateboard', 'skating', 'skate board'), p('riding a bicycle', 'bicycle', 'bike', 'cycling'),
  p('juggling', 'juggling', 'juggle', 'juggler'), p('flying a kite', 'kite'), p('surfing', 'surfing', 'surf', 'surfboard'),
  p('playing guitar', 'guitar'), p('lifting weights', 'weights', 'dumbbell', 'barbell', 'lifting'),
  p('fishing', 'fishing', 'fish', 'fishing rod'), p('on roller skates', 'roller skates', 'rollerskates', 'skates'),
  p('sleeping in a hammock', 'hammock'), p('driving a car', 'car', 'driving'), p('on a unicycle', 'unicycle'),
];

export const OBJECTS: CanvasPrompt[] = [
  p('eating pizza', 'pizza'), p('holding a birthday cake', 'cake', 'birthday cake'), p('wearing a crown', 'crown'),
  p('with an umbrella', 'umbrella'), p('wearing sunglasses', 'sunglasses', 'glasses', 'shades'),
  p('holding balloons', 'balloons', 'balloon'), p('with a top hat', 'top hat', 'hat'), p('eating ice cream', 'ice cream', 'icecream'),
  p('holding a sword', 'sword'), p('with a backpack', 'backpack', 'bag', 'rucksack'), p('drinking coffee', 'coffee', 'mug', 'cup'),
  p('holding a lollipop', 'lollipop', 'candy'),
];

export const LOCATIONS: CanvasPrompt[] = [
  p('in space', 'space', 'planets', 'stars', 'galaxy'), p('on the moon', 'moon'), p('underwater', 'underwater', 'ocean', 'sea', 'water'),
  p('on a mountain', 'mountain', 'mountains'), p('in the desert', 'desert', 'cactus'), p('on an island', 'island', 'palm tree'),
  p('in a volcano', 'volcano', 'lava'), p('on a rooftop', 'roof', 'rooftop'), p('in a castle', 'castle'),
  p('at the beach', 'beach', 'sand'), p('in a jungle', 'jungle', 'forest', 'rainforest'), p('on a cloud', 'cloud', 'clouds'),
];

export const TWISTS: CanvasPrompt[] = [
  p('while being chased by a shark', 'shark'), p('surrounded by angry chickens', 'chickens', 'chicken', 'hens'),
  p('during a thunderstorm', 'thunderstorm', 'lightning', 'storm', 'thunder'), p('with a flying toaster', 'toaster'),
  p('under a rainbow', 'rainbow'), p('next to a UFO', 'ufo', 'spaceship', 'flying saucer', 'alien'),
  p('with a tiny dragon', 'dragon'), p('in the rain', 'rain', 'raining'), p('with a giant snail', 'snail'),
  p('during a fireworks show', 'fireworks', 'firework'), p('with bees everywhere', 'bees', 'bee'),
];

export const EXTRAS: CanvasPrompt[] = [
  p('and a dancing bear', 'bear'), p('and a hot air balloon', 'hot air balloon', 'balloon'), p('and a pyramid', 'pyramid'),
  p('and a snowstorm', 'snow', 'snowstorm', 'blizzard'), p('and a disco ball', 'disco ball', 'disco'), p('and a rocket', 'rocket'),
  p('and a lighthouse', 'lighthouse'), p('and a tornado', 'tornado', 'twister'), p('and a sleeping dog', 'dog', 'puppy'),
  p('and a treasure chest', 'treasure', 'chest', 'treasure chest'), p('and a waterfall', 'waterfall'), p('and a train', 'train'),
  p('and a crocodile', 'crocodile', 'alligator', 'croc'), p('and a sun with sunglasses', 'sun'), p('and a ladder', 'ladder'),
];

export function bankForAddition(addition: number): CanvasPrompt[] {
  switch (addition) {
    case 1: return SUBJECTS;
    case 2: return ACTIONS;
    case 3: return OBJECTS;
    case 4: return LOCATIONS;
    case 5: return TWISTS;
    default: return EXTRAS;
  }
}

/** Pick a prompt for the given addition that isn't already in the scene. */
export function pickPrompt(addition: number, usedAnswers: string[], rand: () => number = Math.random): CanvasPrompt {
  const bank = bankForAddition(addition);
  const used = new Set(usedAnswers.map((a) => a.toLowerCase()));
  const pool = bank.filter((b) => !used.has(b.answer.toLowerCase()));
  const list = pool.length ? pool : bank;
  return list[Math.floor(rand() * list.length)];
}

export function sceneSentence(scene: string[]): string {
  return scene.join(' ');
}
