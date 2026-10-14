## Suggested build phases
1. **Playable core.** Game mode choice, a game clock the host sets in the lobby (default 12 minutes), fair artist rotation, curated prompt banks (subject, action, object, location, twist), drawing with pen/eraser/undo limited to the artist's own strokes, a unique color per artist, guessing that tolerates spelling mistakes, team and individual scoring, and fail-and-restart.
2. **Polish.** Handoff animation, a 2-3 second window for extra correct guesses, "recent correct guesses" feed, "+N" scene sentence above the canvas, late joiners added to the rotation, a "Start new masterpiece" button.
3. **Results.** Team total, record status, longest masterpiece, MVP of the Week, top 3, and a gallery of saved masterpieces with their sentences.
4. **Later / optional.** An all-time team high score (needs a stable "team" identity across weeks), synonyms using AI, extra awards.

## Decisions worth confirming
- **Who runs the game:** the host screen controls the clock and scoring, like quizzes do now. The host must stay open.
- **Synonyms:** start with spelling tolerance and a small list of alternative answers per prompt. AI matching can come later.
- **High score:** for now, the "all-time high" would be the best score from any past Infinite Canvas game.

## Technical details
- **Strokes:** broadcast point batches about every 50ms over Realtime broadcast channels, not database rows. Persist the finished strokes for each addition to a `canvas_strokes` table (jsonb) so late joiners and refreshes can rebuild the canvas. Render with plain `<canvas>` using normalized 0-1 coordinates.
- **Secret prompts:** keep the prompt out of public rows. Use a security-definer function that returns the prompt only to the current artist's player id. Guesses go to a `canvas_guesses` table. The host checks them using the existing `answerMatching` fuzzy logic and writes the results.
- **New tables (additive):** `canvas_games` (mode state, team score, addition index, current artist, prompt, timer timestamps), `canvas_masterpieces` (final PNG to storage plus sentence), `canvas_strokes`, `canvas_guesses`, plus `draw_count` and `canvas_score` on players. These apply to the shared database when this draft is accepted.
- **Weak point:** RLS works without accounts, so a determined player could still read the prompt function by impersonating the artist's id. This is acceptable for a friendly team game.
- **New screens:** `CanvasHostView`, `CanvasPlayerView`, a `DrawingCanvas` component, `promptBanks.ts`, `canvasScoring.ts` and tests. Quiz code is left untouched.
- **Rough size:** phase 1 is the bulk, about 60% of the work. Phases 2 and 3 are the remaining 40%, split evenly.
