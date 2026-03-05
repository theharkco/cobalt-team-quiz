

## Plan: CSS-Crop Spotify Iframe to Play Controls Only

**Goal:** Use CSS cropping (`overflow: hidden` + negative offset) to permanently hide the song title/artist in the Spotify embed, exposing only the play button area. Never reveal the full player.

### Changes to `QuestionDisplay.tsx` — `MusicEmbed` component:

1. **Remove overlay entirely** — no more "Tap to Play" button, no `playState` state machine, no "Playing — Hide" button
2. **CSS crop the iframe** — wrap in a container with `overflow: hidden` and a small fixed height (~80px). Offset the iframe with negative `margin-top` to shift the title/artwork out of view, leaving only the playback controls visible
3. **Remove `revealAnswer` prop** from `MusicEmbed` — the player is always cropped, answer reveal doesn't change the embed
4. **Keep the 🎵 label** above the cropped player so users know it's a music question

### Changes to `QuestionDisplay.test.tsx`:

- Remove test for `autoplay=1` in iframe src
- Remove test for 🎵 emoji overlay (overlay is gone)
- Add test that iframe is rendered inside a cropped container

