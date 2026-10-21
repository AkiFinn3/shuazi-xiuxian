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
  const chapter = CHAPTERS[chapterIndex % CHAPTERS.length];
  const terrain = chapter.terrain;
  const sky = SKY[terrain] || SKY.bamboo;
  const groundY = VIEW.ground;

  // 天空
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, sky[0]);
  g.addColorStop(0.55, sky[1]);
  g.addColorStop(1, sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  // 月亮（固定在天空，不参与视差）
  if (chapter.moon) {
    const moon = img(chapter.moon);
    if (moon) {
      const meta = SPRITES.images[chapter.moon];
      const height = 62;
      const scale = height / (meta.h || moon.height);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(moon, 74, 26, (meta.w || moon.width) * scale, height);
      ctx.restore();
    }
  }

  // 远景
  drawLayer(ctx, chapter.props && chapter.props.far, {
    scroll, factor: 0.06, height: 100, alpha: 0.45, groundY,
  });
  // 中景
  drawLayer(ctx, chapter.props && chapter.props.mid, {
    scroll, factor: 0.18, height: 84, alpha: 0.92, groundY,
  });

  // 背墙
  const back = img(`terrain/${terrain}_backwall_M`);
  if (back) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = -1; i * 32 < VIEW.w + 32; i++) {
      ctx.drawImage(back, i * 32 - ((scroll * 0.1) % 32), groundY - 96, 32, 32);
    }
    ctx.restore();
  }

  // 地面
  const body = img(`terrain/${terrain}_ground_body_M`);
  const top = img(`terrain/${terrain}_ground_top_M`);
  if (body) {
    for (let i = -1; i * 32 < VIEW.w + 32; i++) {
      const x = i * 32 - ((scroll * 0.25) % 32);
      if (top) ctx.drawImage(top, x, groundY - 32, 32, 32);
      ctx.drawImage(body, x, groundY, 32, 32);
      ctx.drawImage(body, x, groundY + 32, 32, 32);
    }
  } else {
    ctx.fillStyle = '#26301f';
    ctx.fillRect(0, groundY, VIEW.w, VIEW.h - groundY);
  }

  // 近景（贴两侧，框住战场）
  drawLayer(ctx, chapter.props && chapter.props.near, {
    scroll, factor: 1, height: 58, alpha: 1, groundY, edge: true,
  });

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
