// 战斗场景：天空 + 远/中/近三层视差 + 地形
import { VIEW, CHAPTERS } from '../data/config.js';
import { img } from '../engine/assets.js';
import { SPRITES } from '../data/sprites.js';

const SKY = {
  bamboo: ['#16242a', '#27403c', '#3d5647'],
  bluestone: ['#121a2e', '#22304f', '#3b4c74'],
  redclay: ['#261313', '#43201b', '#6d3120'],
  cloud: ['#1f2540', '#374066', '#5c6696'],
};

const TILE = 32;
const skyCache = new Map();     // chapter index -> canvas
const stripCache = new Map();   // terrain -> { back, ground, width }
const nearCache = new Map();    // chapter index -> canvas

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 场景需要的静态图片清单（供预载） */
export function sceneAssetKeys(chapterIndex) {
  const chapter = CHAPTERS[chapterIndex % CHAPTERS.length];
  const keys = [];
  if (chapter.moon) keys.push(chapter.moon);
  const props = chapter.props || {};
  for (const list of [props.far, props.mid, props.near, props.deco]) {
    if (list) keys.push(...list);
  }
  keys.push(
    `terrain/${chapter.terrain}_backwall_M`,
    `terrain/${chapter.terrain}_ground_body_M`,
    `terrain/${chapter.terrain}_ground_top_M`,
  );
  return [...new Set(keys)];
}

/** 天空 + 月亮只画一次 */
function getSky(ci, chapter) {
  const hit = skyCache.get(ci);
  if (hit) return hit;
  let moon = null;
  if (chapter.moon) {
    moon = img(chapter.moon);
    if (!moon) return null;   // 等素材加载完再建缓存
  }
  const c = makeCanvas(VIEW.w, VIEW.h);
  const ctx = c.getContext('2d');
  const sky = SKY[chapter.terrain] || SKY.bamboo;
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, sky[0]);
  g.addColorStop(0.55, sky[1]);
  g.addColorStop(1, sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  if (moon) {
    const meta = SPRITES.images[chapter.moon];
    const height = 62;
    const scale = height / (meta.h || moon.height);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(moon, 74, 26, (meta.w || moon.width) * scale, height);
  }
  skyCache.set(ci, c);
  return c;
}

/** 重复的背墙 / 地面瓦片压成一条，每帧只画一两次 */
function getStrips(terrain) {
  const hit = stripCache.get(terrain);
  if (hit) return hit;
  const back = img(`terrain/${terrain}_backwall_M`);
  const body = img(`terrain/${terrain}_ground_body_M`);
  const top = img(`terrain/${terrain}_ground_top_M`);
  if (!back || !body || !top) return null;

  const count = Math.ceil(VIEW.w / TILE) + 2;
  const width = count * TILE;
  const backC = makeCanvas(width, TILE);
  const bctx = backC.getContext('2d');
  bctx.globalAlpha = 0.18;
  for (let i = 0; i < count; i++) bctx.drawImage(back, i * TILE, 0, TILE, TILE);

  const groundC = makeCanvas(width, TILE * 3);
  const gctx = groundC.getContext('2d');
  for (let i = 0; i < count; i++) {
    gctx.drawImage(top, i * TILE, 0, TILE, TILE);
    gctx.drawImage(body, i * TILE, TILE, TILE, TILE);
    gctx.drawImage(body, i * TILE, TILE * 2, TILE, TILE);
  }
  const entry = { back: backC, ground: groundC, width };
  stripCache.set(terrain, entry);
  return entry;
}

/** 近景贴两侧，不随卷轴移动，可整层缓存 */
function getNear(ci, chapter) {
  const hit = nearCache.get(ci);
  if (hit) return hit;
  const keys = chapter.props && chapter.props.near;
  if (!keys || !keys.length) return null;
  if (!keys.every((k) => img(k))) return null;
  const c = makeCanvas(VIEW.w, VIEW.h);
  const ctx = c.getContext('2d');
  drawLayer(ctx, keys, { scroll: 0, factor: 1, height: 58, alpha: 1, groundY: VIEW.ground, edge: true });
  nearCache.set(ci, c);
  return c;
}

/** 稳定散列：同一道具每次布局一致 */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function drawProp(ctx, key, opts) {
  const meta = SPRITES.images[key];
  if (!meta) return;
  const image = img(key);
  if (!image) return;
  const { x, baseY, height, alpha } = opts;
  const w = meta.w || image.width;
  const h = meta.h || image.height;
  if (!w || !h) return;
  const scale = height / h;
  const dw = w * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, x, baseY - height, dw, height);
  ctx.restore();
}

function drawLayer(ctx, keys, opts) {
  if (!keys) return;
  const { scroll, factor, height, alpha, groundY, edge } = opts;
  keys.forEach((key, i) => {
    const meta = SPRITES.images[key];
    if (!meta) return;
    const w = meta.w || 100;
    const h = meta.h || 100;
    const dw = w * (height / h);
    const jitter = (hash(key + i) - 0.5) * 90;
    let x = ((i + 0.5) / keys.length) * (VIEW.w - dw) + jitter + 20;
    x += -((scroll * factor) % (VIEW.w * 0.5));
    // 环绕
    x = ((x % (VIEW.w + 260)) + VIEW.w + 260) % (VIEW.w + 260) - 130;
    if (edge) {
      // 近景只放两侧最边缘，避免挡住战斗
      x = (i % 2 === 0) ? 4 + hash(key) * 18 : VIEW.w - dw - 8 - hash(key + 'z') * 18;
    }
    drawProp(ctx, key, { x, baseY: groundY, height, alpha });
  });
}

export function drawScene(ctx, chapterIndex, scroll = 0) {
  const ci = chapterIndex % CHAPTERS.length;
  const chapter = CHAPTERS[ci];
  const terrain = chapter.terrain;
  const groundY = VIEW.ground;

  // 天空 + 月亮（缓存）
  const skyC = getSky(ci, chapter);
  if (skyC) {
    ctx.drawImage(skyC, 0, 0);
  } else {
    const sky = SKY[terrain] || SKY.bamboo;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, sky[0]);
    g.addColorStop(0.55, sky[1]);
    g.addColorStop(1, sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }

  // 远景
  drawLayer(ctx, chapter.props && chapter.props.far, {
    scroll, factor: 0.06, height: 100, alpha: 0.45, groundY,
  });
  // 中景
  drawLayer(ctx, chapter.props && chapter.props.mid, {
    scroll, factor: 0.18, height: 84, alpha: 0.92, groundY,
  });

  // 背墙 + 地面：合并后的瓦片条，替代每帧上百次 drawImage
  const strips = getStrips(terrain);
  if (strips) {
    const backOff = (scroll * 0.1) % TILE;
    for (let x = -backOff - TILE; x < VIEW.w; x += strips.width) {
      ctx.drawImage(strips.back, x, groundY - 96);
    }
    const groundOff = (scroll * 0.25) % TILE;
    for (let x = -groundOff - TILE; x < VIEW.w; x += strips.width) {
      ctx.drawImage(strips.ground, x, groundY - 32);
    }
  } else {
    const body = img(`terrain/${terrain}_ground_body_M`);
    const top = img(`terrain/${terrain}_ground_top_M`);
    if (body) {
      for (let i = -1; i * TILE < VIEW.w + TILE; i++) {
        const x = i * TILE - ((scroll * 0.25) % TILE);
        if (top) ctx.drawImage(top, x, groundY - 32, TILE, TILE);
        ctx.drawImage(body, x, groundY, TILE, TILE);
        ctx.drawImage(body, x, groundY + TILE, TILE, TILE);
      }
    } else {
      ctx.fillStyle = '#26301f';
      ctx.fillRect(0, groundY, VIEW.w, VIEW.h - groundY);
    }
  }

  // 近景（贴两侧，框住战场）
  const nearC = getNear(ci, chapter);
  if (nearC) {
    ctx.drawImage(nearC, 0, 0);
  } else {
    drawLayer(ctx, chapter.props && chapter.props.near, {
      scroll, factor: 1, height: 58, alpha: 1, groundY, edge: true,
    });
  }

  // 地面小装饰
  drawDeco(ctx, chapter.props && chapter.props.deco, scroll, groundY);
}

/** 地面点缀：小花、小石、蘑菇 */
function drawDeco(ctx, keys, scroll, groundY) {
  if (!keys) return;
  keys.forEach((key, i) => {
    const meta = SPRITES.images[key];
    if (!meta) return;
    const image = img(key);
    if (!image) return;
    const w = meta.w || image.width;
    const h = meta.h || image.height;
    const height = 16 + hash(key + 'd') * 10;
    const scale = height / h;
    const dw = w * scale;
    const x = ((hash(key) * (VIEW.w - dw)) + ((scroll * 0.5) % 60)) % Math.max(1, VIEW.w - dw);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(image, x, groundY + 6 - height * 0.15, dw, height);
    ctx.restore();
  });
}
