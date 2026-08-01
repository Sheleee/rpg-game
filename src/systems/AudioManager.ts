// 音频系统：使用 Web Audio API 程序化生成音效与简单 BGM。
// 无需外部音频资源，浏览器解锁后即可发声。

export type SfxKind =
  | 'attack' | 'hit' | 'pickup' | 'levelup' | 'ui'
  | 'dialogue' | 'boss' | 'gold' | 'buy' | 'death' | 'quest' | 'shop';

export class AudioManager {
  private static ctx: AudioContext | null = null;
  private static bgmTimer: number | null = null;
  private static bgmStep = 0;
  private static bgmGain: GainNode | null = null;
  private static muted = false;
  private static pendingBgm: { tempo: number; root: number } | null = null;
  private static currentBgm: { tempo: number; root: number } | null = null;

  static ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  /** 必须在用户手势中调用一次以解锁音频（解锁后启动挂起的 BGM） */
  static unlock(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => this.flushPendingBgm()).catch(() => {});
    } else {
      this.flushPendingBgm();
    }
  }

  private static flushPendingBgm(): void {
    if (this.pendingBgm) {
      this.doStartBgm(this.pendingBgm.tempo, this.pendingBgm.root);
      this.pendingBgm = null;
    }
  }

  static setMuted(m: boolean): void {
    this.muted = m;
    if (this.bgmGain) this.bgmGain.gain.value = m ? 0 : 0.12;
    // 取消静音时若 BGM 已停止（静音状态下切换区域），恢复播放
    if (!m && this.bgmTimer === null && this.currentBgm) {
      this.doStartBgm(this.currentBgm.tempo, this.currentBgm.root);
    }
  }

  static isMuted(): boolean {
    return this.muted;
  }

  private static tone(freq: number, start: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + start + dur);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.05);
  }

  static playSfx(kind: SfxKind): void {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t = 0;

    switch (kind) {
      case 'attack':
        this.tone(220, t, 0.12, 'square', 0.18, 440);
        break;
      case 'hit':
        this.tone(160, t, 0.1, 'sawtooth', 0.16, 90);
        break;
      case 'pickup':
        this.tone(660, t, 0.08, 'sine', 0.14);
        this.tone(880, t + 0.07, 0.1, 'sine', 0.14);
        break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.09, 0.16, 'triangle', 0.16));
        break;
      case 'ui':
        this.tone(500, t, 0.06, 'square', 0.08);
        break;
      case 'dialogue':
        this.tone(700, t, 0.05, 'sine', 0.1);
        this.tone(500, t + 0.06, 0.05, 'sine', 0.1);
        break;
      case 'boss':
        [110, 98, 82].forEach((f, i) => this.tone(f, i * 0.25, 0.3, 'sawtooth', 0.22));
        break;
      case 'gold':
        this.tone(988, t, 0.06, 'triangle', 0.13);
        this.tone(1319, t + 0.06, 0.1, 'triangle', 0.13);
        break;
      case 'buy':
        this.tone(392, t, 0.1, 'square', 0.12);
        this.tone(523, t + 0.08, 0.14, 'square', 0.12);
        break;
      case 'death':
        [300, 200, 120].forEach((f, i) => this.tone(f, i * 0.18, 0.3, 'sawtooth', 0.2));
        break;
      case 'quest':
        [392, 523, 659].forEach((f, i) => this.tone(f, i * 0.1, 0.14, 'triangle', 0.15));
        break;
      case 'shop':
        this.tone(440, t, 0.08, 'sine', 0.12);
        this.tone(554, t + 0.08, 0.12, 'sine', 0.12);
        break;
    }
  }

  /** 启动区域 BGM（bpm + 根音频率，简单琶音循环）；未解锁时挂起等待 unlock */
  static startBgm(tempo: number, rootFreq: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      this.pendingBgm = { tempo, root: rootFreq };
      return;
    }
    this.doStartBgm(tempo, rootFreq);
  }

  private static doStartBgm(tempo: number, rootFreq: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    this.stopBgm();
    this.currentBgm = { tempo, root: rootFreq };
    if (this.muted) return;

    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = 0.12;
    this.bgmGain.connect(ctx.destination);

    const scale = [1, 1.25, 1.5, 2, 1.5, 1.25];
    const noteDur = 60 / tempo;
    const schedule = () => {
      if (!this.bgmGain) return;
      const step = this.bgmStep;
      const f = rootFreq * scale[step % scale.length];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const start = ctx.currentTime + 0.02;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + noteDur * 0.9);
      osc.connect(g).connect(this.bgmGain);
      osc.start(start);
      osc.stop(start + noteDur);
      this.bgmStep++;
    };
    schedule();
    this.bgmTimer = window.setInterval(schedule, noteDur * 1000);
  }

  static stopBgm(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
    this.currentBgm = null;
  }
}
