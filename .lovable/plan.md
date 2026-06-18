## Plan: Per-Slot Breakdown for "Put in Order" (Player View)

After a player submits their order, show a compact slot-by-slot breakdown — each of the 4 items marked correct/wrong with the points contributed — before they see the leaderboard.

### Where
`src/pages/PlayerView.tsx`, inside the existing `answered` result card (the green/yellow/red feedback box), within the `currentQ.type === 'put-in-order'` branch.

### What to show
For each slot 1–4, a row with:
- Slot number
- The player's pick
- ✓ (green) if it matches the correct item at that index, ✗ (red) if not
- `+200` next to correct slots, dimmed `+0` next to wrong ones

Below the rows: a small summary line like `3 / 4 correct • +600 pts` (plus `+200 all-correct bonus` and `+XXX speed bonus` when applicable).

### Data flow
The player's submitted order is already JSON-encoded into the `answer` string in `handleSubmitAnswer`. To render the breakdown we need the parsed array available at render time. Store it in a new `lastPutInOrderPicks: string[] | null` state, set it inside `handleSubmitAnswer` right before calling `submitResult`, and clear it on question transition (alongside `setLastPoints(0)`).

Use the existing `calculatePutInOrderScore` return values (`correctCount`, `total`) for the summary; per-slot correctness is recomputed inline by comparing `lastPutInOrderPicks[i]` to `currentQ.options[i]` (same case-insensitive compare as scoring).

### Visual
- Reuse existing card styling (`bg-card border border-border rounded-xl`)
- Correct rows: `text-quiz-green` with ✓
- Wrong rows: `text-muted-foreground` with ✗ and strikethrough on the pick
- The correct order list that already renders stays — it acts as the answer key shown alongside the breakdown

### Out of scope
- Host view (per user choice)
- Other question types (per user choice)
- No DB schema or scoring logic changes