# Quizclash full experience redesign

## Direction
Replace the black-and-orange look with a distinctive **live game-show control room** aesthetic: deep graphite surfaces, warm off-white text, electric cyan as the main action color, raspberry for urgency, and acid-lime for wins and score gains. Typography will feel bold and broadcast-led without oversized novelty branding, while subtle grids, rails, number blocks, and stage-light accents create energy without generic gradients or decorative blobs.

The redesign will change the composition and pacing of the quiz—not merely recolor the existing cards—while preserving all current quiz rules, scoring, synchronization, audio, and question types.

## Full quiz journey

### Join and quiz selection
- Rebuild the opening screen as a focused two-step game-pin console with clear progress between code and team name.
- Give hosting and quiz creation visually distinct entry points without repeating the same card treatment.
- Redesign quiz selection as a compact library with strong quiz metadata, clear primary actions, and polished empty/loading states.

### Host experience
- Turn the lobby into a big-screen waiting room: dominant join code and URL, lively player arrival roster, player count, and a persistent start control.
- Give pre-question countdowns a full-stage category reveal rather than layering a number over the normal question layout.
- Recompose active questions into a broadcast layout with a top progress rail, timer/status cluster, central prompt/media stage, answer grid, live response count, and a dedicated host control dock.
- Make answer reveal a distinct scene with the correct answer, explanation, special-question breakdowns, and clearly separated leaderboard/next actions.
- Give leaderboard and final results different visual treatments: animated rank movement between rounds, then a celebratory final podium and complete standings.

### Player experience
- Create a phone-first play surface with persistent score/question status, thumb-friendly answer controls, and clear selected/submitted states.
- Give each question type a purposeful interaction layout: answer tiles, numeric lock-in, sortable ranking, Select Wrong multi-select, Highbrow/Lowbrow decision, image, and music.
- Replace the repeated centered-card flow with distinct waiting, countdown, answering, locked-in, result, round-rank, and final-result scenes.
- Keep autoplay recovery prominent and easy to activate without overpowering the question.

### Quiz builder
- Redesign the builder as a creator workspace: clear top command bar, separated quiz details, scannable sortable question outline, and a focused editing area.
- Standardize labels, inputs, selectors, option rows, validation, destructive actions, music search, and save states.
- Improve hierarchy and density on desktop while retaining a comfortable single-column phone layout.

## Shared visual system
- Replace the current orange-led tokens, glow, rounded-card repetition, and emoji-heavy controls with a cohesive semantic palette and restrained iconography.
- Establish reusable stage, panel, toolbar, status-chip, answer-tile, and result-state patterns.
- Use consistent focus rings, disabled states, contrast, spacing, corners, and shadows across all screens.
- Add purposeful transitions for question entrances, answer lock-in, reveals, rank changes, and final celebration; respect reduced-motion preferences.
- Preserve the custom Emoji renderer where emojis remain and use the existing button system for controls.

## Validation
- Verify every screen and quiz state at desktop host and mobile player sizes, checking overlap, truncation, touch targets, and contrast.
- Exercise all question types through countdown, answer, timeout, reveal, leaderboard, and next-question transitions.
- Run the existing typecheck and full automated test suite, then add or adjust presentation tests only where the new state structure requires them.

## Technical notes
- Primary areas: global design tokens and typography; home/join, picker, host, player, creator; question display/input/editor; countdown, music, and leaderboard components.
- Keep the existing database schema and multiplayer/scoring logic unchanged.
- Replace the remote CSS font import with document-head font loading while updating the app-specific page metadata.
