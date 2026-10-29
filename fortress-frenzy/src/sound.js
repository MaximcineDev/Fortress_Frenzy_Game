// All sound effects are synthesized on the fly with the Web Audio API.
// No .mp3/.wav files to bundle, license, or have go missing — and it
// keeps the app's download size tiny. Swap for real SFX files later by
// replacing the bodies of these functions; callers don't need to change.

let ctx = null;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

let muted = false;

function tone({ freq = 440, duration = 0.15, type = 'sine', volume = 0.2, freqEnd = null }) {
  if (muted) return;
  try {
    const audio = getCtx();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch (e) {
    // Audio can fail silently (autoplay policy before first user gesture) —
    // never let a sound glitch break gameplay.
  }
}

function noiseBurst({ duration = 0.25, volume = 0.25 }) {
  if (muted) return;
  try {
    const audio = getCtx();
    const bufferSize = audio.sampleRate * duration;
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    source.connect(gain).connect(audio.destination);
    source.start();
  } catch (e) {
    // ignore
  }
}

export const SFX = {
  setMuted(value) {
    muted = value;
  },
  isMuted() {
    return muted;
  },
  fire(unit) {
    tone({ freq: 320 + unit.projectileSpeed * 8, freqEnd: 180, duration: 0.12, type: 'triangle', volume: 0.15 });
  },
  hitBlock() {
    noiseBurst({ duration: 0.15, volume: 0.2 });
    tone({ freq: 140, duration: 0.1, type: 'square', volume: 0.1 });
  },
  explosion() {
    noiseBurst({ duration: 0.35, volume: 0.3 });
    tone({ freq: 90, freqEnd: 40, duration: 0.3, type: 'sawtooth', volume: 0.2 });
  },
  heal() {
    tone({ freq: 500, freqEnd: 800, duration: 0.25, type: 'sine', volume: 0.15 });
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.2, type: 'triangle', volume: 0.2 }), i * 120)
    );
  },
  lose() {
    [400, 340, 280].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, duration: 0.3, type: 'sawtooth', volume: 0.18 }), i * 180)
    );
  }
};
