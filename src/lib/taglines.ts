// One-liner under the front-page title. Plain and dry on purpose: it says what
// the thing is, who plays it and when — no hype words. Add or remove freely;
// pickTagline() just chooses one that differs from the last one shown.
export const TAGLINES = [
  'Quizzes and drawing games, played from our own desks every Thursday.',
  'Every Thursday we get online, and none of us draws well.',
  'A Thursday tradition: answer questions, draw badly, argue about the score.',
  'Quizzes and drawing games for a team that never shares a room.',
  'We play quizzes and Pass the Pencil on Thursdays, each from our own desk.',
  'The Thursday thing: quizzes, drawing, and nobody agreeing on the answer.',
  'Quizzes, drawing games, and the occasional argument — every Thursday.',
  'Same games every Thursday, from desks all over the place.',
  'We get online on Thursdays to answer questions and draw pictures.',
  'One team, lots of desks, and a shared whiteboard nobody can draw on.',
  'Get a question exactly right, or draw something nobody guesses. Thursdays.',
  'Remote, weekly, and a bit loud: quizzes and drawing games for the team.',
] as const;

const LAST_KEY = 'go-cobalt-tagline-index';

function readLast(): number {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    return raw === null ? -1 : Number(raw);
  } catch {
    return -1;
  }
}

function writeLast(index: number) {
  try {
    sessionStorage.setItem(LAST_KEY, String(index));
  } catch {
    // Storage blocked (private mode, sandboxed frame): fine, just no memory.
  }
}

/** Returns a random tagline, never the same one twice in a row. */
export function pickTagline(): string {
  const last = readLast();
  let index = Math.floor(Math.random() * TAGLINES.length);
  if (TAGLINES.length > 1) {
    while (index === last) index = Math.floor(Math.random() * TAGLINES.length);
  }
  writeLast(index);
  return TAGLINES[index];
}
