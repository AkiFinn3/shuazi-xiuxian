// 掉落：品质、词缀、命名、战力评分
import { RARITIES, SLOTS, AFFIXES, BALANCE } from '../data/config.js';
import { NAME_PREFIX, NAME_MATERIAL, SLOT_NAME, PREFIX_SUFFIX } from '../data/names.js';
import { itemPower } from './state.js';
import { SPRITES } from '../data/sprites.js';
import { bagSize } from './ascend.js';

let nextId = 1;

/** 兵器图标池 */
const ICON_KEYS = Object.keys(SPRITES.images).filter((k) => k.startsWith('icons/'));

export function rarityOf(key) {
  return RARITIES.find((r) => r.key === key) || RARITIES[0];
}

export function rarityIndex(key) {
  return RARITIES.findIndex((r) => r.key === key);
}

/** 依据幸运值掷品质 */
export function rollRarity(rng, luck = 0) {
  const items = RARITIES.map((r, i) => ({
    r,
    w: r.weight * (1 + (luck * 0.012 * i)),
  }));
  return rng.weighted(items).r;
}

/** 掷一件装备 */
export function rollItem(rng, floor, luck = 0) {
  const rarity = rollRarity(rng, luck);
  const rIdx = rarityIndex(rarity.key);
  const slotDef = rng.pick(SLOTS);
  const ilvl = Math.max(1, floor - rng.int(0, 1));

  const base = {};
  for (const [stat, [b, p]] of Object.entries(slotDef.base)) {
    const raw = (b + p * ilvl) * rarity.mult;
    base[stat] = stat === 'crit' || stat === 'aspd' || stat === 'lifesteal' || stat === 'coin'
      ? Math.round(raw * 10) / 10
      : Math.round(raw);
  }

  // 词缀
  const affixes = {};
  const pool = rng.shuffle(AFFIXES.slice());
  const picked = [];
  for (const a of pool) {
    if (picked.length >= rarity.affixes) break;
    // 词缀也带权重：抽一次权重
    const chosen = rng.weighted(picked.length ? AFFIXES.filter((x) => !picked.includes(x)) : AFFIXES);
    if (picked.includes(chosen)) continue;
    picked.push(chosen);
    const tier = 1 + rIdx * 0.08;
    const value = (chosen.base + chosen.per * ilvl) * tier * rng.float(0.85, 1.18);
    affixes[chosen.stat] = Math.round(value * 10) / 10;
  }

  const item = {
    id: nextId++,
    slot: slotDef.key,
    rarity: rarity.key,
    ilvl,
    base,
    affixes,
    name: makeName(rng, slotDef.key, rarity),
  };
  if (slotDef.key === 'weapon' && ICON_KEYS.length) {
    const key = rng.pick(ICON_KEYS);
    item.icon = SPRITES.images[key].src;
  }
  item.power = itemPower(item);
  return item;
}

/** 生成中文装备名 */
export function makeName(rng, slot, rarity) {
  const prefix = rng.pick(NAME_PREFIX);
  const material = rng.pick(NAME_MATERIAL);
  const tail = rng.pick(SLOT_NAME[slot] || ['器']);
  let name = `${prefix}·${material}${tail}`;
  if (rng.chance(0.12)) name += rng.pick(PREFIX_SUFFIX);
  if (rarityIndex(rarity) >= 4 && rng.chance(0.3)) name = `${material}·${prefix}${tail}`;
  return name;
}

/** 分解所得材料 */
export function salvageValue(item) {
  const rIdx = rarityIndex(item.rarity);
  const tier = 1 + rIdx * 1.6;
  const lvl = item.ilvl;
  return {
    iron: Math.round((2 + lvl * 0.5) * tier),
    bone: Math.round((1 + lvl * 0.35) * tier),
    jade: Math.round((0.6 + lvl * 0.16) * (rIdx + 1)),
    wood: Math.round((1 + lvl * 0.3) * tier),
    core: rIdx >= 3 ? Math.round((1 + lvl * 0.08) * (rIdx - 2)) : 0,
  };
}

/** 装备是否比当前身上的更好 */
export function isBetter(item, current, ratio = 1.02) {
  if (!current) return true;
  return item.power > current.power * ratio;
}

/** 背包是否已满 */
export function bagFull(state) {
  return state.bag.length >= bagSize(state);
}
