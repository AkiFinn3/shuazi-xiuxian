// 音效：全部用 WebAudio 合成，零素材依赖
export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.5;
    this._noise = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  setEnabled(on) {
    this.enabled = on;
    if (on) this.ensure();
  }

  _noiseBuffer() {
    if (this._noise) return this._noise;
    const ctx = this.ctx;
    const len = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noise = buf;
    return buf;
  }

  /** 短促的打击音 */
  hit(power = 1) {
    if (!this.enabled) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(420 * (0.8 + power * 0.4), t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.09);
    gain.gain.setValueAtTime(0.18 * power, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(this.master);
    osc.start(t); osc.stop(t + 0.14);
  }

  /** 暴击：更亮的金属声 */
  crit() {
    if (!this.enabled) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880 + i * 260, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.16);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain).connect(this.master);
      osc.start(t); osc.stop(t + 0.22);
    }
  }

  /** 拾取 / 获得装备 */
  loot(rarity = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 988, 1175, 1319];
    const base = notes[Math.min(notes.length - 1, rarity)];
    [0, 0.08, 0.16].slice(0, 1 + Math.min(2, rarity)).forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = base * (1 + i * 0.26);
      gain.gain.setValueAtTime(0.0001, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.14, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.28);
      osc.connect(gain).connect(this.master);
      osc.start(t + delay); osc.stop(t + delay + 0.3);
    });
  }

  /** 升级 / 突破 */
  fanfare() {
    if (!this.enabled) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    [392, 523, 659, 784].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const d = i * 0.11;
      gain.gain.setValueAtTime(0.0001, t + d);
      gain.gain.exponentialRampToValueAtTime(0.13, t + d + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.4);
      osc.connect(gain).connect(this.master);
      osc.start(t + d); osc.stop(t + d + 0.45);
    });
  }

  /** 雷劫 / 失败 */
  thunder() {
    if (!this.enabled) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.7);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t); src.stop(t + 0.85);
  }

  /** 界面点击 */
  click() {
    if (!this.enabled) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain).connect(this.master);
    osc.start(t); osc.stop(t + 0.06);
  }
}

export const audio = new Audio();
