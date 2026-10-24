// 顶栏刷新
import { realmLabel, expNeed, levelIndex } from '../game/state.js';
import { CHAPTERS } from '../data/config.js';
import { isMobile } from './mobile.js';
import { playerPortrait } from './theme.js';

const el = {};
const last = {};
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
  el.avatar = document.getElementById('avatarPortrait');
  if (el.avatar) el.avatar.src = playerPortrait(game.state.appearance, true);
  refreshHud();
}

function text(key, node, value) {
  if (!node || last[key] === value) return;
  last[key] = value;
  node.textContent = value;
}

function width(key, node, value) {
  if (!node || last[key] === value) return;
  last[key] = value;
  node.style.width = value;
}

export function refreshHud() {
  if (!game) return;
  const s = game.state;
  const stats = game.stats;
  text('name', el.name, s.name);
  text('title', el.title, s.title || '');
  text('realm', el.realm, realmLabel(s));
  text('level', el.level, 'Lv.' + levelIndex(s));

  const need = expNeed(s);
  width('xpFill', el.xpFill, Math.min(100, (s.exp / need) * 100) + '%');
  text('xpText', el.xpText, `${Math.floor(s.exp)}/${need}`);

  const hp = Math.max(0, s.hp);
  width('hpFill', el.hpFill, Math.min(100, (hp / stats.maxHp) * 100) + '%');
  text('hpText', el.hpText, `${Math.ceil(hp)}/${stats.maxHp}`);

  // 顶栏显示可花费余额，而不是累计获得量
  text('stone', el.stone, fmt(s.coin));
  text('power', el.power, fmt(stats.power));
  const chapter = CHAPTERS[Math.floor((s.floor - 1) / 10) % CHAPTERS.length];
  // 窄屏空间紧张，秘境只显示层数
  text('floor', el.floor, isMobile() ? `${s.floor}层` : `${s.floor}层 ${chapter.name}`);
}

function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return String(n);
}
