// 灵田：种植灵草，成熟后收获；需要浇灌与看护
export const SEEDS = [
  {
    key: 'herb', name: '灵草', cost: 50, time: 300, yield: { herb: 3 },
    desc: '五分钟一熟，炼丹常用。',
  },
  {
    key: 'vine', name: '赤血藤', cost: 180, time: 1200, yield: { herb: 8, core: 1 },
    desc: '二十分钟，附带一枚妖丹。',
  },
  {
    key: 'lingzhi', name: '千年灵芝', cost: 600, time: 3600, yield: { herb: 20, core: 3, jade: 2 },
    desc: '一小时，炼丹上品之选。',
  },
];

export const PLOTS = 3;
export const WATER_COST = 30;          // 浇灌一次
export const GUARD_COST = { iron: 10, core: 1 };  // 傀儡看守
export const PEST_CHANCE = 0.32;       // 生虫概率
export const GUARD_BONUS = 1.2;        // 看护产量加成

export function farmState(state) {
  state.farm = state.farm || { plots: [] };
  if (!Array.isArray(state.farm.plots)) state.farm.plots = [];
  while (state.farm.plots.length < PLOTS) state.farm.plots.push(null);
  return state.farm;
}

/** 种植 */
export function plant(state, seedKey) {
  const seed = SEEDS.find((x) => x.key === seedKey);
  if (!seed) return { error: '没有这种种子' };
  if (state.coin < seed.cost) return { error: '灵石不足' };
  const farm = farmState(state);
  const idx = farm.plots.findIndex((p) => !p);
  if (idx < 0) return { error: '灵田满了' };
  state.coin -= seed.cost;
  farm.plots[idx] = {
    seed: seedKey,
    plantedAt: Date.now(),
    readyAt: Date.now() + seed.time * 1000,
    pest: Math.random() < PEST_CHANCE,
    guard: null,
    watered: 0,
  };
  return { ok: true, index: idx, seed };
}

/** 浇灌：剩余时间减半 */
export function water(state, index) {
  const farm = farmState(state);
  const plot = farm.plots[index];
  if (!plot) return { error: '这块地是空的' };
  if (state.coin < WATER_COST) return { error: '灵石不足' };
  if (plot.watered >= 2) return { error: '浇得太多，药性会散' };
  const now = Date.now();
  if (now >= plot.readyAt) return { error: '已经熟了' };
  const left = plot.readyAt - now;
  plot.readyAt -= left / 2;
  plot.watered += 1;
  state.coin -= WATER_COST;
  return { ok: true };
}

/** 除虫 */
export function clearPest(state, index) {
  const farm = farmState(state);
  const plot = farm.plots[index];
  if (!plot) return { error: '这块地是空的' };
  if (!plot.pest) return { error: '没有虫' };
  plot.pest = false;
  return { ok: true };
}

/** 派看守：'tool' 傀儡 / 'spirit' 器灵 */
export function assignGuard(state, index, kind) {
  const farm = farmState(state);
  const plot = farm.plots[index];
  if (!plot) return { error: '这块地是空的' };
  if (plot.guard) return { error: '已经有看守了' };
  if (kind === 'tool') {
    if ((state.mats.iron || 0) < GUARD_COST.iron || (state.mats.core || 0) < GUARD_COST.core) {
      return { error: `需要玄铁 ${GUARD_COST.iron} · 妖丹 ${GUARD_COST.core}` };
    }
    state.mats.iron -= GUARD_COST.iron;
    state.mats.core -= GUARD_COST.core;
  } else if (kind === 'spirit') {
    const fate = state.fate;
    if (!fate || !fate.unlocked) return { error: '器灵还没醒' };
    const used = farm.plots.some((p) => p && p.guard === 'spirit');
    if (used) return { error: '器灵只能守一块地' };
  }
  plot.guard = kind;
  plot.pest = false;   // 看守会顺手把虫赶走
  return { ok: true };
}

/** 收获 */
export function harvest(state, index) {
  const farm = farmState(state);
  const plot = farm.plots[index];
  if (!plot) return { error: '这块地是空的' };
  if (Date.now() < plot.readyAt) return { error: '还没熟' };
  const seed = SEEDS.find((x) => x.key === plot.seed) || SEEDS[0];
  const mul = plot.guard ? GUARD_BONUS : 1;
  const pestMul = plot.pest ? 0.5 : 1;
  farm.plots[index] = null;
  const got = {};
  for (const [k, v] of Object.entries(seed.yield)) {
    got[k] = Math.max(1, Math.round(v * mul * pestMul));
    state.mats[k] = (state.mats[k] || 0) + got[k];
  }
  return { ok: true, seed, yield: got, pest: plot.pest, guard: plot.guard };
}

/** 每块地的状态 */
export function plotInfo(state, index) {
  const farm = farmState(state);
  const plot = farm.plots[index];
  if (!plot) return { empty: true };
  const seed = SEEDS.find((x) => x.key === plot.seed) || SEEDS[0];
  const left = Math.max(0, Math.ceil((plot.readyAt - Date.now()) / 1000));
  return {
    empty: false,
    seed,
    left,
    ready: left === 0,
    pest: !!plot.pest,
    guard: plot.guard,
    watered: plot.watered || 0,
    pct: Math.min(100, (1 - left / seed.time) * 100),
  };
}
