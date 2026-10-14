# Agent rules

- Pass the Pencil (formerly Infinite Canvas) is a separate game mode (`quiz_sessions.game_mode = 'canvas'`) with its own pages and `canvas_*` tables; quiz code stays untouched. Why: keeps the two game loops independent.
- The canvas host screen is the sole authority for the turn loop, guess checking and scoring. Why: there are no accounts, so one writer avoids races.
- The canvas host uses a dedicated worker pulse and wall-clock deadlines for turns and reveals, with immediate wake-up checks and a timer fallback. Why: hidden-window timer throttling must not stall the host loop; fully suspended tabs still require resumption.
- Canvas prompts live only in `canvas_secrets` and are read through security-definer functions (artist or host token). Why: guessers' phones must not see the answer.
- Live in-progress strokes use Realtime broadcast; only finished strokes are stored. Why: smooth drawing without a database write per point.
- Pass the Pencil reuses canvas columns: `masterpiece_index` = word/round, `addition_index` = artist turn (1-3), `round_artist_ids` = everyone who saw the word. Why: additive schema, no renames.
- Canvas timing settings persist in the existing game duration fields; all team-point displays and host scoring use the shared duration-aware scoring function. Why: timing survives refreshes and displayed awards match saved scores.
- Canvas guesser points are computed once from the submitted guess timestamp plus completed artist turns, then reused for immediate feedback and final awards. Why: handoffs do not reset elapsed time and celebrations match persisted scores.
- Both correct and incorrect canvas verdicts are broadcast by the host immediately; never infer incorrectness from a timeout. Why: identical feedback latency without false negatives or exposing the secret.
- Contestants render as inline vector mascots with local spring/float motion and accessible DOM labels; do not mount a WebGL scene. Why: lightweight presence integrated with the website on every device.
- Assign contestant palette/face slots from the ID-sorted roster, independently of descending score order, using data-attribute CSS tokens. Why: standings changes preserve identity and all palette selectors survive utility compilation.
- Both drawing screens use the shared pencil workspace grid with the contestant rail always on the right; confirmed verdicts drive bubbles and character expressions. Why: stable spatial hierarchy and no answer leakage through pending guesses.
- Canvas rounds keep the current artist drawing after a solve until all eligible guessers solve or that artist's timer ends; award the word once on resolution. Why: everyone keeps a full remaining guessing window without inflated later-turn team scores.
- Vite proxies Lovable asset paths through the hosted preview in development. Why: local Vite otherwise returns SPA HTML for CDN model requests; deployed assets remain same-origin.
- Canvas guess history renders pending guesses without text, confirmed rejections with text, and solves without the answer. Why: shared chat must not reveal unverified correct answers.
- Pencil all-time records reuse completed canvas games and their session players, with one personal best per normalized name; live standings remain separate. Why: no accounts or extra score writers are needed.
