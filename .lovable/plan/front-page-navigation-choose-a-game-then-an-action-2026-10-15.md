# Front-page navigation: choose a game, then an action

## Direction
Replace the three equal front-page buttons with two clear game choices: **Quiz** and **Pass the Pencil**. Selecting a game reveals its actions in the same area rather than immediately starting a session.

The current buttons mix two Quiz actions—“Host a quiz” and “Make a quiz”—with a game name that immediately creates a Pencil session. Separate the game choice from the action without adding new game features.

## Front-page experience
- Keep **Go, Cobalt!**, the rotating one-liner, and the existing playful visual identity.
- Keep **joining with a game code** visible and independent of game selection. Guests do not need to choose a mode; their code determines it.
- Present two equally prominent choices: **Quiz** and **Pass the Pencil**, with their existing recognizable icons and distinct color treatments.
- Selecting either replaces the game choices with a clearly titled action view and a **Back to games** control.
- **Quiz:** show **Host a quiz** as the primary action and **Make a quiz** as the secondary action. Hosting opens the existing quiz picker; making opens the existing quiz builder.
- **Pass the Pencil:** show **Host a game**, opening the existing lobby where the host can configure the game and choose to participate. Do not add a quiz-style builder or a second, redundant “play” action.
- Keep the join form available during both action views. When a Pencil code is found, ask **“What's your name?”** rather than the current team-name question; retain team wording for Quiz.

## Navigation and feedback
- Show the selected game name prominently so users always know which game they are about to host.
- Give browser Back predictable behavior through game selection, actions, and the quiz picker; preserve existing direct links to the quiz picker and builder.
- Animate the switch between choices and actions briefly, respecting reduced-motion preferences.
- Disable session-start actions while starting a game so repeated clicks cannot launch multiple sessions.

## Technical scope
- Update front-page presentation and navigation state in `src/pages/Index.tsx`, using the existing design-system controls and semantic color tokens.
- Reuse existing hosting, joining, quiz picker, builder, and Pencil lobby flows. No database, scoring, timing, or gameplay changes.
- Keep the existing `?host=quiz` entry working; use URL-backed selection state for the new front-page views.

## Verification
- Test both game selections, returning to games, browser Back, and existing direct quiz links.
- Verify Quiz hosting and making reach their existing screens, and Pencil hosting reaches its existing lobby.
- Verify code-first joining still selects the right game and displays the appropriate name label.
- Check keyboard focus, loading states, and narrow/wide layouts without introducing completed test games into all-time records.