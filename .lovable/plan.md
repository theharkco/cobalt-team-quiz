
# Highbrow/Lowbrow Question Type

A new question type where each card has two prompts targeting the **same correct answer**. Players start on the harder "Highbrow" prompt (worth up to 200 pts). They can tap a button to reveal the easier "Lowbrow" prompt, which locks the highbrow out and caps the answer at 100 pts.

## Behavior summary

- **Same answer, two prompts.** Authors enter one correct answer (+ optional acceptable answers) and two question texts.
- **Per-prompt input types.** Each prompt can independently be `multiple-choice` or `free-text`. Multiple choice gets its own option set per side.
- **One shared timer.** Revealing Lowbrow does NOT reset the clock — discourages instant reveal.
- **Player-side reveal only.** The host screen shows only the Highbrow prompt during play; both prompts (and the correct answer) appear during the reveal/leaderboard phase.
- **Scoring.** Highbrow correct = 200 pts. Lowbrow correct = 100 pts. Wrong/timeout = 0. No speed bonus, no partial credit — keeps the high/low tradeoff clean.

## Files to change

### 1. `src/data/questionTypes.ts`
- Add `'highbrow-lowbrow'` to the `QuestionType` union.
- Extend `QuizQuestion` with optional fields:
  - `lowbrowQuestion?: string` — the easier prompt text
  - `highbrowInputType?: 'multiple-choice' | 'free-text'`
  - `lowbrowInputType?: 'multiple-choice' | 'free-text'`
  - `lowbrowOptions?: string[]` — options for the lowbrow side when MC. (Highbrow reuses existing `options`.)
  - The shared answer continues to live in `correctAnswer` + `acceptableAnswers`.

### 2. `src/data/scoring.ts`
- Add `calculateHighbrowLowbrowScore(isCorrect: boolean, side: 'highbrow' | 'lowbrow'): number` returning 200 / 100 / 0. No time component.

### 3. `src/data/questions.ts`
- Re-export the new scoring helper.

### 4. `src/components/quiz/PlayerAnswerInput.tsx`
- New branch for `question.type === 'highbrow-lowbrow'` rendering a `HighbrowLowbrowInput` subcomponent:
  - Local state `side: 'highbrow' | 'lowbrow'`.
  - **Highbrow view:** prominent `200 PTS` badge, the highbrow prompt, the appropriate input (MC grid or free-text input), plus a secondary button **"Reveal Lowbrow Question (for 100 points)"**.
  - **Lowbrow view (after reveal):** the highbrow card is replaced (not just dimmed — simpler and avoids accidental taps); shows a smaller "Highbrow locked" chip, the new `100 PTS` badge, the lowbrow prompt and its input. No way to go back.
  - On submit, encode answer as JSON `{ side, answer }` so PlayerView can score correctly.
- Reuse existing `optionColors` / `optionIcons` for MC rendering on both sides.

### 5. `src/pages/PlayerView.tsx`
- In `handleSubmitAnswer`, when `question.type === 'highbrow-lowbrow'`:
  - Parse `{ side, answer }`.
  - Use `checkAnswer` against the question (it already matches `correctAnswer` + `acceptableAnswers`).
  - Score via `calculateHighbrowLowbrowScore(isCorrect, side)`.
  - `kind = isCorrect ? 'exact' : 'wrong'` (no `close` tier).
  - Persist the submitted answer string as JSON so it can be displayed later if needed.

### 6. `src/components/quiz/QuestionDisplay.tsx`
- New host branch for `highbrow-lowbrow`:
  - During play (`!revealAnswer`): show only the Highbrow card with `200 PTS` badge and a muted note like "Players may reveal the Lowbrow (100 pts)".
  - On reveal: show both Highbrow and Lowbrow cards stacked, with the shared correct answer highlighted (quiz-green) under both. If MC, mark the correct option per side.

### 7. `src/components/quiz/QuestionEditor.tsx` + `src/pages/QuizCreator.tsx`
- When type is `highbrow-lowbrow`, the editor shows:
  - One **Correct answer** field (+ acceptable answers).
  - **Highbrow** section: prompt textarea, input type selector, options inputs if MC.
  - **Lowbrow** section: prompt textarea, input type selector, options inputs if MC.
- Persist new fields to `custom_quiz_questions`. The shared correct answer stays in `correct_answer`.

### 8. Database — `custom_quiz_questions`
- Add nullable columns via a migration:
  - `lowbrow_question text`
  - `highbrow_input_type text`
  - `lowbrow_input_type text`
  - `lowbrow_options jsonb`
- Update the question-loading mapper in `PlayerView.tsx` and `HostView.tsx` to hydrate these into `QuizQuestion`.
- No RLS/GRANT changes (columns added to existing table).

### 9. Sample data (`src/data/questionData.ts`)
- Add one example highbrow/lowbrow question so the built-in quiz can demo it.

### 10. Tests
- Add `calculateHighbrowLowbrowScore` unit tests in the scoring test file (200 / 100 / 0 cases).
- Add a `QuestionDisplay` test asserting only Highbrow shows during play and both show on reveal.

## Out of scope

- No partial credit, no speed bonus, no time reset.
- No "switch back to Highbrow" once Lowbrow is revealed.
- No host-side aggregation of who chose which side (could be a later enhancement).
