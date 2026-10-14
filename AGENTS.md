# Agent rules

- Pass the Pencil (formerly Infinite Canvas) is a separate game mode (`quiz_sessions.game_mode = 'canvas'`) with its own pages and `canvas_*` tables; quiz code stays untouched. Why: keeps the two game loops independent.
- The canvas host screen is the sole authority for the turn loop, guess checking and scoring. Why: there are no accounts, so one writer avoids races.
- Canvas prompts live only in `canvas_secrets` and are read through security-definer functions (artist or host token). Why: guessers' phones must not see the answer.
- Live in-progress strokes use Realtime broadcast; only finished strokes are stored. Why: smooth drawing without a database write per point.
- Pass the Pencil reuses canvas columns: `masterpiece_index` = word/round, `addition_index` = artist turn (1-3), `round_artist_ids` = everyone who saw the word. Why: additive schema, no renames.
- Canvas timing settings persist in the existing game duration fields; all team-point displays and host scoring use the shared duration-aware scoring function. Why: timing survives refreshes and displayed awards match saved scores.
- Canvas guesser points are computed once from the submitted guess timestamp plus completed artist turns, then reused for immediate feedback and final awards. Why: handoffs do not reset elapsed time and celebrations match persisted scores.
- Both correct and incorrect canvas verdicts are broadcast by the host immediately; never infer incorrectness from a timeout. Why: identical feedback latency without false negatives or exposing the secret.
- Contestants share one React Three Fiber canvas per team stage with cloned CC0 animated characters and DOM labels. Why: avoids a WebGL context per player and keeps names/status accessible.
