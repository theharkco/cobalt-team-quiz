/**
 * Regression test for the "next question flashes the previous answer" bug.
 *
 * The host advances questions asynchronously: the session row is updated (which
 * swaps the rendered question) and the reveal state has to be cleared. If the
 * reveal state is cleared *after* the session update lands, the new question
 * renders for one or more frames with revealAnswer still enabled — the answer
 * flash players reported.
 *
 * This test drives both orderings through a harness that mirrors HostView's
 * nextQuestion() and records every (question, revealAnswer) pair that reaches
 * QuestionDisplay:
 *   - "buggy"  ordering must produce a frame with the NEW question + reveal on
 *              (proving the test actually reproduces the flash)
 *   - "fixed"  ordering, matching HostView today, must never do so.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import QuestionDisplay from "@/components/quiz/QuestionDisplay";
import type { QuizQuestion } from "@/data/questions";

const questions: QuizQuestion[] = [
  {
    id: "q-first",
    question: "Put these in order",
    type: "put-in-order",
    options: ["Alpha", "Beta", "Gamma", "Delta"],
    correctAnswer: "Alpha",
    timeLimitSeconds: 15,
  } as QuizQuestion,
  {
    id: "q-second",
    question: "And these",
    type: "put-in-order",
    options: ["One", "Two", "Three", "Four"],
    correctAnswer: "One",
    timeLimitSeconds: 15,
  } as QuizQuestion,
];

type Frame = { questionId: string; revealAnswer: boolean };
let frames: Frame[] = [];

function RecordingQuestionDisplay(props: {
  question: QuizQuestion;
  revealAnswer: boolean;
}) {
  frames.push({ questionId: props.question.id, revealAnswer: props.revealAnswer });
  return (
    <QuestionDisplay
      question={props.question}
      questionNumber={1}
      totalQuestions={questions.length}
      isHost
      revealAnswer={props.revealAnswer}
    />
  );
}

/** Simulates the async session update that swaps the rendered question. */
const updateSession = (apply: () => void) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      act(() => apply());
      resolve();
    }, 0);
  });

function HostHarness({ ordering }: { ordering: "buggy" | "fixed" }) {
  // Start on question 0 with its answer revealed, as the host does before
  // pressing "Next Question".
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(true);

  const nextQuestion = async () => {
    if (ordering === "fixed") setShowAnswer(false);
    await updateSession(() => setIndex(1));
    if (ordering === "buggy") {
      // The old code cleared reveal state only once the new question had
      // started (a later tick), leaving a window where the new question was
      // already on screen with the reveal still on.
      await new Promise((r) => setTimeout(r, 0));
      act(() => setShowAnswer(false));
    }
  };

  return (
    <div>
      <button onClick={() => void nextQuestion()}>Next Question</button>
      <RecordingQuestionDisplay question={questions[index]} revealAnswer={showAnswer} />
    </div>
  );
}

const flashFrames = () =>
  frames.filter((f) => f.questionId === "q-second" && f.revealAnswer);

describe("next-question transition", () => {
  beforeEach(() => {
    frames = [];
  });

  it("reproduces the answer flash when reveal state is cleared after the question swaps", async () => {
    render(<HostHarness ordering="buggy" />);
    await act(async () => {
      screen.getByRole("button", { name: "Next Question" }).click();
      await new Promise((r) => setTimeout(r, 20));
    });

    // The bug: the new question rendered while the answer was still revealed.
    expect(flashFrames().length).toBeGreaterThan(0);
  });

  it("never renders the next question with revealAnswer enabled", async () => {
    render(<HostHarness ordering="fixed" />);
    await act(async () => {
      screen.getByRole("button", { name: "Next Question" }).click();
      await new Promise((r) => setTimeout(r, 20));
    });

    // The new question must have rendered...
    expect(frames.some((f) => f.questionId === "q-second")).toBe(true);
    // ...and never once with the answer revealed.
    expect(flashFrames()).toEqual([]);

    // And the DOM confirms it: unrevealed put-in-order slots show "?" markers,
    // revealed ones show 1..n.
    await waitFor(() => {
      expect(screen.getByText("One")).toBeInTheDocument();
    });
    expect(screen.queryAllByText("?").length).toBe(questions[1].options!.length);
  });
});
