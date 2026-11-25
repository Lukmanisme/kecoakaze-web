import * as THREE from 'three';

export type CrawlSurfaceType = 'floor' | 'wall' | 'ceiling';
export type IbuVocalMood = 'alert' | 'angry' | 'surrender';
export type GamerVocalMood = 'choke' | 'tilted' | 'panic';

interface AudioPrefs {
  muted: boolean;
  volume: number;
}

const AUDIO_PREFS_KEY = 'kecoakaze_audio_prefs_v1';

export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;

  // Pre-generated 2-second noise buffers
  private whiteBuffer: AudioBuffer | null = null;
  private pinkBuffer: AudioBuffer | null = null;
  private brownBuffer: AudioBuffer | null = null;

  // Persistent loop nodes (never duplicated across stage switches)
  private wingSaw: OscillatorNode | null = null;
  private wingTri: OscillatorNode | null = null;
  private wingLfo: OscillatorNode | null = null;
  private wingLfoGain: GainNode | null = null;
  private wingFilter: BiquadFilterNode | null = null;
  private wingGain: GainNode | null = null;

  private fanSource: AudioBufferSourceNode | null = null;
  private fanFilter: BiquadFilterNode | null = null;
  private fanPanner: StereoPannerNode | null = null;
  private fanGain: GainNode | null = null;

  private stoveSource: AudioBufferSourceNode | null = null;
  private stoveGain: GainNode | null = null;

  public muted = false;
  public volume = 0.65;
  private stepAccumulator = 0;

  constructor() {
    const prefs = this.loadPrefs();
    this.muted = prefs.muted;
    this.volume = prefs.volume;
    this.bindAutoUnlock();
  }

  private loadPrefs(): AudioPrefs {
    try {
      const raw = window.localStorage.getItem(AUDIO_PREFS_KEY);
      if (!raw) return { muted: false, volume: 0.65 };
      const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
      return {
        muted: Boolean(parsed.muted),
        volume:
          typeof parsed.volume === 'number' && !Number.isNaN(parsed.volume)
            ? Math.max(0, Math.min(1, parsed.volume))
            : 0.65,
      };
    } catch {
      return { muted: false, volume: 0.65 };
    }
  }

  private savePrefs(): void {
    try {
      window.localStorage.setItem(
        AUDIO_PREFS_KEY,
        JSON.stringify({ muted: this.muted, volume: this.volume })
      );
    } catch {
      // Ignore storage errors
    }
  }

  private bindAutoUnlock(): void {
    const onGesture = () => {
      this.unlock();
      if (this.ctx && this.ctx.state === 'running') {
        window.removeEventListener('pointerdown', onGesture);
        window.removeEventListener('keydown', onGesture);
      }
    };
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture, { passive: true });
  }

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.15;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.generateNoiseBuffers();
      this.initPersistentLoops();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.savePrefs();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.03
      );
    }
    if (muted) {
      this.stopAllLoops();
    }
  }

  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.savePrefs();
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  private generateNoiseBuffers(): void {
    if (!this.ctx) return;
    const len = this.ctx.sampleRate * 2;

    // 1. White Noise
    const whiteBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const whiteData = whiteBuf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }
    this.whiteBuffer = whiteBuf;

    // 2. Pink Noise (Paul Kellet filter)
    const pinkBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const pinkData = pinkBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = whiteData[i];
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    this.pinkBuffer = pinkBuf;

    // 3. Brown Noise
    const brownBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const brownData = brownBuf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < len; i++) {
      const w = whiteData[i];
      lastOut = (lastOut + 0.02 * w) / 1.02;
      brownData[i] = Math.max(-1, Math.min(1, lastOut * 3.2));
    }
    this.brownBuffer = brownBuf;
  }

  private initPersistentLoops(): void {
    if (!this.ctx || !this.compressor || !this.brownBuffer) return;

    // A. Wing Loop (Sawtooth 145Hz + Triangle 290Hz + 38Hz AM LFO)
    this.wingSaw = this.ctx.createOscillator();
    this.wingSaw.type = 'sawtooth';
    this.wingSaw.frequency.value = 145;

    this.wingTri = this.ctx.createOscillator();
    this.wingTri.type = 'triangle';
    this.wingTri.frequency.value = 290;

    const carrierSum = this.ctx.createGain();
    carrierSum.gain.value = 0.4;

    const lfoModNode = this.ctx.createGain();
    lfoModNode.gain.value = 0.65;

    this.wingLfo = this.ctx.createOscillator();
    this.wingLfo.type = 'sine';
    this.wingLfo.frequency.value = 38;
    this.wingLfoGain = this.ctx.createGain();
    this.wingLfoGain.gain.value = 0.35;
    this.wingLfo.connect(this.wingLfoGain);
    this.wingLfoGain.connect(lfoModNode.gain);

    this.wingFilter = this.ctx.createBiquadFilter();
    this.wingFilter.type = 'lowpass';
    this.wingFilter.frequency.value = 900;

    this.wingGain = this.ctx.createGain();
    this.wingGain.gain.value = 0;

    this.wingSaw.connect(carrierSum);
    this.wingTri.connect(carrierSum);
    carrierSum.connect(lfoModNode);
    lfoModNode.connect(this.wingFilter);
    this.wingFilter.connect(this.wingGain);
    this.wingGain.connect(this.compressor);

    this.wingSaw.start();
    this.wingTri.start();
    this.wingLfo.start();

    // B. Oscillating Fan Wind Loop (Brown noise -> Dynamic lowpass -> Panner -> Gain)
    this.fanSource = this.ctx.createBufferSource();
    this.fanSource.buffer = this.brownBuffer;
    this.fanSource.loop = true;

    this.fanFilter = this.ctx.createBiquadFilter();
    this.fanFilter.type = 'lowpass';
    this.fanFilter.frequency.value = 450;

    this.fanPanner = this.ctx.createStereoPanner();
    this.fanPanner.pan.value = 0;

    this.fanGain = this.ctx.createGain();
    this.fanGain.gain.value = 0;

    this.fanSource.connect(this.fanFilter);
    this.fanFilter.connect(this.fanPanner);
    this.fanPanner.connect(this.fanGain);
    this.fanGain.connect(this.compressor);
    this.fanSource.start();

    // C. Kitchen Stove Ambience Loop (Bab 01)
    this.stoveSource = this.ctx.createBufferSource();
    this.stoveSource.buffer = this.pinkBuffer ?? this.brownBuffer;
    this.stoveSource.loop = true;
    const stoveFilter = this.ctx.createBiquadFilter();
    stoveFilter.type = 'bandpass';
    stoveFilter.frequency.value = 1850;
    stoveFilter.Q.value = 1.4;
    this.stoveGain = this.ctx.createGain();
    this.stoveGain.gain.value = 0;
    this.stoveSource.connect(stoveFilter);
    stoveFilter.connect(this.stoveGain);
    this.stoveGain.connect(this.compressor);
    this.stoveSource.start();
  }

  public computeSpatialPanAndGain(
    sourcePos: THREE.Vector3,
    listenerPos: THREE.Vector3,
    maxDistance: number,
    listenerForward?: THREE.Vector3
  ): { pan: number; gain: number } {
    const delta = sourcePos.clone().sub(listenerPos);
    const dist = delta.length();
    const normDist = Math.max(0, Math.min(1, dist / Math.max(0.01, maxDistance)));
    const gain = Math.pow(1 - normDist, 1.35);

    let pan = 0;
    if (dist > 0.001) {
      const dir = delta.divideScalar(dist);
      if (listenerForward && listenerForward.lengthSq() > 0.001) {
        const right = new THREE.Vector3()
          .crossVectors(listenerForward, new THREE.Vector3(0, 1, 0))
          .normalize();
        pan = Math.max(-1, Math.min(1, dir.dot(right)));
      } else {
        pan = Math.max(-1, Math.min(1, dir.x));
      }
    }
    return { pan, gain };
  }

  private getOutputChain(pan = 0, spatialGain = 1): AudioNode | null {
    if (!this.ctx || !this.compressor) return null;
    if (Math.abs(pan) < 0.02 && Math.abs(spatialGain - 1) < 0.02) {
      return this.compressor;
    }
    const g = this.ctx.createGain();
    g.gain.value = Math.max(0, Math.min(1.2, spatialGain));
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(panner);
    panner.connect(this.compressor);
    return g;
  }

  public stopAllLoops(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.wingGain) this.wingGain.gain.setTargetAtTime(0, now, 0.04);
    if (this.fanGain) this.fanGain.gain.setTargetAtTime(0, now, 0.05);
    if (this.stoveGain) this.stoveGain.gain.setTargetAtTime(0, now, 0.06);
  }

  public setStoveAmbience(active: boolean, gainScale = 0.055): void {
    if (!this.ctx || !this.stoveGain) return;
    const target = active && !this.muted ? gainScale : 0;
    this.stoveGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
  }

  // 1. Crawl Steps (15ms white noise burst through 2800Hz bandpass with surface variation)
  public tickCrawlSteps(dt: number, speed: number, surfaceType: CrawlSurfaceType): void {
    if (!this.ctx || this.muted || speed < 0.45) {
      this.stepAccumulator = 0;
      return;
    }
    this.stepAccumulator -= dt * (0.6 + speed * 0.22);
    if (this.stepAccumulator <= 0) {
      this.stepAccumulator = 0.18;
      this.playCrawlStep(surfaceType);
    }
  }

  public playCrawlStep(surfaceType: CrawlSurfaceType): void {
    if (!this.ctx || !this.compressor || !this.whiteBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteBuffer;
    src.playbackRate.value = 0.92 + Math.random() * 0.16;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = surfaceType === 'wall' ? 3250 : surfaceType === 'ceiling' ? 2350 : 2800;
    filter.frequency.value = baseFreq + (Math.random() - 0.5) * 260;
    filter.Q.value = 3.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);

    const offset = Math.random() * 1.5;
    src.start(now, offset, 0.02);
  }

  // 2. Wing Buzz Loop (145Hz saw + 290Hz tri + 38Hz LFO)
  public updateWingSound(
    isFlying: boolean,
    isGliding: boolean,
    verticalVelocity: number
  ): void {
    if (!this.ctx || !this.wingGain || !this.wingSaw || !this.wingTri || !this.wingFilter) return;
    const now = this.ctx.currentTime;

    if (!isFlying || this.muted) {
      this.wingGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const climbBoost = Math.max(-18, Math.min(38, verticalVelocity * 4.5));
    const baseFreq = isGliding ? 128 : 145 + climbBoost;
    this.wingSaw.frequency.setTargetAtTime(baseFreq, now, 0.06);
    this.wingTri.frequency.setTargetAtTime(baseFreq * 2, now, 0.06);

    const cutoff = isGliding ? 520 : 1150 + Math.max(0, verticalVelocity * 65);
    this.wingFilter.frequency.setTargetAtTime(cutoff, now, 0.06);

    const targetGain = isGliding ? 0.08 : 0.17;
    this.wingGain.gain.setTargetAtTime(targetGain, now, 0.05);
  }

  // 3. Dodge Whoosh (Pink noise bandpass 400 -> 2400 -> 300 Hz in 0.22s)
  public playDodgeWhoosh(): void {
    if (!this.ctx || !this.compressor || !this.pinkBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.4;
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.09);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.22);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.compressor);

    src.start(now, Math.random() * 1.2, 0.25);
  }

  // 4. Sabotage Progress & Complete (rising click + C5-E5-G5-C6 arpeggio)
  public playSabotageProgress(progressRatio: number): void {
    const ratio = Math.max(0, Math.min(1, progressRatio));
    const freq = 420 + ratio * 520;
    this.playTone(freq, freq * 1.08, 0.045, 'triangle', 0.12);
  }

  public playSabotageComplete(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5-E5-G5-C6
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.16, 'triangle', 0.22, idx * 0.075);
    });
  }

  // 5. Oscillating Fan Wind Loop (Brown noise -> dynamic 350-900Hz lowpass)
  public updateFanWind(distance: number, alignmentFactor: number, pan = 0): void {
    if (!this.ctx || !this.fanGain || !this.fanFilter || !this.fanPanner) return;
    const now = this.ctx.currentTime;
    if (this.muted || distance <= 0) {
      this.fanGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const align = Math.max(0, Math.min(1, alignmentFactor));
    const distAtten = Math.max(0, Math.min(1, 1 - distance / 46));
    const targetGain = distAtten * (0.04 + align * 0.26);
    const cutoff = 350 + align * 550;

    this.fanFilter.frequency.setTargetAtTime(cutoff, now, 0.08);
    this.fanPanner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), now, 0.08);
    this.fanGain.gain.setTargetAtTime(targetGain, now, 0.08);
  }

  // 6. Electric Mosquito Swatter Telegraph (1.1s 60Hz AC hum + highpass sparks) & Snap
  public playSwatterTelegraph(pan = 0, gainScale = 1): void {
    if (!this.ctx || !this.whiteBuffer || this.muted) return;
    const out = this.getOutputChain(pan, gainScale);
    if (!out) return;
    const now = this.ctx.currentTime;

    // 60 Hz AC hum
    const humOsc = this.ctx.createOscillator();
    humOsc.type = 'sawtooth';
    humOsc.frequency.setValueAtTime(60, now);
    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 380;
    const humGain = this.ctx.createGain();
    humGain.gain.setValueAtTime(0.01, now);
    humGain.gain.linearRampToValueAtTime(0.24, now + 0.12);
    humGain.gain.setValueAtTime(0.24, now + 0.95);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    humOsc.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(out);
    humOsc.start(now);
    humOsc.stop(now + 1.12);

    // Random highpass spark impulses over 1.1s
    for (let i = 0; i < 8; i++) {
      const t = now + 0.06 + i * 0.125 + Math.random() * 0.04;
      const spark = this.ctx.createBufferSource();
      spark.buffer = this.whiteBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3400 + Math.random() * 2000;
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.26, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.032);
      spark.connect(hp);
      hp.connect(sg);
      sg.connect(out);
      spark.start(t, Math.random(), 0.035);
    }
  }

  public playSwatterSnap(pan = 0, gainScale = 1): void {
    if (!this.ctx || !this.whiteBuffer || this.muted) return;
    const out = this.getOutputChain(pan, gainScale);
    if (!out) return;
    const now = this.ctx.currentTime;

    // Sharp electrical crackle + pop
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.whiteBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.45, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    noise.connect(hp);
    hp.connect(ng);
    ng.connect(out);
    noise.start(now, Math.random(), 0.1);

    this.playTone(920, 140, 0.1, 'square', 0.25, 0, pan, gainScale);
  }

  // 7. Broom Swing & Sub-bass Impact (160 -> 40 Hz)
  public playBroomSwing(impact = true, pan = 0, gainScale = 1): void {
    if (!this.ctx || !this.brownBuffer || this.muted) return;
    const out = this.getOutputChain(pan, gainScale);
    if (!out) return;
    const now = this.ctx.currentTime;

    const whoosh = this.ctx.createBufferSource();
    whoosh.buffer = this.brownBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(240, now);
    bp.frequency.exponentialRampToValueAtTime(880, now + 0.11);
    bp.frequency.exponentialRampToValueAtTime(180, now + 0.24);
    const wg = this.ctx.createGain();
    wg.gain.setValueAtTime(0.01, now);
    wg.gain.linearRampToValueAtTime(0.42, now + 0.08);
    wg.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    whoosh.connect(bp);
    bp.connect(wg);
    wg.connect(out);
    whoosh.start(now, Math.random(), 0.26);

    if (impact) {
      this.playTone(160, 40, 0.2, 'sine', 0.48, 0.12, pan, gainScale);
    }
  }

  // 8. Formant Vocal Reaction Synthesizer
  public playVocalReaction(
    character: 'ibu' | 'gamer',
    mood: IbuVocalMood | GamerVocalMood,
    pan = 0,
    gainScale = 1
  ): void {
    if (!this.ctx || this.muted) return;
    const out = this.getOutputChain(pan, gainScale);
    if (!out) return;

    if (character === 'ibu') {
      if (mood === 'alert') {
        // Rising startled pitch
        this.emitFormantSyllable(out, 270, 410, 0.2, 650, 1850, 0, 0.34);
      } else if (mood === 'angry') {
        // 4 fast staccato high-pitched syllables
        const pitches = [340, 390, 360, 440];
        pitches.forEach((f, idx) => {
          this.emitFormantSyllable(out, f, f * 0.92, 0.11, 780, 1320, idx * 0.135, 0.32);
        });
      } else if (mood === 'surrender') {
        // Long descending sigh
        this.emitFormantSyllable(out, 310, 145, 0.55, 520, 1150, 0, 0.3);
      }
    } else {
      if (mood === 'choke') {
        // Coughing/choking bursts
        [0, 0.14, 0.3].forEach((offset, idx) => {
          this.emitFormantSyllable(out, 190 - idx * 15, 120, 0.09, 600, 1300, offset, 0.35);
        });
      } else if (mood === 'tilted') {
        // Desk slam sub-bass + annoyed low grunt
        this.playTone(135, 42, 0.28, 'sawtooth', 0.42, 0, pan, gainScale);
        this.emitFormantSyllable(out, 155, 110, 0.35, 480, 980, 0.1, 0.34);
      } else if (mood === 'panic') {
        // Rising shriek when running out
        this.emitFormantSyllable(out, 260, 620, 0.45, 820, 2100, 0, 0.36);
      }
    }
  }

  private emitFormantSyllable(
    destination: AudioNode,
    f0Start: number,
    f0End: number,
    duration: number,
    formant1: number,
    formant2: number,
    delaySec: number,
    volume: number
  ): void {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + delaySec;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0Start, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(50, f0End), start + duration);

    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = formant1;
    f1.Q.value = 5.5;

    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = formant2;
    f2.Q.value = 6.5;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.001, start);
    env.gain.linearRampToValueAtTime(volume, start + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(f1);
    osc.connect(f2);
    f1.connect(env);
    f2.connect(env);
    env.connect(destination);

    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  // Supporting game event cues
  public playTakeoff(): void {
    this.playTone(180, 420, 0.14, 'triangle', 0.22);
  }

  public playLanding(): void {
    this.playTone(165, 72, 0.09, 'sine', 0.22);
  }

  public playStarUnlock(): void {
    this.playTone(523.25, 523.25, 0.12, 'triangle', 0.22, 0);
    this.playTone(659.25, 659.25, 0.12, 'triangle', 0.22, 0.09);
    this.playTone(783.99, 1046.5, 0.24, 'triangle', 0.24, 0.18);
  }

  public playHighRiskBonus(): void {
    this.playTone(587.33, 880, 0.12, 'triangle', 0.22, 0);
    this.playTone(880, 1174.66, 0.18, 'triangle', 0.24, 0.09);
  }

  public playFanHit(): void {
    this.playTone(340, 105, 0.18, 'square', 0.26);
  }

  public playSandalThrow(pan = 0, gainScale = 1): void {
    this.playTone(520, 220, 0.18, 'sine', 0.2, 0, pan, gainScale);
  }

  public playFlashbangGlare(): void {
    this.playTone(1180, 1680, 0.28, 'sine', 0.16);
  }

  public playStageClear(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.playTone(n, n, 0.22, 'triangle', 0.24, i * 0.11);
    });
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delaySec = 0,
    pan = 0,
    gainScale = 1
  ): void {
    if (!this.ctx || this.muted) return;
    const out = this.getOutputChain(pan, gainScale);
    if (!out) return;

    const start = this.ctx.currentTime + delaySec;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(35, freqEnd), start + duration);

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
