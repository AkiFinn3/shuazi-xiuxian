// 战斗立绘：高清素材 + 程序化动作（呼吸 / 前冲 / 挥砍 / 受击 / 倒地）
const HERO_DIR = 'assets/hd/battle/hero/';
const MOB_DIR = 'assets/hd/battle/mob/';
const BOSS_DIR = 'assets/hd/battle/boss/';

const images = new Map();
const pending = new Map();
const failed = new Set();
const whiteCache = new Map();

const BASE_HEIGHT = {
  hero: 152,
  mob: {
    wolf: 96, bat: 92, snake: 88, ghost: 146, skeleton: 144, waterghost: 144,
    foxfire: 92, soldier: 148, swordspirit: 152, treant: 176, thunderbird: 118,
    golem: 170, paperdoll: 140, jiangshi: 146, peachspirit: 146, foxdemon: 144,
    toad: 100,
  },
  boss: { ninetail: 208, fallenimmortal: 226, jiaolong: 224 },
};

const FALLBACK_COLOR = { hero: '#3d5c4c', mob: '#4a4038', boss: '#3a2f3a' };

// 暂无专属立绘时的借用方案：描边剪影太出戏，宁可借用相近妖物的高清形象
const ALIAS = {
  'boss/ninetail': ['mob', 'foxdemon'],
  'boss/fallenimmortal': ['mob', 'swordspirit'],
  'boss/jiaolong': ['mob', 'snake'],
};

function resolve(kind, type) {
  return ALIAS[`${kind}/${type}`] || [kind, type];
}

function dirOf(kind) {
  return kind === 'hero' ? HERO_DIR : kind === 'mob' ? MOB_DIR : BOSS_DIR;
}

export function artPath(kind, type) {
  const [k, t] = resolve(kind, type);
  return `${dirOf(k)}${t}.webp`;
}

function load(path) {
  if (images.has(path)) return images.get(path);
  if (failed.has(path)) return null;
  if (!pending.has(path)) {
    const im = new Image();
    im.decoding = 'async';
    pending.set(path, new Promise((resolve) => {
      im.onload = () => { images.set(path, im); pending.delete(path); resolve(im); };
      im.onerror = () => { failed.add(path); pending.delete(path); resolve(null); };
    }));
    im.src = path;
  }
  return null;
}

function getImage(kind, type) {
  return load(artPath(kind, type));
}

function whiteSilhouette(kind, type, image) {
  const key = resolve(kind, type).join('/');
  let hit = whiteCache.get(key);
  if (hit) return hit;
  const scale = 0.5;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(image.naturalWidth * scale));
  c.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const g = c.getContext('2d');
  g.drawImage(image, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  whiteCache.set(key, c);
  return c;
}

function actorHeight(kind, type, scale) {
  const table = kind === 'hero' ? BASE_HEIGHT.hero : BASE_HEIGHT[kind];
  const base = typeof table === 'number' ? table : (table[type] || (kind === 'boss' ? 210 : 132));
  return base * scale;
}

export function preloadActorArt(list) {
  const jobs = [];
  for (const { kind, type } of list) {
    if (!kind || !type) continue;
    const path = artPath(kind, type);
    if (images.has(path) || failed.has(path)) continue;
    load(path);
    jobs.push(pending.get(path) || Promise.resolve());
  }
  return Promise.all(jobs);
}

/** 按章节预载主角 / 当层妖兽 / Boss */
export function preloadBattleArt(appearance, chapter) {
  const list = [{ kind: 'hero', type: appearance }];
  for (const type of chapter.mobs || []) list.push({ kind: 'mob', type });
  if (chapter.boss) list.push({ kind: 'boss', type: chapter.boss });
  return preloadActorArt(list);
}

function drawInkToad(ctx, h, fill, alpha) {
  const w = h * 1.05;
  ctx.save();
  ctx.globalAlpha = alpha * 0.92;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(-w * 0.36, -h * 0.13, w * 0.19, h * 0.12, -0.3, 0, Math.PI * 2);
  ctx.ellipse(w * 0.36, -h * 0.13, w * 0.19, h * 0.12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.34, w * 0.42, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.6, w * 0.34, h * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-w * 0.17, -h * 0.74, h * 0.075, 0, Math.PI * 2);
  ctx.arc(w * 0.17, -h * 0.74, h * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = fill;
  ctx.lineWidth = Math.max(2, h * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w * 0.2, -h * 0.24);
  ctx.lineTo(-w * 0.29, -h * 0.04);
  ctx.moveTo(w * 0.2, -h * 0.24);
  ctx.lineTo(w * 0.29, -h * 0.04);
  ctx.stroke();
  ctx.restore();
}

function fallback(ctx, h, type, color, alpha, flash) {
  if (type === 'toad') {
    drawInkToad(ctx, h, flash > 0 ? '#ffffff' : color, alpha);
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = flash > 0 ? '#ffffff' : color;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.46, h * 0.2, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.86, h * 0.11, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 与旧 Anim 接口兼容的立绘动画播放器 */
export class ActorAnim {
  constructor(key) {
    const slash = key.indexOf('/');
    const rest = key.slice(slash + 1);
    const cut = rest.lastIndexOf('_');
    this.kind = key.slice(0, slash);
    this.type = rest.slice(0, cut);
    this.action = rest.slice(cut + 1);
    this.loop = this.action === 'idle' || this.action === 'move' || this.action === 'walk';
    this.duration = this.action === 'death' ? 0.9 : this.action === 'hurt' ? 0.28 : 0.5;
    this.t = 0;
    this.done = false;
  }

  reset() { this.t = 0; this.done = false; }

  update(dt) {
    this.t += dt;
    if (!this.loop && this.t >= this.duration) this.done = true;
  }

  draw(ctx, x, y, opts = {}) {
    const { flip = false, alpha = 1, scale = 1, flash = 0 } = opts;
    const facing = flip ? -1 : 1;
    const h = actorHeight(this.kind, this.type, scale);
    const image = getImage(this.kind, this.type);
    const t = this.t;

    let bob = 0;
    let lunge = 0;
    let rot = 0;
    let squeeze = 1;
    let outAlpha = alpha;

    if (this.action === 'idle') {
      bob = Math.sin(t * 2.1) * 0.9;
      squeeze = 1 + Math.sin(t * 2.1) * 0.006;
    } else if (this.action === 'walk' || this.action === 'move') {
      bob = Math.abs(Math.sin(t * 8.5)) * 2.4;
      rot = Math.sin(t * 8.5) * 0.02;
    } else if (this.action.startsWith('attack') || this.action.startsWith('combo')) {
      const p = Math.min(1, t / 0.34);
      lunge = Math.sin(Math.min(1, p * 1.35) * Math.PI) * 10;
      rot = Math.sin(p * Math.PI) * 0.06;
      squeeze = 1 - Math.sin(p * Math.PI) * 0.02;
    } else if (this.action === 'cast') {
      const p = Math.min(1, t / 0.5);
      bob = -Math.sin(p * Math.PI) * 4;
      squeeze = 1 + Math.sin(p * Math.PI) * 0.025;
    } else if (this.action === 'dash') {
      const p = Math.min(1, t / 0.4);
      lunge = Math.sin(p * Math.PI) * 16;
      rot = Math.sin(p * Math.PI) * 0.1;
    } else if (this.action === 'hurt') {
      const p = Math.min(1, t / 0.28);
      lunge = -Math.sin(p * Math.PI) * 6;
      rot = Math.sin(p * Math.PI) * -0.04;
    } else if (this.action === 'death') {
      const p = Math.min(1, t / 0.9);
      rot = -p * 1.15;
      bob = -p * 3;
      outAlpha = alpha * (1 - 0.72 * Math.min(1, p / 0.8));
    }

    ctx.save();
    ctx.translate(x + facing * lunge, y + bob);
    ctx.scale(facing, 1);
    ctx.rotate(rot);
    ctx.scale(1, squeeze);

    if (!image) {
      fallback(ctx, h, this.type, FALLBACK_COLOR[this.kind] || '#3d4a42', outAlpha, flash);
      ctx.restore();
      return;
    }

    const w = h * image.naturalWidth / image.naturalHeight;
    ctx.globalAlpha = outAlpha;
    ctx.drawImage(image, -w / 2, -h, w, h);
    if (flash > 0) {
      const white = whiteSilhouette(this.kind, this.type, image);
      ctx.globalAlpha = outAlpha * Math.min(0.85, flash);
      ctx.drawImage(white, -w / 2, -h, w, h);
    }
    ctx.restore();
  }
}
