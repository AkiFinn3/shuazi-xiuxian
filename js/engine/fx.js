// 战斗特效：飘字、粒子、掉落光柱、震屏
const RARITY_COLORS = ['#b8bfae', '#7fae86', '#6f9fc0', '#a98fc8', '#d3a95f', '#cf6f63'];

export class Fx {
  constructor() {
    this.numbers = [];
    this.particles = [];
    this.beams = [];
    this.rings = [];
    this.slashes = [];
    this.shake = 0;
    this.shakeTime = 0;
    this.flash = 0;
    this.flashColor = '255,255,255';
    this.lowFx = false;      // 移动端降级
    this.maxNumbers = 90;
    this.maxParticles = 400;
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
      color: opts.color || (crit ? '#e8c06a' : (opts.elem ? '#9fd8e8' : '#f6efdd')),
      size: crit ? 16 : 12,
      bold: crit,
    });
    if (this.numbers.length > this.maxNumbers) this.numbers.splice(0, this.numbers.length - this.maxNumbers);
  }

  spark(x, y, color = '#f0dcb4', count = 6, spread = 60) {
    if (this.lowFx) count = Math.ceil(count * 0.45);
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
        size: 1 + Math.random() * 1.6,
      });
    }
    if (this.particles.length > this.maxParticles) this.particles.splice(0, this.particles.length - this.maxParticles);
  }

  /** 命中涟漪：一圈水墨似的扩散椭圆 */
  ring(x, y, color = '#e8cf92', maxR = 22) {
    if (this.lowFx) return;
    this.rings.push({ x, y, color, maxR, life: 0.32, maxLife: 0.32 });
  }

  /** 剑光：一道迅速淡去的月牙 */
  slash(x, y, color = '#f4e8cc') {
    if (this.lowFx) return;
    this.slashes.push({ x, y, color, life: 0.22, maxLife: 0.22 });
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
    if (this.lowFx) return;      // 移动端不震屏，省电且不晕
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
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life -= dt;
      if (s.life <= 0) this.slashes.splice(i, 1);
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shake = 0;
    }
    this.flash = Math.max(0, this.flash - dt * 3);
  }

  draw(ctx) {
    ctx.save();
    // 剑光
    for (const s of this.slashes) {
      const k = Math.max(0, s.life / s.maxLife);
      const p = 1 - k;
      ctx.globalAlpha = k * 0.7;
      ctx.strokeStyle = s.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = 0.8 + k * 2.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 24 + p * 10, -1.25, 0.75);
      ctx.stroke();
      ctx.globalAlpha = k * 0.3;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 20 + p * 8, -1.05, 0.55);
      ctx.stroke();
    }
    // 命中涟漪
    for (const r of this.rings) {
      const k = Math.max(0, r.life / r.maxLife);
      const p = 1 - k;
      ctx.globalAlpha = k * 0.6;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 0.6 + k * 1.6;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.maxR * (0.3 + p * 0.9), r.maxR * (0.3 + p * 0.9) * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 光柱
    for (const b of this.beams) {
      const k = b.life / b.maxLife;
      const h = 46 * Math.min(1, (1 - k) * 3 + 0.3);
      const w = b.rarity >= 4 ? 8 : 5;
      ctx.fillStyle = b.color;
      ctx.globalAlpha = 0.10 + 0.16 * k;
      ctx.fillRect(b.x - w, b.y - h, w * 2, h);
      ctx.globalAlpha = 0.22 + 0.34 * k;
      ctx.fillRect(b.x - w / 2, b.y - h, w, h);
      ctx.globalAlpha = 0.18 + 0.3 * k;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, w * 1.6, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // 粒子
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.9;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    // 飘字
    ctx.textAlign = 'center';
    const font = `600 12px "Noto Serif SC", serif`;
    const critFont = `700 16px "Noto Serif SC", serif`;
    ctx.font = font;
    for (const n of this.numbers) {
      const k = Math.max(0, n.life / n.maxLife);
      ctx.globalAlpha = k > 0.7 ? 1 : k / 0.7;
      const next = n.bold ? critFont : font;
      if (next !== ctx.font) ctx.font = next;
      ctx.fillStyle = 'rgba(16,26,21,.72)';
      ctx.fillText(n.text, n.x + 1, n.y + 1.5);
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
