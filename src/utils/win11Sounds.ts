let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sharedCtx = new AudioCtx();
    }
    if (sharedCtx.state === 'suspended') {
      void sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

export type Win11SoundType =
  | 'startup'
  | 'shutdown'
  | 'notify'
  | 'error'
  | 'click'
  | 'unlock'
  | 'lock'
  | 'snap'
  | 'appOpen';

export function playWin11Sound(type: Win11SoundType | string, volume = 60, isMuted = false): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const gainVal = Math.max(0.02, Math.min(0.35, (volume / 100) * 0.25));
  const now = ctx.currentTime;

  try {
    if (type === 'startup' || type === 'unlock') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.001, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(gainVal, now + i * 0.09 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.5);
      });
    } else if (type === 'notify' || type === 'snap') {
      const notes = type === 'snap' ? [587.33, 880] : [659.25, 987.77];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.001, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(gainVal * 0.8, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.3);
      });
    } else if (type === 'error' || type === 'lock') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(type === 'error' ? 220 : 392, now);
      osc.frequency.exponentialRampToValueAtTime(type === 'error' ? 165 : 261.63, now + 0.22);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(gainVal * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  } catch {
    // ignore audio errors
  }
}

export function playVolumeTestPing(volume = 80): void {
  playWin11Sound('click', volume);
}

let masterVolumePercent = 80;
export function setMasterSystemAudioVolume(volume: number, isMuted = false): void {
  masterVolumePercent = isMuted ? 0 : Math.max(0, Math.min(100, volume));
}
