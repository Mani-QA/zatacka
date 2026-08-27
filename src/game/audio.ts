/** Procedural SFX. Unlock on the first user gesture. */

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  muted = false;
  volume = 0.7;

  unlock() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyGain();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.ctx?.state === "suspended") {
          void this.ctx.resume();
        }
      });
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.applyGain();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyGain();
  }

  private applyGain() {
    if (!this.master || !this.ctx) return;
    const g = this.muted ? 0 : this.volume * this.volume;
    this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.02);
  }

  private env(duration: number, peak: number): GainNode | null {
    if (!this.ctx || !this.sfx) return null;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    g.connect(this.sfx);
    return g;
  }

  private tone(freq: number, duration: number, type: OscillatorType, peak = 0.12, detune = 0) {
    if (!this.ctx) return;
    const g = this.env(duration, peak);
    if (!g) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(g);
    o.start();
    o.stop(this.ctx.currentTime + duration + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  private noise(duration: number, peak: number, hp = 400) {
    if (!this.ctx) return;
    const g = this.env(duration, peak);
    if (!g) return;
    const n = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * duration), this.ctx.sampleRate);
    const data = n.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = n;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    src.connect(f);
    f.connect(g);
    src.start();
    src.stop(this.ctx.currentTime + duration);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      g.disconnect();
    };
  }

  countdown(n: number) {
    this.unlock();
    const f = n <= 0 ? 660 : 420;
    this.tone(f, n <= 0 ? 0.22 : 0.12, "square", 0.08);
  }

  go() {
    this.unlock();
    this.tone(520, 0.12, "square", 0.1);
    this.tone(780, 0.18, "square", 0.08, 8);
  }

  death() {
    this.unlock();
    this.noise(0.18, 0.16, 200);
    this.tone(220, 0.28, "sawtooth", 0.1);
    this.tone(140, 0.32, "sine", 0.08);
  }

  win() {
    this.unlock();
    this.tone(392, 0.16, "square", 0.08);
    setTimeout(() => this.tone(523, 0.16, "square", 0.08), 90);
    setTimeout(() => this.tone(659, 0.28, "square", 0.1), 180);
  }

  roundEnd() {
    this.unlock();
    this.tone(330, 0.2, "triangle", 0.08);
  }
}

export const audio = new GameAudio();
