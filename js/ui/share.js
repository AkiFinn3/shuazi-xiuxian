// 分享图：把当前进度画成一张可下载的 PNG
import { SPRITES } from '../data/sprites.js';
import { realmLabel } from '../game/state.js';
import { CHAPTERS } from '../data/config.js';

const W = 480;
const H = 640;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * 生成分享图
 * @param game 游戏实例
 * @param saveCode 存档码（可选，显示在底部）
 * @returns {Promise<string>} dataURL
 */
export async function buildShareImage(game, saveCode) {
  const s = game.state;
  const stats = game.stats;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  // 背景
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#141a26');
  g.addColorStop(0.6, '#1d2434');
  g.addColorStop(1, '#0c0f16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 边框
  ctx.strokeStyle = '#3b4763';
  ctx.lineWidth = 2;
  roundRect(ctx, 8, 8, W - 16, H - 16, 6);
  ctx.stroke();
  ctx.strokeStyle = '#6fd6b0';
  ctx.lineWidth = 1;
  roundRect(ctx, 12, 12, W - 24, H - 24, 4);
  ctx.stroke();

  // 标题
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8c46a';
  ctx.font = 'bold 22px FusionPixel, monospace';
  ctx.fillText('谁让这个刷子修仙的', W / 2, 48);
  ctx.fillStyle = '#8c9ab5';
  ctx.font = '12px FusionPixel, monospace';
  ctx.fillText('— 挂机刷宝像素修仙 —', W / 2, 68);

  // 角色立绘
  const animKey = `hero/${s.appearance}_idle`;
  const meta = SPRITES.anims[animKey];
  if (meta) {
    const img = await loadImage(meta.src);
    if (img) {
      const [cw, ch] = meta.cell;
      const scale = Math.min(150 / cw, 170 / ch);
      const dw = cw * scale, dh = ch * scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, cw, ch, (W - dw) / 2, 84, dw, dh);
    }
  }

  // 道号 + 称号
  ctx.fillStyle = '#e8c46a';
  ctx.font = 'bold 26px FusionPixel, monospace';
  ctx.fillText(s.name || '无名', W / 2, 292);
  if (s.title) {
    ctx.fillStyle = '#6fd6b0';
    ctx.font = '14px FusionPixel, monospace';
    ctx.fillText(`「${s.title}」`, W / 2, 314);
  }

  // 数据表
  const chapter = CHAPTERS[Math.floor(((s.bestFloor || 1) - 1) / 10) % CHAPTERS.length];
  const rows = [
    ['境界', realmLabel(s)],
    ['战力', String(stats.power)],
    ['最高通关', `第 ${s.bestFloor || 0} 层 · ${chapter.name}`],
    ['击杀妖兽', String(s.stats.kills || 0)],
    ['拾取装备', String(s.stats.drops || 0)],
    ['飞升次数', String((s.ascend && s.ascend.count) || 0)],
    ['在线时长', formatTime(s.stats.playtime || 0)],
  ];
  const boxX = 60, boxY = 334, boxW = W - 120;
  ctx.fillStyle = 'rgba(10,14,21,.72)';
  roundRect(ctx, boxX, boxY, boxW, rows.length * 26 + 16, 5);
  ctx.fill();
  ctx.textAlign = 'left';
  rows.forEach((r, i) => {
    const y = boxY + 26 + i * 26;
    ctx.fillStyle = '#8c9ab5';
    ctx.font = '13px FusionPixel, monospace';
    ctx.fillText(r[0], boxX + 16, y);
    ctx.fillStyle = '#e6ecf5';
    ctx.textAlign = 'right';
    ctx.fillText(r[1], boxX + boxW - 16, y);
    ctx.textAlign = 'left';
  });

  // 底部：存档码
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5a6784';
  ctx.font = '11px FusionPixel, monospace';
  if (saveCode) {
    const short = saveCode.length > 46 ? saveCode.slice(0, 46) + '…' : saveCode;
    ctx.fillText('存档码：' + short, W / 2, H - 44);
  }
  ctx.fillStyle = '#3b4763';
  ctx.font = '10px FusionPixel, monospace';
  ctx.fillText('此图由本机生成 · 欢迎来比一比谁刷得久', W / 2, H - 26);

  return c.toDataURL('image/png');
}

export function downloadDataURL(dataURL, filename) {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} 小时 ${m} 分`;
  if (m > 0) return `${m} 分钟`;
  return `${Math.floor(sec)} 秒`;
}
