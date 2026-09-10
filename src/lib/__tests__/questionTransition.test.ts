import { describe, it, expect, vi } from "vitest";
import { resetForNextQuestion } from "@/lib/questionTransition";

describe("resetForNextQuestion", () => {
  it("clears reveal state before the timer and pre-countdown", () => {
    const calls: string[] = [];
    resetForNextQuestion({
      clearRevealState: () => calls.push("reveal"),
      timer: { reset: () => calls.push("timer") },
      clearPreCountdown: () => calls.push("preCountdown"),
      onCleanup: () => calls.push("cleanup"),
    });
    expect(calls).toEqual(["reveal", "timer", "preCountdown", "cleanup"]);
  });

  it("resets the timer rather than only stopping it", () => {
    const reset = vi.fn();
    resetForNextQuestion({
      clearRevealState: () => {},
      timer: { reset },
      clearPreCountdown: () => {},
    });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("works without optional cleanup", () => {
    expect(() =>
      resetForNextQuestion({
        clearRevealState: () => {},
        timer: { reset: () => {} },
        clearPreCountdown: () => {},
      })
    ).not.toThrow();
  });
});
