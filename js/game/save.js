// 存档：localStorage + 导入导出 + 离线结算
import { BALANCE } from '../data/config.js';
import { deriveStats, SAVE_VERSION } from './state.js';
import { offlineBonus } from './ascend.js';

const KEY = 'shuazi_xiuxian_save_v1';

export function saveGame(state) {
  state.lastSeen = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('存档失败', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== SAVE_VERSION) return migrate(data);
    return data;
  } catch (e) {
    console.warn('读档失败', e);
    return null;
  }
}

function migrate(data) {
  if (!data) return null;
  data.v = SAVE_VERSION;
  data.settings = Object.assign({
    autoBattle: true, autoEquip: true, autoSalvage: true,
    autoSalvageBelow: 'xuan', autoAdvance: true,
    volume: 0.5, sound: true, speed: 1,
  }, data.settings || {});
  data.stats = Object.assign({
    kills: 0, bossKills: 0, drops: 0, salvaged: 0, deaths: 0, playtime: 0, stone: 0,
  }, data.stats || {});
  if (data.spiritRoots === undefined) data.spiritRoots = null;
  return data;
}

export function clearGame() {
  localStorage.removeItem(KEY);
}

export function exportSave(state) {
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)));
}

export function importSave(text) {
  try {
    const json = decodeURIComponent(escape(atob(text.trim())));
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || !data.name) return null;
    return migrate(data);
  } catch (e) {
    return null;
  }
}

/**
 * 离线收益结算
 * @returns {null | {seconds, hours, coin, exp, kills}}
 */
export function offlineReward(state) {
  const now = Date.now();
  const last = state.lastSeen || now;
  const seconds = Math.max(0, Math.floor((now - last) / 1000));
  if (seconds < 60) return null;

  const capped = Math.min(seconds, BALANCE.offlineCapHours * 3600);
  const rate = Math.min(1, BALANCE.offlineRate + offlineBonus(state));
  const stats = deriveStats(state);

  // 依据当前层数估算刷怪效率
  const floor = Math.max(1, state.floor);
  const expPerKill = 7 * Math.pow(BALANCE.enemyExpGrowth, floor - 1);
  const coinPerKill = 4 * Math.pow(BALANCE.enemyCoinGrowth, floor - 1);
  const killsPerSecond = 0.25;
  const kills = Math.floor(capped * killsPerSecond * rate);

  return {
    seconds,
    hours: capped / 3600,
    capped: capped < seconds,
    kills,
    coin: Math.floor(coinPerKill * kills * (1 + stats.coinPct / 100)),
    exp: Math.floor(expPerKill * kills * (1 + stats.spiritPct / 100)),
  };
}
