

## Refactoring Plan for Quiz Clash

### 1. Duplicated Session Transition Logic (High Priority)

**Problem:** `PlayerView.tsx` has the exact same session-transition logic duplicated between the realtime handler (lines 50-77) and the polling fallback (lines 81-111). Both blocks reset `answered`, `lastResult`, start timers, and handle leaderboard/finished transitions identically.

**Fix:** Extract a `handleSessionTransition(prev: QuizSession, next: QuizSession)` function and call it from both the realtime callback and the polling callback. This eliminates ~30 lines of duplication and ensures both paths stay in sync.

---

### 2. Duplicated Timer Management (Medium Priority)

**Problem:** Timer start/stop/clear logic is repeated across `HostView.tsx` and `PlayerView.tsx` (start interval, clear interval ref, track elapsed time). Both files manage `timerInterval` refs, `timeElapsed` state, and `timerRunning` state identically.

**Fix:** Create a `useTimer(durationMs)` custom hook that encapsulates `timeElapsed`, `isRunning`, `start()`, `stop()`, and `reset()`. Both views import and use this hook.

---

### 3. CountdownTimer Bug (High Priority)

**Problem:** `CountdownTimer.tsx` line 36 uses `timeLeft <= 0` directly in the `useEffect` dependency array. This evaluates to a boolean, so the effect only re-runs when crossing the 0 boundary, not on every tick. The timer also doesn't reset when `isRunning` transitions from false to true for a new question — only `duration` changes trigger a reset.

**Fix:** 
- Reset `timeLeft` when `isRunning` changes to `true` (new question starts).
- Fix the dependency to properly track running state: `[isRunning]` and guard inside the effect.

---

### 4. Missing Error Handling on DB Writes (High Priority)

**Problem:** `PlayerView.handleSubmitAnswer` fires two sequential Supabase calls (insert answer, update score) with no error handling. If the insert fails, the score still updates locally. If the score update fails, the local state diverges from the database. `HostView.updateStatus` also silently ignores errors after optimistic updates.

**Fix:**
- Wrap DB calls in try/catch blocks.
- On failure, show a toast notification and revert optimistic state where applicable.
- Add a simple retry (1 retry with 1s delay) for transient network errors on critical writes (answer submission, score update).

---

### 5. Sound `AudioContext` Error Handling (Low Priority)

**Problem:** `sounds.ts` creates an `AudioContext` eagerly on first call. Browsers block `AudioContext` creation before user interaction, which would throw. No try/catch wrapping exists.

**Fix:** Wrap `getCtx()` and all sound functions in try/catch to silently fail if audio isn't available. Resume suspended context on first user interaction.

---

### 6. `useQuizSession` Hook is Unused by Host/Player (Low Priority — Cleanup)

**Problem:** `useQuizSession.ts` is only used by `Index.tsx` for `createSession` and `joinSession`. `HostView` and `PlayerView` both implement their own independent Supabase subscriptions and state management, duplicating the subscription setup pattern.

**Fix:** This is acceptable for now since Host and Player have different needs, but the types (`Player`, `QuizSession`, `SessionStatus`) should be moved to a shared `types.ts` file instead of being re-exported from the hook.

---

### 7. Race Condition: Player Timer Desync (Medium Priority)

**Problem:** When a new question starts, the player's `questionStartRef` is set to `Date.now()` when the realtime/polling event arrives — not when the host actually started the question. Network latency means the player's timer starts late, giving them slightly more effective time and a scoring advantage.

**Fix:** Add a `question_started_at` timestamp column to `quiz_sessions`. The host writes it when starting a question. Players use this server timestamp to calculate `timeTaken` instead of local `Date.now()`.

---

### 8. Player Can Submit Answer After Timer Expires via Network (Medium Priority)

**Problem:** The answer submission check (`if (answered) return`) is client-side only. A slow network could allow a submission after the 15s window. The `onTimerComplete` sets `answered=true` locally, but if `handleSubmitAnswer` was already in-flight, both the "timed out" and the late answer could be recorded.

**Fix:** Add server-side validation: before inserting an answer, check `time_taken_ms <= 15000` in the insert or via a database trigger that rejects late answers.

---

### Summary of Changes

| File | Changes |
|---|---|
| `src/pages/PlayerView.tsx` | Extract transition handler, add error handling/retry on DB writes |
| `src/pages/HostView.tsx` | Add error handling on DB writes, use shared timer hook |
| `src/hooks/useTimer.ts` | New hook for timer management |
| `src/types/quiz.ts` | New file for shared types |
| `src/lib/sounds.ts` | Add try/catch wrapping |
| `src/components/quiz/CountdownTimer.tsx` | Fix reset on `isRunning` change, fix dependency array |
| `src/hooks/useQuizSession.ts` | Import types from shared file |
| Database migration | Add `question_started_at` column to `quiz_sessions`, add answer validation trigger |

