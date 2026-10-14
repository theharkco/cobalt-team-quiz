# Agent rules

- Pass the Pencil (formerly Infinite Canvas) is a separate game mode (`quiz_sessions.game_mode = 'canvas'`) with its own pages and `canvas_*` tables; quiz code stays untouched. Why: keeps the two game loops independent.
- The canvas host screen is the sole authority for the turn loop, guess checking and scoring. Why: there are no accounts, so one writer avoids races.
- Canvas prompts live only in `canvas_secrets` and are read through security-definer functions (artist or host token). Why: guessers' phones must not see the answer.
- Live in-progress strokes use Realtime broadcast; only finished strokes are stored. Why: smooth drawing without a database write per point.
- Pass the Pencil reuses canvas columns: `masterpiece_index` = word/round, `addition_index` = artist turn (1-3), `round_artist_ids` = everyone who saw the word. Why: additive schema, no renames.
