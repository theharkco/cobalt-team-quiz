# Infinite Canvas: a co-op drawing game inside Quizclash

## Short answer on complexity
**Medium-large. About 2-3x the work of a new question type.** We can reuse the joining, lobby, player list, host screen and live sync. The new parts are:
1. **Live shared drawing** (hardest part): artist strokes must reach 15 phones smoothly.
2. **A turn loop that runs continuously** (artist, prompt, guess, reward, next artist) instead of quiz questions.
3. **Secret answers**: today, phones can see quiz answers. Here, guessers must not be able to see the prompt.

Everything else is ordinary screen work: word banks, scoring, the gallery and the results screen.

## How it fits
- On the home screen, "Host a game" offers two choices: **Quiz** and **Infinite Canvas**.
- Players join the same way as now, with a 4-digit code and a team name.
- The host's big screen shows the canvas, team score, timers and scene sentence. Phones are used for drawing (artist) or guessing (everyone else).
