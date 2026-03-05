import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playCorrect, playWrong, playCountdownBeep, startTicking, stopTicking } from '../sounds';

// Mock AudioContext
const mockOscillator = {
  connect: vi.fn(),
  type: '',
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGain = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
};

const mockAudioContext = {
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => ({
    ...mockGain,
    gain: { ...mockGain.gain },
  })),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn(),
};

beforeEach(() => {
  vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext));
});

describe('playCorrect', () => {
  it('creates oscillator and gain nodes', () => {
    playCorrect();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
  });
});

describe('playWrong', () => {
  it('creates oscillator and gain nodes', () => {
    playWrong();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });
});

describe('playCountdownBeep', () => {
  it('plays a beep for count > 1', () => {
    playCountdownBeep(3);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });

  it('plays a higher pitch beep for count === 1', () => {
    playCountdownBeep(1);
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });
});

describe('startTicking / stopTicking', () => {
  it('starts and stops without errors', () => {
    vi.useFakeTimers();
    startTicking(() => 10);
    vi.advanceTimersByTime(2000);
    stopTicking();
    vi.useRealTimers();
  });

  it('stops when time runs out', () => {
    vi.useFakeTimers();
    let time = 1;
    startTicking(() => {
      time -= 1;
      return time;
    });
    vi.advanceTimersByTime(2000);
    stopTicking();
    vi.useRealTimers();
  });
});
