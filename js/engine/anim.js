// 动画播放器：基于横向 strip，按 fps 播放帧
import { SPRITES } from '../data/sprites.js';
import { animImg } from './assets.js';

/** 受击白闪用的剪影缓存 */
const whiteCache = new Map();

function whiteFrame(key, frame, image, cw, ch) {
  const id = key + '#' + frame;
  let c = whiteCache.get(id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const g = c.getContext('2d');
  g.drawImage(image, frame * cw, 0, cw, ch, 0, 0, cw, ch);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, cw, ch);
  whiteCache.set(id, c);
  return c;
}

export class Anim {
  /**
   * @param {string} key 清单中的动画 key，例如 'hero/swordsman_idle'
   * @param {object} opts { fps, loop, onEnd }
   */
  constructor(key, opts = {}) {
    this.key = key;
    this.meta = SPRITES.anims[key] || null;
    this.fps = opts.fps || (this.meta ? this.meta.fps : 8);
    this.loop = opts.loop !== undefined ? opts.loop : (this.meta ? this.meta.loop : true);
    this.onEnd = opts.onEnd || null;
    this.t = 0;
    this.frame = 0;
    this.done = false;
  }

  get frames() { return this.meta ? this.meta.frames : 1; }
  get cellW() { return this.meta ? this.meta.cell[0] : 1; }
  get cellH() { return this.meta ? this.meta.cell[1] : 1; }
  get image() { return animImg(this.key); }

  reset() { this.t = 0; this.frame = 0; this.done = false; }

  update(dt) {
    if (!this.meta || this.done) return;
    this.t += dt;
    const dur = 1 / this.fps;
    while (this.t >= dur) {
      this.t -= dur;
      if (this.frame + 1 >= this.frames) {
        if (this.loop) {
          this.frame = 0;
        } else {
          this.frame = this.frames - 1;
          this.done = true;
          if (this.onEnd) this.onEnd();
          break;
        }
      } else {
        this.frame++;
      }
    }
  }

  /** 画到画布，(x, y) 为脚底中心点 */
  draw(ctx, x, y, opts = {}) {
    const image = this.image;
    if (!image) return;
    const { flip = false, alpha = 1, scale = 1, flash = 0 } = opts;
    const cw = this.cellW, ch = this.cellH;
    const sx = this.frame * cw;
    const dx = -cw * scale / 2, dy = -ch * scale, dw = cw * scale, dh = ch * scale;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (flip) ctx.scale(-scale, scale);
    ctx.drawImage(image, sx, 0, cw, ch, dx, dy, dw, dh);
    if (flash > 0) {
      const white = whiteFrame(this.key, this.frame, image, cw, ch);
      ctx.globalAlpha = alpha * Math.min(1, flash);
      ctx.drawImage(white, 0, 0, cw, ch, dx, dy, dw, dh);
    }
    ctx.restore();
  }
}

/** 一次性特效（帧动画，播完即消失） */
export class OneShot extends Anim {
  constructor(key, opts = {}) {
    super(key, { ...opts, loop: false });
  }
}
