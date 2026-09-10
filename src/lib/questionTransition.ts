/**
 * Shared reset used whenever the quiz advances to another question.
 *
 * Both the host screen and the players' phones derive "the answer is revealed"
 * from local state (`showAnswer` on the host, `answered`/result state on the
 * player) plus the timer's elapsed time. If any of that survives a question
 * swap, the new question renders for a moment already revealed — the answer
 * flash. Everything that could carry over is cleared here, in one place, and
 * always BEFORE the session/question index changes.
 */
export interface QuestionResetHandles {
  /** Clears the view's reveal/result state (showAnswer, points, picks, ...). */
  clearRevealState: () => void;
  /** Timer handle — reset, never merely stopped, so elapsed time drops to 0. */
  timer: { reset: () => void };
  /** Cancels any in-flight 3-2-1 pre-countdown. */
  clearPreCountdown: () => void;
  /** Optional extra teardown (ticking sound, per-question counters, ...). */
  onCleanup?: () => void;
}

export function resetForNextQuestion({
  clearRevealState,
  timer,
  clearPreCountdown,
  onCleanup,
}: QuestionResetHandles): void {
  // Order matters: reveal state first, so no render can pair a new question
  // with an old reveal.
  clearRevealState();
  timer.reset();
  clearPreCountdown();
  onCleanup?.();
}
