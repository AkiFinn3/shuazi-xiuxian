// 游戏状态：角色数据、属性结算、修为与境界
import { BALANCE, REALMS, ORIGINS, SLOTS, POWER_WEIGHT, STAT_LABEL } from '../data/config.js';
import { FATE_TIERS } from './fate.js';
import { TALENTS } from '../data/talents.js';

export const SAVE_VERSION = 1;

export function createState({ name, origin, appearance }) {
  const originDef = ORIGINS.find((o) => o.key === origin) || ORIGINS[4];
  const state = {
    v: SAVE_VERSION,
    name,
    origin: originDef.key,
    appearance: appearance || originDef.appearance,
    level: 1,
    realm: 0,
    stage: 0,
    pendingRealm: null,   // 待渡劫的大境界
    exp: 0,
    hp: BALANCE.playerBase.hp,
    coin: 0,
    floor: 1,
    bestFloor: 0,
    bag: [],
    equip: Object.fromEntries(SLOTS.map((s) => [s.key, null])),
    mats: { iron: 0, bone: 0, jade: 0, wood: 0, core: 0, herb: 0 },
    alchemy: [],
    pills: [],
    alchemyLevel: 1,
    npcAffinity: {},
    partner: null,
    partnerKey: null,
    dualCd: 0,
    buffs: { atkUntil: 0, atkPct: 0, luckUntil: 0, luck: 0 },
    fate: { unlocked: false, type: null, tier: 1, level: 1, exp: 0, affixes: {} },
    ascend: { count: 0, points: 0, talents: {}, choice: null },
    settings: {
      autoBattle: true,
      autoPick: true,
      autoSalvage: true,
      autoSalvageBelow: 'xuan',
      autoAdvance: true,
      volume: 0.5,
      sound: true,
    },
    stats: { kills: 0, bossKills: 0, drops: 0, salvaged: 0, deaths: 0, playtime: 0, stone: 0 },
    flags: {},
    title: '',
    createdAt: Date.now(),
    lastSeen: Date.now(),
  };
  state.hp = deriveStats(state).maxHp;
  return state;
}

/** 补全旧存档缺失的字段 */
export function normalizeState(state) {
  const base = createState({ name: state.name, origin: state.origin, appearance: state.appearance });
  for (const key of Object.keys(base)) {
    if (state[key] === undefined || state[key] === null) {
      state[key] = base[key];
    }
  }
  state.mats = Object.assign({ iron: 0, bone: 0, jade: 0, wood: 0, core: 0, herb: 0 }, state.mats || {});
  state.stats = Object.assign(base.stats, state.stats || {});
  state.settings = Object.assign(base.settings, state.settings || {});
  state.equip = Object.assign(base.equip, state.equip || {});
  state.buffs = Object.assign(base.buffs, state.buffs || {});
  state.npcAffinity = state.npcAffinity || {};
  return state;
}

export function originOf(state) {
  return ORIGINS.find((o) => o.key === state.origin) || ORIGINS[4];
}

/** 等级序号 1..40 */
export function levelIndex(state) {
  return state.realm * 4 + state.stage + 1;
}

export function expNeed(state) {
  return Math.floor(BALANCE.expBase * Math.pow(BALANCE.expGrowth, levelIndex(state) - 1));
}

export function realmLabel(state) {
  const realm = REALMS[Math.min(state.realm, REALMS.length - 1)];
  return `${realm.name}期·${realm.stages[state.stage]}`;
}

/** 下一个大境界的门槛（通关层数） */
export function nextRealmFloor(state) {
  if (state.realm >= REALMS.length - 1) return null;
  return REALMS[state.realm + 1].need;
}

/** 结算最终属性 */
export function deriveStats(state) {
  const lvl = levelIndex(state);
  const realmMult = 1 + state.realm * 0.28;
  const origin = originOf(state).bonus || {};

  const stats = {
    atk: BALANCE.playerBase.atk * Math.pow(BALANCE.playerAtkPerLevel, lvl - 1) * realmMult,
    maxHp: BALANCE.playerBase.hp * Math.pow(BALANCE.playerHpPerLevel, lvl - 1) * realmMult,
    def: BALANCE.playerBase.def * Math.pow(BALANCE.playerDefPerLevel, lvl - 1) * realmMult,
    crit: 5,
    critDmg: 50,
    aspd: 1.3,
    lifesteal: 0,
    luck: 0,
    coinPct: 0,
    spiritPct: 0,
    elem: 0,
    pierce: 0,
  };

  // 出身加成
  if (origin.atkPct) stats.atk *= 1 + origin.atkPct;
  if (origin.hpPct) stats.maxHp *= 1 + origin.hpPct;
  if (origin.defPct) stats.def *= 1 + origin.defPct;
  if (origin.crit) stats.crit += origin.crit;
  if (origin.lifesteal) stats.lifesteal += origin.lifesteal;
  if (origin.luck) stats.luck += origin.luck;
  if (origin.coinPct) stats.coinPct += origin.coinPct;
  if (origin.spiritPct) stats.spiritPct += origin.spiritPct;

  // 装备
  for (const slot of SLOTS) {
    const item = state.equip[slot.key];
    if (!item) continue;
    for (const [k, v] of Object.entries(item.base)) stats[k] = (stats[k] || 0) + v;
    for (const [k, v] of Object.entries(item.affixes)) stats[k] = (stats[k] || 0) + v;
  }

  // 临时增益（丹药）
  const now = Date.now();
  const buffs = state.buffs || {};
  if (buffs.atkUntil > now) stats.atk *= 1 + (buffs.atkPct || 0) / 100;
  if (buffs.luckUntil > now) stats.luck += buffs.luck || 0;

  // 本命法宝
  const fate = state.fate;
  if (fate && fate.unlocked) {
    const tier = FATE_TIERS[Math.min(FATE_TIERS.length, Math.max(1, fate.tier)) - 1];
    if (tier.atkPct) stats.atk *= 1 + tier.atkPct;
    if (tier.hpPct) stats.maxHp *= 1 + tier.hpPct;
    if (tier.critDmg) stats.critDmg += tier.critDmg;
    if (fate.tier >= 3) stats.luck += 8;
    for (const [k, v] of Object.entries(fate.affixes || {})) {
      stats[k] = (stats[k] || 0) + v;
    }
  }

  // 仙缘天赋
  const asc = state.ascend;
  if (asc && asc.talents) {
    for (const t of TALENTS) {
      const lv = asc.talents[t.key] || 0;
      if (lv > 0 && t.apply) t.apply(stats, lv);
    }
  }

  stats.atk = Math.round(stats.atk * 10) / 10;
  stats.maxHp = Math.round(stats.maxHp);
  stats.def = Math.round(stats.def * 10) / 10;
  stats.power = Math.round(computePower(stats));
  return stats;
}

/** 战力评分 */
export function computePower(stats) {
  let p = 0;
  for (const [k, w] of Object.entries(POWER_WEIGHT)) {
    if (stats[k]) p += stats[k] * w;
  }
  return p;
}

/** 装备单件战力 */
export function itemPower(item) {
  const s = {};
  for (const [k, v] of Object.entries(item.base)) s[k] = (s[k] || 0) + v;
  for (const [k, v] of Object.entries(item.affixes)) s[k] = (s[k] || 0) + v;
  return Math.round(computePower(s));
}

/**
 * 增加修为，返回 { levels: [], realmUp: boolean, blocked: boolean }
 */
export function addExp(state, amount) {
  const res = { levels: [], realmUp: false, blocked: false };
  let gain = amount * (1 + (deriveStats(state).spiritPct || 0) / 100);
  state.exp += gain;

  let guard = 0;
  while (guard++ < 200) {
    const need = expNeed(state);
    if (state.exp < need) break;

    // 跨大境界需要通关对应层数
    if (state.stage === 3) {
      const gate = nextRealmFloor(state);
      if (gate !== null && state.bestFloor < gate) {
        state.exp = need;
        res.blocked = true;
        break;
      }
      // 需要渡劫：先挂起，渡劫成功才算突破
      if (state.pendingRealm == null) {
        state.pendingRealm = state.realm + 1;
        state.exp = need;
        res.tribulation = state.pendingRealm;
        break;
      }
      state.realm += 1;
      state.stage = 0;
      res.realmUp = true;
    } else {
      state.stage += 1;
    }
    state.exp -= need;
    res.levels.push({ realm: state.realm, stage: state.stage, label: realmLabel(state) });
  }
  return res;
}

export function healFull(state) {
  state.hp = deriveStats(state).maxHp;
}

/** 属性文本（面板显示用） */
export function statLine(key, value) {
  const label = STAT_LABEL[key] || key;
  const isPct = ['crit', 'critDmg', 'aspd', 'lifesteal', 'coinPct', 'spiritPct', 'elem'].includes(key);
  return `${label} +${isPct ? value.toFixed(1) + '%' : Math.round(value)}`;
}
