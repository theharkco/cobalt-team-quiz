# Pass the Pencil — replace Infinite Canvas

Infinite Canvas becomes Pass the Pencil. It keeps the same lobby, join code, live drawing and host-screen setup. The game loop, scoring, prompts and results change to match your design. Quiz mode is not touched.

## What changes for players

**Round loop (one word, up to 3 artists)**
- Each word starts on a blank canvas. Artist 1 gets 15 seconds to draw.
- If nobody guesses it, a "PASS THE PENCIL! Alex, you're up!" banner shows over the drawing. Artist 2 gets the same word and keeps drawing on the same canvas. Artist 3 works the same way.
- The word is guessed: the drawing freezes, other guessers get 2 more seconds, then the answer and points show for about 3 seconds and a new word starts.
- Nobody guesses after artist 3: the answer shows, the team gets 0 points, and the next word starts.
- The 12-minute game clock runs across all rounds. When it hits zero, no new word starts. The current artist finishes their turn, the round resolves as normal, and then results show.

**Scoring**
- Team: +100, +200 or +300, depending on which artist was drawing when the first correct guess came in.
- Individual: first correct guess +100, later guesses in the 2-second window +40, active artist +100, each earlier artist +50, third artist who rescues the drawing +50 bonus.
- Artists who have seen the word can't guess that round, even after passing the pencil.

**Rotation**
- Players with the fewest drawing turns go first, with ties broken at random. Nobody draws twice for the same word. Late joiners join the rotation.

**Prompts**
- About 150 curated words in easy, medium and hard groups, with common synonyms. No word repeats in a session. Guesses still allow small spelling mistakes.

**Screens**
- Header: team score (largest), game time, all-time high, "Artist 2 of 3" and "Worth 200 points".
- Main area: canvas, current artist name with their color, artist timer, and an "up next" hint for the handoff.
- Artist phone: secret word, pen, eraser and undo. Undo and eraser only affect that artist's own strokes.
- Guesser phone: live canvas, guess box, and private "You got it!" feedback.
- Side panel: leaderboard and recent team gains (for example "+300 Helicopter, 3-artist rescue").
- Removed: the "scene sentence", growing addition points and "Start new masterpiece". The host keeps "Skip word" and "End game".

**Results**
- Final team score, whether the record was beaten and the previous record.
- Words guessed, words attempted and 3-artist rescues.
- MVP of the Week, top 3, and awards for best artist and sharpest guesser.
- Gallery of every word, including failed ones, with its drawing, how many artists drew it, and its points.
- The all-time high is the best past Pass the Pencil score, like today.

## Technical details

- **Database (additive):** add `round_index`, `artist_turn` (1-3), `round_artist_ids uuid[]`, `turn_started_at` and `used_answers text[]` to `canvas_games`. Add `guessed_count`, `rescue_count` and `attempted_count`. Galleries reuse `canvas_masterpieces` with one row per word (`scene` = [word], `additions` = number of artists). The old scene/addition columns get DEPRECATED comments.
- **Secret word:** `get_canvas_prompt_for_artist` returns the word to any player in `round_artist_ids`, not only the current artist. The host guess check also ignores guesses from those players.
- **Strokes:** keyed by round instead of masterpiece. The canvas clears on each new round.
- **Code:** rewrite `canvasScoring.ts` (team points, new awards, rotation that excludes the round's artists) and its tests. Rebuild `promptBanks.ts` as a flat list grouped by difficulty with alternates. Update the turn and round state machine in `CanvasHostView`, plus `CanvasHud`, `CanvasPlayerView` and `CanvasResults`. Rename the visible text from Infinite Canvas to Pass the Pencil. The host stays the only authority, so `AGENTS.md` keeps its canvas rules, with one rule updated for the round model.
- **Not included (later):** per-Thursday history, past MVP list, drawing playback.
