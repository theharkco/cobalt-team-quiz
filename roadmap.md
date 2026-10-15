# Quizclash roadmap

- [x] Replace mixed front-page actions with game selection followed by mode-specific actions, retaining global joining and direct quiz links.
- [x] Verify navigation, keyboard focus, code/name joining and narrow/wide layouts without adding completed test games to records; five tests passed and live Pencil lobby joining verified at 390/768/1280 widths.

- [x] Let the host join as a player in the same tab, reusing drawing/guessing and keeping host controls.
- [x] Verified live host drawing, guessing, handoffs, saved score after refresh, next-word recovery and hidden-word UI; fifteen regression tests passed.

- [x] Reduce hidden-host-tab stalls with a worker clock and deadline-driven reveals; verified live handoff, rejection, correct scoring and next word with host window intervals stopped, plus four clock tests.

- [x] Shared guess chat above contestants with names and hidden correct answers; verified host and three phones.
- [x] Restore historical team record and top ten individual scores on pencil screens; verified saved scores and layouts at 390/768/1280px.

- [x] Compact score-ranked characters with twenty distinct rendered colors, six faces and animated red rejection bubbles; verified with twenty live players.
- [x] Audited all drawing prompts; replaced abstract/overly trivial words and weighted selection toward concrete medium prompts.
- [x] Clear passed-pencil guessing restriction; verified live handoff, next-word reset and descending persisted scores.

- [x] Replace 3D contestants with expressive floating 2D characters; verified confirmed verdict bubbles and hidden correct answers in a four-player round.
- [x] Improve in-game layout; verified team stays right of the canvas with no overflow at 390, 768 and 1280px.

- [x] Pass the Pencil: roaming miniature top-down world, overhead verdict bubbles, and persistent green solved zone.
- [x] Pass the Pencil: keep the word open after correct guesses; verified four live players, all saved awards, mobile layout, and 24 regression tests.

- [x] Pass the Pencil: immediate confirmed wrong-guess feedback, guessing above canvas, no personal guess history.
- [x] Pass the Pencil: animated 3D contestant stage; verified host and player live flow and character motion.

- [x] Pass the Pencil: adjustable artist/game time sliders and time-scaled escalating team points; verify live round.
- [x] Pass the Pencil: guesser points decrease with elapsed word time, never with guess count; verify awards and feedback match.

- [x] Full UI redesign (graphite/cyan/lime stage system)
- [x] Infinite Canvas co-op drawing game: host-set game length, artist rotation, prompts, live drawing, guessing, scoring, gallery, results
- [x] Drawing game: verified a live three-player round, handoff, correct guess, score persistence and results.
- [x] Front-page tagline: random sentence from a library (112 lines)
- [x] Front-page tagline: type it out live, then rotate to a new sentence every few seconds
- [ ] Later: all-time record per named team, AI synonym matching, fun awards
