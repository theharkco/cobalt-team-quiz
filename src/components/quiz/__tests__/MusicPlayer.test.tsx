import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import MusicPlayer from '../MusicPlayer';

/**
 * The clip must start at the same point in the song on every device, so a phone
 * that gets the question 5s late joins mid-clip instead of restarting it.
 */
describe('MusicPlayer clip synchronization', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', { value: 1, configurable: true });
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', { value: 30, configurable: true });
  });

  const renderPlayer = (startEpochMs?: number) => {
    const { container } = render(
      <MusicPlayer previewUrl="https://example.com/clip.m4a" playing startEpochMs={startEpochMs} />
    );
    return container.querySelector('audio') as HTMLAudioElement;
  };

  it('seeks to the shared position when the device joins late', () => {
    const audio = renderPlayer(Date.now() - 5000);
    expect(audio.currentTime).toBeGreaterThan(4.5);
    expect(audio.currentTime).toBeLessThan(6);
  });

  it('starts from the beginning when the question just began', () => {
    const audio = renderPlayer(Date.now());
    expect(audio.currentTime).toBeLessThan(0.35);
  });

  it('does not seek past the end of the clip', () => {
    const audio = renderPlayer(Date.now() - 60000);
    expect(audio.currentTime).toBeLessThanOrEqual(30);
  });

  it('plays from the start when no shared timestamp is available', () => {
    const audio = renderPlayer(undefined);
    expect(audio.currentTime).toBe(0);
  });
});
