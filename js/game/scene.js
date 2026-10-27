// 战斗场景：高清青绿山水为底 + 分层雾、飘落物与水墨近景
import { VIEW, CHAPTERS } from '../data/config.js';

const BG_SRC = 'assets/hd/landscape-qinglu.webp';
const PANEL_W = VIEW.w + 64;

let bgImage = null;
let bgRequested = false;
const backdrops = new Map();
let mistSprite = null;

const MOODS = [
  {
    tint: '#c9e0cc', tintAlpha: 0.55, glow: 'rgba(255,236,190,.85)', glowAlpha: 0.34,
    ground: '#41584a', mistAlpha: 0.20, ink: '#20362d', particle: 'leaf', pcolor: '#7fa06a',
  },
  {
    tint: '#8fa8d2', tintAlpha: 0.68, glow: 'rgba(255,214,160,.85)', glowAlpha: 0.30,
    ground: '#2f4250', mistAlpha: 0.26, ink: '#16232b', particle: 'mote', pcolor: '#cfe0ff',
  },
  {
    tint: '#d1805c', tintAlpha: 0.70, glow: 'rgba(255,170,105,.9)', glowAlpha: 0.42,
    ground: '#3a2622', mistAlpha: 0.10, ink: '#241512', particle: 'ember', pcolor: '#ffb066',
  },
  {
    tint: '#c9c3e6', tintAlpha: 0.62, glow: 'rgba(255,244,217,.9)', glowAlpha: 0.38,
    ground: '#5b6172', mistAlpha: 0.34, ink: '#2a3242', particle: 'cloud', pcolor: '#ffffff',
  },
  {
    tint: '#4f7c82', tintAlpha: 0.80, glow: 'rgba(159,224,207,.85)', glowAlpha: 0.22,
    ground: '#243434', mistAlpha: 0.24, ink: '#12201f', particle: 'lantern', pcolor: '#ffd28a',
  },
  {
    tint: '#e7b7bd', tintAlpha: 0.72, glow: 'rgba(255,214,224,.9)', glowAlpha: 0.34,
    ground: '#4a5b46', mistAlpha: 0.22, ink: '#26372a', particle: 'petal', pcolor: '#f3b6c4',
  },
];

function getBg() {
  if (bgImage) return bgImage;
  if (!bgRequested) {
    bgRequested = true;
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { bgImage = im; };
    im.src = BG_SRC;
  }
  return null;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

function drawForeground(g, w, h, mood) {
  g.save();
  g.lineCap = 'round';
  // 岸边草丛
  for (let i = 0; i < 52; i++) {
    const x = (i / 52) * w + (hash('gx' + i) - 0.5) * 12;
    const tall = 7 + hash('gh' + i) * 20;
    const bend = (hash('gb' + i) - 0.5) * 16;
    g.strokeStyle = rgba(mood.ink, 0.35 + hash('ga' + i) * 0.3);
    g.lineWidth = 0.8 + hash('gw' + i) * 0.9;
    g.beginPath();
    g.moveTo(x, h);
    g.quadraticCurveTo(x + bend * 0.4, h - tall * 0.6, x + bend, h - tall);
    g.stroke();
  }
  // 两侧水墨芦苇，框住战场
  for (const side of [0, 1]) {
    for (let i = 0; i < 4; i++) {
      const baseX = side ? w - 6 - i * 9 : 6 + i * 9;
      const lean = (side ? -1 : 1) * (10 + hash('r' + side + i) * 16);
      const topX = baseX + lean;
      const topY = h - 150 - hash('rt' + side + i) * 100;
      g.strokeStyle = rgba(mood.ink, 0.42);
      g.lineWidth = 1.4 + hash('rw' + side + i) * 1.2;
      g.beginPath();
      g.moveTo(baseX, h + 4);
      g.quadraticCurveTo(baseX + lean * 0.3, (h + topY) / 2, topX, topY);
      g.stroke();
      g.lineWidth = 1;
      for (let k = 1; k <= 3; k++) {
        const y = topY + (h - topY) * (k / 4.6);
        const dir = k % 2 ? 1 : -1;
        g.beginPath();
        g.moveTo(topX + lean * (1 - k / 5), y);
        g.quadraticCurveTo(topX + dir * 12, y - 8, topX + dir * 22, y - 3);
        g.stroke();
      }
    }
  }
  g.restore();
}

function buildBackdrop(ci, mood, image) {
  const c = makeCanvas(PANEL_W, VIEW.h);
  const g = c.getContext('2d');
  const scale = 0.82;
  g.drawImage(image, -100, -20, image.naturalWidth * scale, image.naturalHeight * scale);

  g.save();
  g.globalCompositeOperation = 'soft-light';
  g.globalAlpha = mood.tintAlpha;
  g.fillStyle = mood.tint;
  g.fillRect(0, 0, PANEL_W, VIEW.h);
  g.restore();

  const glow = g.createRadialGradient(PANEL_W * 0.62, 196, 8, PANEL_W * 0.62, 196, 320);
  glow.addColorStop(0, mood.glow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.save();
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = mood.glowAlpha;
  g.fillStyle = glow;
  g.fillRect(0, 0, PANEL_W, VIEW.h);
  g.restore();

  const haze = g.createLinearGradient(0, 0, 0, 150);
  haze.addColorStop(0, 'rgba(246,241,226,.42)');
  haze.addColorStop(1, 'rgba(246,241,226,0)');
  g.fillStyle = haze;
  g.fillRect(0, 0, PANEL_W, 150);

  const mist = g.createLinearGradient(0, 108, 0, 250);
  mist.addColorStop(0, 'rgba(250,247,238,0)');
  mist.addColorStop(0.55, `rgba(250,247,238,${mood.mistAlpha})`);
  mist.addColorStop(1, 'rgba(250,247,238,0)');
  g.fillStyle = mist;
  g.fillRect(0, 108, PANEL_W, 142);

  const ground = g.createLinearGradient(0, VIEW.ground - 12, 0, VIEW.h);
  ground.addColorStop(0, 'rgba(26,40,34,0)');
  ground.addColorStop(0.3, rgba(mood.ground, 0.30));
  ground.addColorStop(1, rgba(mood.ground, 0.66));
  g.fillStyle = ground;
  g.fillRect(0, VIEW.ground - 12, PANEL_W, VIEW.h - VIEW.ground + 12);

  g.strokeStyle = rgba(mood.ink, 0.24);
  g.lineWidth = 1;
  for (let i = 0; i < 30; i++) {
    const x = hash('sh' + i) * PANEL_W;
    const len = 12 + hash('sl' + i) * 44;
    const y = VIEW.ground - 2 + (hash('sy' + i) - 0.5) * 4;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + len / 2, y + 1.4, x + len, y);
    g.stroke();
  }

  drawForeground(g, PANEL_W, VIEW.h, mood);

  const vignette = g.createLinearGradient(0, 0, 0, VIEW.h);
  vignette.addColorStop(0, 'rgba(22,32,26,.14)');
  vignette.addColorStop(0.4, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(18,28,22,.30)');
  g.fillStyle = vignette;
  g.fillRect(0, 0, PANEL_W, VIEW.h);

  backdrops.set(ci, c);
  return c;
}

function getMistSprite() {
  if (mistSprite) return mistSprite;
  const c = makeCanvas(320, 96);
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(160, 48, 4, 160, 48, 158);
  rg.addColorStop(0, 'rgba(255,253,244,.55)');
  rg.addColorStop(0.55, 'rgba(255,253,244,.24)');
  rg.addColorStop(1, 'rgba(255,253,244,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 320, 96);
  mistSprite = c;
  return c;
}

function drawMist(ctx, mood, time, lowFx) {
  const sprite = getMistSprite();
  const count = lowFx ? 1 : 3;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const dir = i % 2 ? -1 : 1;
    const speed = 7 + i * 3;
    const span = VIEW.w + 460;
    const x = ((time * speed * dir + i * 380) % span + span) % span - 230;
    const w = 360 + i * 90;
    const h = 100 + i * 16;
    const y = 128 + i * 34 + Math.sin(time * 0.35 + i) * 4;
    ctx.globalAlpha = (0.16 - i * 0.03) * (mood.mistAlpha / 0.24);
    ctx.drawImage(sprite, x, y, w, h);
  }
  ctx.restore();
}

function drawParticles(ctx, mood, time, lowFx) {
  const count = lowFx ? 9 : 22;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const s1 = hash('p' + i);
    const s2 = hash('q' + i);
    const s3 = hash('r' + i);
    let x;
    let y;
    const kind = mood.particle;
    if (kind === 'ember') {
      x = s1 * VIEW.w + Math.sin(time * 1.1 + i) * 12;
      y = VIEW.ground - ((time * (16 + s2 * 18) + s3 * 320) % 320);
    } else if (kind === 'mote') {
      x = (s1 * VIEW.w + time * (3 + s2 * 5)) % VIEW.w;
      y = 92 + ((s2 * 210 + time * 4) % 210) + Math.sin(time * 0.6 + i) * 6;
    } else if (kind === 'cloud') {
      x = (s1 * VIEW.w + time * (2 + s2 * 4)) % VIEW.w;
      y = 104 + s2 * 96 + Math.sin(time * 0.4 + i) * 5;
    } else if (kind === 'lantern') {
      x = (s1 * VIEW.w + time * (4 + s2 * 6)) % VIEW.w;
      y = 96 + s2 * 150 + Math.sin(time * 0.5 + i) * 12;
    } else {
      x = (s1 * VIEW.w + time * (9 + s2 * 12)) % (VIEW.w + 40) - 20;
      y = ((s2 * 260 + time * (7 + s3 * 10)) % 290) + Math.sin(time * 0.8 + i) * 8;
    }

    const fade = 0.35 + s3 * 0.35;
    ctx.globalAlpha = fade;
    if (kind === 'leaf' || kind === 'petal') {
      ctx.fillStyle = mood.pcolor;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * (0.6 + s2) + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.6, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (kind === 'ember') {
      ctx.fillStyle = mood.pcolor;
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = fade * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'cloud') {
      ctx.globalAlpha = fade * 0.22;
      ctx.fillStyle = mood.pcolor;
      ctx.beginPath();
      ctx.ellipse(x, y, 46 + s1 * 40, 8 + s2 * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'lantern') {
      ctx.globalAlpha = fade * 0.9;
      ctx.fillStyle = mood.pcolor;
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = fade * 0.18;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = mood.pcolor;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + s3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawScene(ctx, chapterIndex, scroll = 0, time = 0, lowFx = false) {
  const ci = chapterIndex % CHAPTERS.length;
  const mood = MOODS[ci % MOODS.length];
  const image = getBg();
  const backdrop = image ? (backdrops.get(ci) || buildBackdrop(ci, mood, image)) : null;

  if (backdrop) {
    ctx.drawImage(backdrop, -32 + Math.sin(scroll * 0.015) * 12, 0);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    sky.addColorStop(0, rgba(mood.tint, 1));
    sky.addColorStop(0.6, '#f2ecdc');
    sky.addColorStop(1, rgba(mood.ground, 1));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }

  drawMist(ctx, mood, time, lowFx);
  drawParticles(ctx, mood, time, lowFx);
}
