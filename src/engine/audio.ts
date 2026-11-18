import { GameSettings } from '../types/game';

class CricketAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private settings: GameSettings | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.noiseBuffer && this.ctx) {
      const sr = this.ctx.sampleRate;
      const len = sr * 2;
      const buf = this.ctx.createBuffer(1, len, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }
    return this.ctx;
  }

  public syncSettings(settings: GameSettings) {
    this.settings = settings;
    if (this.rainGain && this.ctx) {
      const target = settings.muted ? 0 : settings.masterVolume * settings.crowdVolume * 0.12;
      this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
    }
  }

  private getSfxGain(): number {
    if (!this.settings) return 0.7;
    if (this.settings.muted) return 0;
    return this.settings.masterVolume * this.settings.sfxVolume;
  }

  private getCrowdGain(): number {
    if (!this.settings) return 0.55;
    if (this.settings.muted) return 0;
    return this.settings.masterVolume * this.settings.crowdVolume;
  }

  public unlock() {
    this.ensureContext();
  }

  public playBatHit(power: number = 0.85, isEdge: boolean = false) {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0.01) return;
    const now = ctx.currentTime;

    // Crisp willow crack transient
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isEdge ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isEdge ? 680 : 310 + power * 180, now);
    osc.frequency.exponentialRampToValueAtTime(isEdge ? 220 : 85, now + 0.065);

    gain.gain.setValueAtTime(vol * (isEdge ? 0.35 : 0.7 * power), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);

    // Filtered wood snap noise burst
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(isEdge ? 2600 : 1450, now);
      bp.Q.value = 1.8;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vol * (isEdge ? 0.28 : 0.45 * power), now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      src.connect(bp).connect(ng).connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.05);
    }
  }

  public playWicketShatter() {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0.01) return;
    const now = ctx.currentTime;

    // Three staggered timber clacks for stumps + bails
    [0, 0.035, 0.075].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520 - idx * 70, now + offset);
      osc.frequency.exponentialRampToValueAtTime(140, now + offset + 0.11);
      gain.gain.setValueAtTime(vol * 0.55, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.13);
    });
  }

  public playPitchBounce() {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0.01) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.045);
    gain.gain.setValueAtTime(vol * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playCrowdCheer(intensity: 'boundary' | 'six' | 'wicket' | 'applause') {
    const ctx = this.ensureContext();
    const vol = this.getCrowdGain();
    if (!ctx || !this.noiseBuffer || vol <= 0.01) return;
    const now = ctx.currentTime;

    const duration = intensity === 'six' ? 2.4 : intensity === 'wicket' ? 2.0 : 1.4;
    const peak = intensity === 'six' ? 0.55 : intensity === 'wicket' ? 0.48 : 0.35;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(intensity === 'wicket' ? 850 : 1100, now);
    filter.frequency.linearRampToValueAtTime(1450, now + 0.45);
    filter.frequency.linearRampToValueAtTime(750, now + duration);
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol * peak, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.05);
  }

  public playUmpireSignal(kind: 'boundary' | 'out' | 'wide') {
    const ctx = this.ensureContext();
    const vol = this.getSfxGain();
    if (!ctx || vol <= 0.01) return;
    const now = ctx.currentTime;

    const freqs =
      kind === 'boundary'
        ? [523.25, 659.25, 783.99]
        : kind === 'out'
        ? [440, 311.13]
        : [392, 392];

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.09);
      gain.gain.setValueAtTime(vol * 0.2, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.18);
    });
  }

  public setRainAmbience(active: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    if (active && !this.rainSource) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;

      const gain = ctx.createGain();
      const vol = this.settings?.muted
        ? 0
        : (this.settings?.masterVolume ?? 0.8) * (this.settings?.crowdVolume ?? 0.7) * 0.1;
      gain.gain.setValueAtTime(vol, ctx.currentTime);

      src.connect(hp).connect(gain).connect(ctx.destination);
      src.start();
      this.rainSource = src;
      this.rainGain = gain;
    } else if (!active && this.rainSource) {
      try {
        this.rainSource.stop();
        this.rainSource.disconnect();
      } catch {
        // ignore
      }
      this.rainSource = null;
      this.rainGain = null;
    }
  }

  public speakCommentary(text: string) {
    if (!this.settings?.commentaryVoice || this.settings.muted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.08;
      utter.pitch = 1.0;
      utter.volume = Math.min(1, (this.settings.masterVolume ?? 0.8) * 0.85);
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech synthesis restrictions
    }
  }
}

export const audioEngine = new CricketAudioEngine();
