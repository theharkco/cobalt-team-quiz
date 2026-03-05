

## Collaborative Quiz App — "Quiz Clash"

### Overview
A real-time multiplayer quiz app where a host controls the flow on a shared screen while up to 30 players join on their own devices and compete for points. Colorful, playful Kahoot-style design with bouncy animations, confetti, and vibrant gradients.

### Backend: Supabase (Lovable Cloud)
- **Realtime channels** for syncing quiz state (current question, timer, answers) across all devices
- **Database tables**: `quiz_sessions` (join code, status, current question), `players` (name, session, score), `answers` (player, question, answer, time taken)
- No authentication — players just enter a name and 4-digit join code

### Screens & Flow

**1. Landing Page**
- Two big buttons: "Host a Quiz" and "Join a Quiz"
- Colorful gradient background with floating animated shapes

**2. Host View**
- Generates a unique 4-digit join code displayed prominently
- Shows lobby with player names appearing in real-time as they join
- "Start Quiz" button once ready
- During quiz: shows the question + answer options on the big screen, live countdown timer with animated ring, and a "Next Question" button after each round
- After each question: animated leaderboard with position changes (bars sliding up/down, score counters ticking up)

**3. Player View**
- Enter name + join code → enter lobby (waiting screen with fun animations)
- During quiz: see the question + tap answer options or type free text answer
- After answering: "Waiting for others..." screen
- After each question: see their rank + points earned with celebration animations

### 15 Static Questions (4 Types)

**Multiple Choice (6 questions)** — Classic trivia with 4 colorful answer buttons

**Free Text (3 questions)** — Type-your-answer with fuzzy matching for minor typos

**Blurred Image Reveal (3 questions)** — Image starts heavily blurred/pixelated and progressively sharpens over 15 seconds. Mix of celebrities, landmarks, and objects. Free text answer. More points for answering before the image fully clears.

**Music Round (3 questions)** — Embedded Spotify player plays a snippet. 4 multiple choice options for artist/title. Host screen shows the player, player screens show answer options.

### Scoring System
- Correct answer: base 1000 points
- Time bonus: up to +500 points for answering in under 3 seconds, scaling down linearly
- Wrong answer: 0 points

### Animated Leaderboard (after every question)
- Player bars with avatars (colored circles with initials)
- Smooth reordering animation as rankings change
- Score counter animates up
- Top 3 get gold/silver/bronze highlights
- Confetti burst for the leader
- Final results screen with podium animation + celebration

### Visual Design
- Vibrant gradient backgrounds (purple → pink → orange) shifting per question
- Large, bold rounded typography
- Bouncy spring animations on buttons and cards
- Pulsing countdown timer ring
- Emoji reactions floating up when players answer
- Screen shake on wrong answers, confetti on correct

### Tech Details
- Supabase Realtime Broadcast for instant sync (no polling)
- CSS/Tailwind animations + keyframes for all visual effects
- Spotify Embed (iframe) for music questions — no API auth needed, just embed URLs
- Responsive: host view optimized for laptop/projector, player view optimized for mobile

