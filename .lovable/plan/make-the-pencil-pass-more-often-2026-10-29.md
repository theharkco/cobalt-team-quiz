# Make the pencil pass more often

Goal: artists 2 and 3 should draw a lot more often, without making the game feel unfair.

## 1. Majority must solve
- Right now one correct guess is enough: once the artist's time runs out, the word is done.
- New rule: when the artist's time runs out, the word stays only if **more than half** of the current guessers have solved it. If fewer have, the pencil passes to the next artist and the drawing continues.
- If everyone solves it early, the word still ends straight away. Nothing changes there.
- Anyone who already solved it keeps their points and stays "Got it!". The new artist draws for the players still guessing.
- After the third artist, the word ends whatever happens. It counts as solved if anyone got it, and fails if nobody did.
- Group points work the same as today and are counted once, when the word ends. If the word ends on a later artist's turn, it earns that turn's smaller group award, which reflects that the room needed more help.
- With 1–2 guessers, "more than half" means everyone must solve it, so small test games still work.
- The players' screen and the explanation cards in the lobby get a small update: "Most of you need to get it, or the pencil passes!"

## 2. Harder words
- Change how often each word list comes up: easy goes from 25% to 10%, medium from 65% to 50%, hard from 10% to 40%.
- Add about 40 more hard words. They should still be concrete things amateurs can draw, like scenes and objects doing something (for example "dog walking a human", "lost luggage", "sinking ship"), not abstract ideas.
- Remove the most obvious easy words, like single-shape objects that get guessed in 3 seconds.

## 3. No letter hints for the first artist
- During artist 1's turn, guessers only see blank placeholders.
- Letters start appearing from artist 2 onward and still build up to at most 60%. They never go back to hidden.

## Technical details
- `canvasRound.ts`: `roundAction(eligible, correct, expired, turn)` returns `success` if everyone solved, or if the turn expired with `correct > eligible/2`. On turn 3 expiry it returns `success` with ≥1 solver, otherwise `pass`/fail as today. The host's timeout path is updated to use it.
- Keep `correctRef` across handoffs within a word. Guesses from players who already solved stay excluded.
- `wordHints.ts`: on turn 1, return the empty mask. The reveal curve starts at turn 2.
- `promptBanks.ts`: new weights, expanded HARD list, trimmed EASY list.
- Tests: majority/expiry cases (including small rooms and the turn-3 end), turn-1 hint mask is blank, and weighting/no repeats in `pickPrompt`.
- Update the AGENTS.md rule for rounds and the hint rule, plus the Pass the Pencil memory.
