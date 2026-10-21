// 本命法宝：可成长的武器 + 器灵
import { SPRITES } from '../data/sprites.js';
import { STAT_LABEL } from '../data/config.js';

/** 六种法宝原型，每个 4 阶进化 */
/** 器灵默认名与候选名 */
export const SPIRIT_NAMES = ['二狗', '小灰', '阿七', '断锋', '老铁', '青芒', '一钱', '无名'];

export const FATE_TYPES = {
  jian: { name: '本命飞剑', key: 'jian', bonus: '暴击伤害', types: ['剑', '攻'] },
  dao: { name: '本命长刀', key: 'dao', bonus: '攻击', types: ['刀', '攻'] },
  qiang: { name: '本命长枪', key: 'qiang', bonus: '攻速', types: ['枪', '攻'] },
  chanzhang: { name: '本命禅杖', key: 'chanzhang', bonus: '修为获取', types: ['杖', '法'] },
  fuchen: { name: '本命符箓', key: 'fuchen', bonus: '幸运', types: ['符', '运'] },
  ji: { name: '本命长戟', key: 'ji', bonus: '破防', types: ['戟', '攻'] },
};

export const FATE_TIERS = [
  { name: '初醒', atkPct: 0.08, hpPct: 0.05, critDmg: 0, desc: '器灵初醒，随主而战。' },
  { name: '通灵', atkPct: 0.16, hpPct: 0.10, critDmg: 10, desc: '剑意通灵，出手更狠。' },
  { name: '化形', atkPct: 0.26, hpPct: 0.16, critDmg: 20, desc: '器灵化形，可自行杀敌。' },
  { name: '圆满', atkPct: 0.40, hpPct: 0.25, critDmg: 35, desc: '人器合一，一念之间。' },
];

/** 器灵脾性台词 */
export const SPIRIT_LINES = [
  { at: 0, text: '{name}懵懵懂懂：……主人？' },
  { at: 1, text: '{name}：主人今天状态不错，再刷两百层我都不累。' },
  { at: 2, text: '{name}：主人，这件垃圾装备我帮你收着了，别扔。' },
  { at: 3, text: '{name}：你今天刷了 {min} 分钟了。要不……歇会儿？' },
  { at: 4, text: '{name}：别刷了别刷了，我的小身板快被灵石压塌了。' },
];

/** 法宝贴图路径（进化阶段） */
export function fateSprite(type, tier) {
  const stage = Math.max(0, Math.min(3, tier - 1));
  const key = 'weapon/wp_xianxia_evo_' + type + '_0' + stage;
  const meta = SPRITES.images[key];
  return meta ? meta.src : null;
}

export function fateMeta(type, tier) {
  const stage = Math.max(0, Math.min(3, tier - 1));
  return SPRITES.images['weapon/wp_xianxia_evo_' + type + '_0' + stage] || null;
}

/** 觉醒条件 */
export function canAwaken(state) {
  return state.realm >= 2 && !(state.fate && state.fate.unlocked);
}

/** 器灵经验 -> 等级 -> 阶数 */
export function fateLevelFromExp(exp) {
  // 每级所需经验递增
  let level = 1;
  let need = 60;
  let rest = exp;
  while (rest >= need && level < 60) {
    rest -= need;
    level++;
    need = Math.round(need * 1.35);
  }
  return { level, need, rest };
}

export function tierFromLevel(level) {
  return Math.max(1, Math.min(4, Math.floor((level - 1) / 3) + 1));
}

/** 增加器灵经验，返回 { levelUp, tierUp } */
export function addFateExp(state, amount) {
  const fate = state.fate;
  if (!fate || !fate.unlocked) return null;
  const before = fateLevelFromExp(fate.exp);
  const beforeTier = tierFromLevel(before.level);
  fate.exp += amount;
  const after = fateLevelFromExp(fate.exp);
  fate.level = after.level;
  fate.tier = tierFromLevel(after.level);
  return {
    levelUp: after.level > before.level,
    tierUp: fate.tier > beforeTier,
    tier: fate.tier,
    level: after.level,
  };
}

/** 词条槽：最多 3 条 */
export const FATE_SLOTS = 3;

export function canAbsorb(state, affixKey) {
  const fate = state.fate;
  if (!fate || !fate.unlocked) return false;
  return !fate.affixes || !fate.affixes[affixKey];
}

export function absorbAffix(state, affixKey, value) {
  const fate = state.fate;
  if (!fate || !fate.unlocked) return false;
  fate.affixes = fate.affixes || {};
  if (fate.affixes[affixKey]) return false;
  if (Object.keys(fate.affixes).length >= FATE_SLOTS) return false;
  fate.affixes[affixKey] = value;
  return true;
}

export function fateBonusText(state) {
  const fate = state.fate;
  if (!fate || !fate.unlocked) return [];
  const tier = FATE_TIERS[fate.tier - 1];
  const out = [];
  if (tier.atkPct) out.push(`攻击 +${Math.round(tier.atkPct * 100)}%`);
  if (tier.hpPct) out.push(`气血 +${Math.round(tier.hpPct * 100)}%`);
  if (tier.critDmg) out.push(`暴伤 +${tier.critDmg}%`);
  if (fate.tier >= 2) out.push('技能冷却 -10%');
  if (fate.tier >= 3) out.push('幸运 +8');
  if (fate.tier >= 4) out.push('每战回复 3% 气血');
  for (const [k, v] of Object.entries(fate.affixes || {})) {
    const pct = ['crit', 'critDmg', 'aspd', 'lifesteal', 'elem'].includes(k);
    out.push(`${STAT_LABEL[k] || k} +${pct ? v.toFixed(1) + '%' : Math.round(v)}`);
  }
  return out;
}

/** 器灵名字（默认 + 玩家自定义） */
export function spiritName(state) {
  const fate = state.fate || {};
  return fate.name || '二狗';
}

/** 器灵脾性台词 */
export function spiritLine(state) {
  const fate = state.fate;
  if (!fate || !fate.unlocked) return null;
  const pool = SPIRIT_LINES.filter((l) => l.at <= fate.tier);
  if (!pool.length) return null;
  const line = pool[Math.floor(Math.random() * pool.length)];
  return line.text
    .replace('{name}', spiritName(state))
    .replace('{min}', String(Math.floor(state.stats.playtime / 60)));
}
