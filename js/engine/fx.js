// 战斗特效：飘字、粒子、掉落光柱、震屏
const RARITY_COLORS = ['#b9c0cc', '#6fd68a', '#59a9ff', '#c08cff', '#ffb347', '#ff5f6d'];

export class Fx {
  constructor() {
    this.numbers = [];
    this.particles = [];
    this.beams = [];
    this.shake = 0;
    this.shakeTime = 0;
    this.flash = 0;
    this.flashColor = '255,255,255';
  }

  damage(x, y, value, opts = {}) {
    const crit = !!opts.crit;
    this.numbers.push({
      x: x + (Math.random() - 0.5) * 14,
      y,
      vy: crit ? -46 : -34,
      life: crit ? 1.1 : 0.8,
      maxLife: crit ? 1.1 : 0.8,
      text: opts.text || String(Math.round(value)),
      color: opts.color || (crit ? '#ffd76a' : (opts.elem ? '#8ad6ff' : '#ffffff')),
      size: crit ? 15 : 12,
      bold: crit,
    });
    if (this.numbers.length > 90) this.numbers.splice(0, this.numbers.length - 90);
  }

  spark(x, y, color = '#ffd9a0', count = 6, spread = 60) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * spread;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 20,
        g: 220,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color,
        size: Math.random() < 0.3 ? 2 : 1,
      });
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  /** 掉落光柱 */
  beam(x, y, rarity = 0) {
    this.beams.push({
      x, y,
      life: 1.6,
      maxLife: 1.6,
      color: RARITY_COLORS[Math.min(RARITY_COLORS.length - 1, rarity)],
      rarity,
    });
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
    this.shakeTime = 0.22;
  }

  addFlash(color = '255,255,255', amount = 0.5) {
    this.flash = Math.max(this.flash, amount);
    this.flashColor = color;
  }

  update(dt) {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.life -= dt;
      n.y += n.vy * dt;
      n.vy += 90 * dt;
      if (n.life <= 0) this.numbers.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.g * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= dt;
      if (b.life <= 0) this.beams.splice(i, 1);
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shake = 0;
    }
    this.flash = Math.max(0, this.flash - dt * 3);
  }

  draw(ctx) {
    // 光柱
    for (const b of this.beams) {
      const k = b.life / b.maxLife;
      const h = 46 * Math.min(1, (1 - k) * 3 + 0.3);
      ctx.save();
      ctx.globalAlpha = 0.18 + 0.35 * k;
      ctx.fillStyle = b.color;
      const w = b.rarity >= 4 ? 7 : 4;
      ctx.fillRect(b.x - w / 2, b.y - h, w, h);
      ctx.globalAlpha = 0.5 + 0.4 * k;
      ctx.fillRect(b.x - w / 2, b.y - 2, w, 2);
      ctx.restore();
    }
    // 粒子
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      ctx.restore();
    }
    // 飘字
    ctx.save();
    ctx.textAlign = 'center';
    for (const n of this.numbers) {
      const k = Math.max(0, n.life / n.maxLife);
      ctx.globalAlpha = k > 0.7 ? 1 : k / 0.7;
      ctx.font = `${n.bold ? 'bold ' : ''}${n.size}px FusionPixel, monospace`;
      ctx.fillStyle = '#000';
      ctx.fillText(n.text, n.x + 1, n.y + 1);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
    }
    ctx.restore();
  }

  /** 震屏偏移 */
  offset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    const s = this.shake;
    return {
      x: (Math.random() - 0.5) * s,
      y: (Math.random() - 0.5) * s * 0.6,
    };
  }
}

export { RARITY_COLORS };
