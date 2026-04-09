

## Plan: "Closest Without Going Over" Question Type

### Key Design Challenge

Unlike all existing question types where each player scores independently at submit time, this type requires **collective scoring** — points depend on how a player's guess ranks against all other players' guesses. This means scoring must be **deferred** until all answers are in.

### Architecture

```text
Player submits guess → stored with 0 points
Timer expires / all answered → Host triggers rank-based scoring
Host fetches all answers → filters overshots → ranks by proximity → assigns points → batch updates
```

### Files to Change

**1. Type definition (`src/data/questionTypes.ts`)**
- Add `'closest-without-going-over'` to `QuestionType`
- Add `numericAnswer?: number` field to `QuizQuestion` for the correct numeric value

**2. Scoring logic (`src/data/scoring.ts`)**
- Add `calculateClosestWithoutGoingOverScores(guesses: {playerId: string, answer: number}[], correctAnswer: number): Map<string, number>`
- Filter out guesses > correctAnswer (0 points)
- Sort remaining by distance ascending
- Sliding scale: 1st place = 1000pts, 2nd = 700, 3rd = 400, 4th = 200, rest = 100

**3. Player input (`src/components/quiz/PlayerAnswerInput.tsx`)**
- Add numeric input mode for this question type (number input field + submit button)

**4. Player answer handling (`src/pages/PlayerView.tsx`)**
- For `closest-without-going-over`, submit the numeric guess with `points: 0` (deferred scoring)
- Show "Waiting for all guesses..." instead of instant score feedback
- After host scores, show the result via player score refresh

**5. Host scoring logic (`src/pages/HostView.tsx`)**
- When `showAnswer` becomes true for this type, fetch all answers for the current question from the database
- Run `calculateClosestWithoutGoingOverScores` to determine rank-based points
- Batch update each answer's `points_earned` and each player's `score` in the database
- Display a ranked results table showing each player's guess, distance, and points earned

**6. Answer reveal UI (both views)**
- Host: show correct number + ranked list of guesses with points
- Player: show correct number + their guess + whether they went over

**7. Quiz Editor (`src/components/quiz/QuestionEditor.tsx`)**
- Add the new type to the dropdown
- Show a "Correct Number" input (numeric) instead of text correct answer
- No options needed for this type

**8. Quiz persistence (`src/pages/QuizCreator.tsx`)**
- Map `numericAnswer` to `correct_answer` (stored as string, parsed back to number)
- Handle loading for this type

**9. Re-exports (`src/data/questions.ts`, `src/data/answerMatching.ts`)**
- Export new scoring function
- `checkAnswer` returns `'none'` for this type (scoring is deferred)

