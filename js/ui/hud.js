// 顶栏刷新
import { realmLabel, expNeed, levelIndex } from '../game/state.js';
import { CHAPTERS } from '../data/config.js';
import { isMobile } from './mobile.js';

const el = {};
let game = null;

export function initHud(g) {
  game = g;
  el.name = document.getElementById('playerName');
  el.title = document.getElementById('playerTitle');
  el.realm = document.getElementById('realmName');
  el.level = document.getElementById('levelText');
  el.xpFill = document.getElementById('xpFill');
  el.xpText = document.getElementById('xpText');
  el.hpFill = document.getElementById('hpFill');
  el.hpText = document.getElementById('hpText');
  el.stone = document.getElementById('stoneText');
  el.power = document.getElementById('powerText');
  el.floor = document.getElementById('floorText');
  refreshHud();
}

export function refreshHud() {
  if (!game) return;
  const s = game.state;
  const stats = game.stats;
  el.name.textContent = s.name;
  el.title.textContent = s.title || '';
  el.realm.textContent = realmLabel(s);
  el.level.textContent = 'Lv.' + levelIndex(s);

  const need = expNeed(s);
  el.xpFill.style.width = Math.min(100, (s.exp / need) * 100) + '%';
  el.xpText.textContent = `${Math.floor(s.exp)}/${need}`;

  const hp = Math.max(0, s.hp);
  el.hpFill.style.width = Math.min(100, (hp / stats.maxHp) * 100) + '%';
  el.hpText.textContent = `${Math.ceil(hp)}/${stats.maxHp}`;

  el.stone.textContent = fmt(s.stats.stone || s.coin);
  el.power.textContent = fmt(stats.power);
  const chapter = CHAPTERS[Math.floor((s.floor - 1) / 10) % CHAPTERS.length];
  // 窄屏空间紧张，秘境只显示层数
  el.floor.textContent = isMobile() ? `${s.floor}层` : `${s.floor}层 ${chapter.name}`;
}

function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return String(n);
}
