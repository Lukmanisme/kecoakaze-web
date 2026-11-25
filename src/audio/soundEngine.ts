export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buzzOsc: OscillatorNode | null = null;
  private buzzGain: GainNode | null = null;

  public muted = false;
  private crawlActive = false;
  private crawlCooldown = 0;

  public unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.45;
    this.masterGain.connect(this.ctx.destination);

    // Continuous flight buzz oscillator (muted until flying)
    this.buzzOsc = this.ctx.createOscillator();
    this.buzzOsc.type = 'sawtooth';
    this.buzzOsc.frequency.value = 145;
    const buzzFilter = this.ctx.createBiquadFilter();
    buzzFilter.type = 'lowpass';
    buzzFilter.frequency.value = 520;
    this.buzzGain = this.ctx.createGain();
    this.buzzGain.gain.value = 0;
    this.buzzOsc.connect(buzzFilter);
    buzzFilter.connect(this.buzzGain);
    this.buzzGain.connect(this.masterGain);
    this.buzzOsc.start();

    this.startStoveAmbience();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.45, this.ctx.currentTime, 0.04);
    }
  }

  private startStoveAmbience(): void {
    if (!this.ctx || !this.masterGain) return;
    const bufSize = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 1.4;

    const stoveGain = this.ctx.createGain();
    stoveGain.gain.value = 0.035;

    noise.connect(filter);
    filter.connect(stoveGain);
    stoveGain.connect(this.masterGain);
    noise.start();
  }

  public tick(dt: number): void {
    if (!this.crawlActive || !this.ctx || this.muted) return;
    this.crawlCooldown -= dt;
    if (this.crawlCooldown <= 0) {
      this.crawlCooldown = 0.095;
      this.playTone(320 + Math.random() * 140, 220, 0.028, 'triangle', 0.06);
    }
  }

  public setCrawlActive(active: boolean): void {
    this.crawlActive = active;
  }

  public setFlightBuzz(active: boolean, speedRatio: number): void {
    if (!this.ctx || !this.buzzGain || !this.buzzOsc) return;
    const now = this.ctx.currentTime;
    if (active) {
      this.buzzOsc.frequency.setTargetAtTime(140 + speedRatio * 55, now, 0.06);
      this.buzzGain.gain.setTargetAtTime(0.11, now, 0.05);
    } else {
      this.buzzGain.gain.setTargetAtTime(0, now, 0.05);
    }
  }

  public playTakeoff(): void {
    this.playTone(180, 420, 0.14, 'triangle', 0.18);
  }

  public playLanding(): void {
    this.playTone(170, 75, 0.09, 'sine', 0.18);
  }

  public playDodge(): void {
    this.playTone(540, 260, 0.12, 'sine', 0.16);
  }

  public playActionTick(): void {
    this.playTone(420 + Math.random() * 120, 480, 0.04, 'square', 0.05);
  }

  public playPrankComplete(): void {
    this.playTone(440, 660, 0.15, 'triangle', 0.22);
    setTimeout(() => this.playTone(660, 880, 0.2, 'triangle', 0.2), 110);
  }

  public playStarUnlock(): void {
    this.playTone(523, 523, 0.12, 'triangle', 0.22);
    setTimeout(() => this.playTone(659, 659, 0.12, 'triangle', 0.22), 90);
    setTimeout(() => this.playTone(784, 1046, 0.24, 'triangle', 0.24), 180);
  }

  public playIbuAlert(): void {
    this.playTone(480, 620, 0.16, 'triangle', 0.2);
  }

  public playIbuGasp(): void {
    this.playTone(650, 920, 0.22, 'sawtooth', 0.16);
  }

  public playIbuAnger(): void {
    this.playTone(310, 190, 0.28, 'sawtooth', 0.2);
  }

  public playIbuPanic(): void {
    this.playTone(720, 980, 0.22, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(880, 520, 0.35, 'sawtooth', 0.2), 190);
  }

  public playBroomSweep(): void {
    this.playTone(260, 90, 0.22, 'triangle', 0.2);
  }

  public playSandalThrow(): void {
    this.playTone(520, 220, 0.18, 'sine', 0.15);
  }

  public playStageClear(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, n, 0.22, 'triangle', 0.22), i * 110);
    });
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }
}
