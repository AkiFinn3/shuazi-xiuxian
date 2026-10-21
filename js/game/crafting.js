// 炼丹 / 炼器：丹方、图纸、材料与队列
import { SLOTS, RARITIES, BALANCE } from '../data/config.js';
import { rollItem, rarityIndex } from './loot.js';
import { itemPower } from './state.js';
import { Rng } from '../engine/rng.js';

/** 丹方 */
export const RECIPES = [
  {
    key: 'juqi', name: '聚气丹', icon: 'ui/ui_xianxia_item_pill_bottle',
    herb: 2, core: 0, coin: 30, time: 20,
    desc: '服用后立刻获得一段修为。刷子专用。',
    effect: { expMul: 0.8 },
  },
  {
    key: 'pojing', name: '破境丹', icon: 'ui/ui_xianxia_item_pill_bottle',
    herb: 3, core: 1, coin: 120, time: 60,
    desc: '渡劫时抗性大增，渡劫伤害 -25%。',
    effect: { tribulation: 0.25 },
  },
  {
    key: 'ruijin', name: '锐金丹', icon: 'ui/ui_xianxia_item_pill_bottle',
    herb: 2, core: 1, coin: 80, time: 40,
    desc: '服用后 15 分钟内攻击 +30%。',
    effect: { atkPct: 30, duration: 900 },
  },
  {
    key: 'jubao', name: '聚宝丹', icon: 'ui/ui_xianxia_item_pill_bottle',
    herb: 4, core: 0, coin: 200, time: 90,
    desc: '服用后 15 分钟内掉落品质提升。',
    effect: { luck: 25, duration: 900 },
  },
  {
    key: 'xisui', name: '洗髓丹', icon: 'ui/ui_xianxia_item_pill_bottle',
    herb: 3, core: 2, coin: 260, time: 120,
    desc: '洗去装备上的杂质，重随一条词缀。',
    effect: { reroll: true },
  },
];

/** 图纸（炼器用） */
export const BLUEPRINTS = [
  { key: 'weapon', name: '兵器图纸', iron: 6, bone: 2, jade: 1, coin: 150, desc: '打造一把兵器，品质保底玄品。' },
  { key: 'helmet', name: '头冠图纸', iron: 4, bone: 3, jade: 0, coin: 120, desc: '打造一顶头冠。' },
  { key: 'robe', name: '法袍图纸', iron: 3, bone: 2, wood: 3, coin: 120, desc: '打造一件法袍。' },
  { key: 'boots', name: '靴子图纸', iron: 3, bone: 2, wood: 2, coin: 120, desc: '打造一双靴。' },
  { key: 'pendant', name: '玉佩图纸', iron: 2, bone: 1, jade: 3, coin: 150, desc: '打造一枚玉佩。' },
  { key: 'ring', name: '灵戒图纸', iron: 2, bone: 1, jade: 2, coin: 150, desc: '打造一枚灵戒。' },
];

export const QUALITY_NAMES = ['下品', '中品', '上品', '极品'];

/** 材料消耗检查 */
export function canAfford(state, cost) {
  for (const [k, v] of Object.entries(cost)) {
    if (k === 'coin') {
      if (state.coin < v) return false;
    } else if ((state.mats[k] || 0) < v) {
      return false;
    }
  }
  return true;
}

export function pay(state, cost) {
  for (const [k, v] of Object.entries(cost)) {
    if (k === 'coin') state.coin -= v;
    else state.mats[k] = (state.mats[k] || 0) - v;
  }
}

/** 炼丹队列：返回 { recipe, remain, total } */
export function queueAlchemy(state, recipe) {
  const cost = { herb: recipe.herb, core: recipe.core, coin: recipe.coin };
  if (!canAfford(state, cost)) return false;
  pay(state, cost);
  state.alchemy = state.alchemy || [];
  state.alchemy.push({
    key: recipe.key,
    remain: recipe.time,
    total: recipe.time,
    quality: null,
  });
  if (state.alchemy.length > 3) state.alchemy.shift();
  return true;
}

/** 推进炼丹队列 */
export function tickAlchemy(state, dt) {
  state.alchemy = state.alchemy || [];
  const done = [];
  for (const job of state.alchemy) {
    if (job.done) continue;
    job.remain -= dt;
    if (job.remain <= 0) {
      job.remain = 0;
      job.done = true;
      done.push(job);
    }
  }
  return done;
}

/** 炼丹出丹：品质由炼丹等级与运气决定 */
export function finishAlchemy(state, job, rng = new Rng()) {
  const recipe = RECIPES.find((r) => r.key === job.key);
  const level = state.alchemyLevel || 1;
  const roll = rng.float(0, 1) + level * 0.06;
  let qi = 0;
  if (roll > 1.05) qi = 3;
  else if (roll > 0.8) qi = 2;
  else if (roll > 0.45) qi = 1;
  const quality = QUALITY_NAMES[qi];
  const mul = 1 + qi * 0.5;
  const pill = {
    key: recipe.key,
    name: recipe.name,
    quality,
    qi,
    count: 1,
    desc: recipe.desc,
    effect: recipe.effect,
  };
  if (recipe.effect.expMul) {
    pill.exp = Math.floor((120 + state.floor * 30) * recipe.effect.expMul * mul);
  }
  state.pills = state.pills || [];
  state.pills.push(pill);
  return pill;
}

/** 打造装备：保底玄品 */
export function forge(state, blueprint, floor, rng = new Rng()) {
  const slotDef = SLOTS.find((s) => s.key === blueprint.key);
  const item = rollItem(rng, floor, 0);
  item.slot = blueprint.key;
  const minRarity = rarityIndex('xuan');
  if (rarityIndex(item.rarity) < minRarity) {
    item.rarity = RARITIES[minRarity].key;
    item.affixes = item.affixes || {};
    item.power = itemPower(item);
  }
  item.name = `${blueprint.name.replace('图纸', '')}·${item.name.split('·').pop() || '新'}`;
  return item;
}

/** 强化：消耗材料提升装备等级 */
export function upgradeCost(item) {
  const lv = item.plus || 0;
  return {
    iron: Math.round(2 + lv * 1.4),
    bone: Math.round(1 + lv * 0.8),
    coin: Math.round(40 + lv * 60),
  };
}

/** 强化成功率随等级下降，但有保底 */
export function upgradeChance(item) {
  const lv = item.plus || 0;
  return Math.max(0.35, 0.95 - lv * 0.06);
}

/** 洗练：重随一条词缀 */
export function reroll(item, rng = new Rng()) {
  const keys = Object.keys(item.affixes);
  if (!keys.length) return false;
  const key = rng.pick(keys);
  const mul = 0.85 + rng.float(0, 0.4);
  item.affixes[key] = Math.round(item.affixes[key] * mul * 10) / 10;
  item.power = itemPower(item);
  return true;
}
