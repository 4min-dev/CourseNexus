let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function playNotificationSound(type: "client" | "admin" = "client") {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    if (type === "admin") {
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      osc1.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(660, ctx.currentTime);
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } else {
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587, ctx.currentTime);
      osc1.frequency.setValueAtTime(784, ctx.currentTime + 0.12);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(587, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.25);
    }
  } catch {}
}

export function getSoundEnabled(key: string): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? true : v === "true";
  } catch { return true; }
}

export function setSoundEnabled(key: string, enabled: boolean) {
  try { localStorage.setItem(key, String(enabled)); } catch {}
}
