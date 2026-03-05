

## Code Review: Issues and Refactoring Plan

After a thorough review, here are the issues found ranked by severity, followed by the implementation plan.

---

### Critical Bugs

**1. PlayerView duplicates pre-countdown logic instead of using `usePreCountdown` hook**
`PlayerView.tsx` lines 58-84 manually re-implement the pre-countdown with a dynamic import of `playCountdownBeep`, bypassing the `usePreCountdown` hook's `startPreCountdown()` method entirely. The hook is imported and its state is used for rendering, but `startPreCountdown()` is never called. This means the player's pre-countdown is fragile and diverges from the host's behavior.

**2. Host sets `question_started_at` BEFORE the 3-second pre-countdown finishes**
In `HostView.tsx` line 100, `updateStatus('question', 0)` sets `question_started_at = new Date().toISOString()` immediately. But the actual timer starts 3 seconds later (after `startPreCountdown` completes). This means the player's `timeTaken` calculation is off by ~3 seconds, giving them fewer points than they deserve. The fix: set `question_started_at` when `onDone` fires, not when status changes.

**3. CountdownTimer `onComplete` can fire multiple times**
The `useEffect` on line 43 depends on `timeLeft <= 0` (a derived boolean), and the effect on line 24 also calls `onComplete`. There's no guard preventing double-firing. This could cause `showAnswer` to be set redundantly or race with other state changes.

**4. `answerCount` never resets between questions for existing players**
In `HostView`, `answerCount` resets in `nextQuestion` and `startQuiz`, but the realtime listener on `answers` INSERT increments it forever. If a player's answer INSERT arrives late (after `nextQuestion` resets count), it inflates the count for the next question, potentially triggering premature auto-skip.

### Moderate Issues

**5. PlayerView polling recreates `handleSessionTransition` every render**
The `useEffect` on line 97 has `[sessionId, playerId]` deps but uses `handleSessionTransition` which changes on every render (due to `timer` object identity). This is a stale closure risk and can cause missed transitions.

**6. No error handling on initial data loads**
`refreshSession`, `refreshPlayer`, `refreshPlayers` all silently ignore errors. If the initial load fails (network hiccup), the user sees a blank screen with no feedback.

**7. `useQuizSession` hook is partially unused**
The `submitAnswer` function in `useQuizSession` duplicates logic that `PlayerView` handles directly. The hook also doesn't use `usePreCountdown`. This creates confusion about which path is canonical.

### Minor / Polish

**8. Ticking sound starts with wrong time reference on player**
Lines 73-80 in PlayerView compute time left using a complex expression that mixes `next.question_started_at` and `timer.startTimeRef.current` — the latter hasn't been set yet when the closure captures it.

**9. No "play again" flow from finished state**
Both host and player are stuck on the final screen with no way back.

---

### Implementation Plan

#### Task 1: Fix `question_started_at` timing (Critical)
- Move `question_started_at` assignment from `updateStatus` into the `onDone` callback of `startPreCountdown`
- In `HostView.startQuiz` and `nextQuestion`: call `updateStatus('question', idx)` without setting timestamp, then in `startPreCountdown`'s callback, update `question_started_at` to `new Date().toISOString()` and start timer

#### Task 2: Unify PlayerView pre-countdown with the hook (Critical)
- Replace the manual `setInterval`/`playCountdownBeep` logic in `handleSessionTransition` with a call to `startPreCountdown(onDone)`
- The `onDone` callback starts the timer using `serverStart` from the session's (now correctly timed) `question_started_at`
- Remove the dynamic `import('@/lib/sounds')` pattern

#### Task 3: Fix CountdownTimer double-fire (Critical)
- Add a `completedRef` guard to prevent `onComplete` from being called more than once per countdown cycle
- Reset the guard when `isRunning` transitions to `true`

#### Task 4: Fix answerCount race with question transitions (Moderate)
- Include `question_index` tracking — only count answers matching the current question index
- Or reset `answerCount` in the realtime handler when the question changes

#### Task 5: Add error handling for initial data loads (Moderate)
- Add toast notifications when `refreshSession`/`refreshPlayer` fail
- Show a retry-able error state if the session can't be loaded at all (e.g., invalid session ID)

#### Task 6: Add "Play Again" button on finished screen (Minor)
- Host finished screen: add a "New Quiz" button that navigates to `/`
- Player finished screen: add a "Play Again" button that navigates to `/`

#### Task 7: Clean up unused `useQuizSession.submitAnswer` (Minor)
- Remove `submitAnswer` from `useQuizSession` since `PlayerView` handles answer submission directly with retry logic
- Keep the hook focused on session creation and joining

