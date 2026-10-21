// 飞升转生：仙缘结算与天赋加点
import { REALMS, BALANCE } from '../data/config.js';
import { TALENTS, talentOf } from '../data/talents.js';
import { ROUTES } from '../data/routes.js';

/** 是否可以飞升 */
export function canAscend(state) {
  if (state.realm < REALMS.length - 1) return false;
  const need = REALMS[REALMS.length - 1].need;
  return (state.bestFloor || 0) >= need;
}

export function ascendRequirement(state) {
  const need = REALMS[REALMS.length - 1].need;
  return { need, have: state.bestFloor || 0 };
}

/** 本次飞升能获得的仙缘 */
export function ascendReward(state) {
  const floor = state.bestFloor || 0;
  const boss = state.stats.bossKills || 0;
  return Math.max(10, Math.floor(floor / 6) + boss + 5);
}

/**
 * 执行飞升
 * @param choice 'go' | 'stay' | null
 */
export function ascend(state, choice) {
  const asc = state.ascend = state.ascend || { count: 0, points: 0, talents: {}, choice: null };
  const gain = ascendReward(state);

  // 结局文本
  let ending = null;
  if (state.partnerKey && ROUTES[state.partnerKey]) {
    const e = ROUTES[state.partnerKey].ending;
    ending = choice === 'stay' ? e.stay : e.go;
  }

  asc.count += 1;
  asc.points += gain;
  asc.choice = choice || asc.choice;

  // 重置进度
  state.realm = 0;
  state.stage = 0;
  state.exp = 0;
  state.floor = 1;
  state.bestFloor = 0;
  state.pendingRealm = null;
  state.hp = 1;

  // 装备与材料保留，境界与层数清零
  return { gain, ending, count: asc.count };
}

/** 天赋是否可用 */
export function talentAvailable(state, talent) {
  if (!talent.need) return true;
  const asc = state.ascend || {};
  return asc.choice === talent.need;
}

export function talentLevel(state, key) {
  const asc = state.ascend || {};
  return (asc.talents || {})[key] || 0;
}

/** 加点消耗：基础 1 点，每级递增 */
export function talentCost(state, key) {
  const t = talentOf(key);
  if (!t) return 99;
  const lv = talentLevel(state, key);
  return t.cost + lv;
}

export function canBuy(state, key) {
  const t = talentOf(key);
  if (!t) return false;
  if (!talentAvailable(state, t)) return false;
  const lv = talentLevel(state, key);
  if (lv >= t.max) return false;
  const asc = state.ascend || { points: 0 };
  return (asc.points || 0) >= talentCost(state, key);
}

export function buyTalent(state, key) {
  if (!canBuy(state, key)) return false;
  const asc = state.ascend = state.ascend || { points: 0, talents: {} };
  asc.talents = asc.talents || {};
  asc.points -= talentCost(state, key);
  asc.talents[key] = talentLevel(state, key) + 1;
  return true;
}

/** 背包容量加成 */
export function bagBonus(state) {
  return talentLevel(state, 'bag') * 10;
}

/** 当前背包容量 */
export function bagSize(state) {
  return BALANCE.bagSize + bagBonus(state);
}

/** 离线效率加成 */
export function offlineBonus(state) {
  return talentLevel(state, 'offline') * 0.12;
}

/** 天赋面板文本 */
export function talentRows(state) {
  return TALENTS.map((t) => ({
    talent: t,
    level: talentLevel(state, t.key),
    available: talentAvailable(state, t),
    cost: talentCost(state, t.key),
    can: canBuy(state, t.key),
  }));
}
