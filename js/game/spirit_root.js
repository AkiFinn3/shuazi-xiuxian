// 灵根：五行/天灵根的随机、校验、属性与战斗参数
export const ELEMENTS = ['metal', 'wood', 'water', 'fire', 'earth'];

export const ELEMENT_META = {
  metal: {
    name: '金', color: '#a8791f', effect: '裂金',
    desc: '命中时有几率追加一次金系伤害。',
    bonus: { atkPct: 4, crit: 2, critDmg: 6, pierce: 2 },
  },
  wood: {
    name: '木', color: '#3f7c5a', effect: '回春',
    desc: '周期性回复气血，击杀敌人额外回血。',
    bonus: { hpPct: 5, lifesteal: 1.5 },
  },
  water: {
    name: '水', color: '#2f6fa3', effect: '寒霜',
    desc: '命中时有几率减速敌人。',
    bonus: { aspd: 0.06, defPct: 4 },
  },
  fire: {
    name: '火', color: '#a94632', effect: '灼烧',
    desc: '命中时有几率点燃敌人，持续掉血。',
    bonus: { atkPct: 5 },
  },
  earth: {
    name: '土', color: '#8a6a3c', effect: '震地',
    desc: '命中时有几率眩晕敌人并获得护盾。',
    bonus: { hpPct: 6, defPct: 6 },
  },
};

export const GRADES = ['下品', '中品', '上品', '天品'];
export const GRADE_MULT = [1, 1.8, 3, 5];
export const HEAVENLY_STAT_MULT = 1.4;
export const HEAVENLY_CHANCE = 0.01;

const BONUS_KEYS = ['atkPct', 'hpPct', 'defPct', 'crit', 'critDmg', 'aspd', 'lifesteal', 'pierce'];
const STAT_LABELS = {
  atkPct: '攻击', hpPct: '气血', defPct: '防御',
  crit: '暴击', critDmg: '爆伤', aspd: '攻速',
  lifesteal: '吸血', pierce: '穿透',
};

function weightedPick(values, weights, rand) {
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (let i = 0; i < values.length; i++) {
    roll -= weights[i];
    if (roll < 0) return values[i];
  }
  return values[values.length - 1];
}

function shuffled(list, rand) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function chanceOf(base, heavenly) {
  return Math.min(50, base + (heavenly ? 8 : 0));
}

/**
 * 抽取灵根。
 * rng 可以是 Math.random 形式的函数，也可以是带 next() 的 Rng 实例。
 */
export function rollSpiritRoots(rng = Math.random, now = Date.now()) {
  const rand = typeof rng === 'function' ? rng : () => rng.next();

  // 天灵根：1%，单元素天品
  if (rand() < HEAVENLY_CHANCE) {
    const idx = Math.min(ELEMENTS.length - 1, Math.floor(rand() * ELEMENTS.length));
    return {
      v: 1,
      testedAt: now,
      heavenly: true,
      roots: [{ elem: ELEMENTS[idx], grade: 3 }],
    };
  }

  const count = weightedPick([1, 2, 3, 4, 5], [40, 30, 18, 9, 3], rand);
  const elems = shuffled(ELEMENTS, rand).slice(0, count);
  const roots = elems.map((elem) => ({
    elem,
    grade: weightedPick([0, 1, 2, 3], [60, 28, 10, 2], rand),
  }));
  return { v: 1, testedAt: now, heavenly: false, roots };
}

export function isValidSpiritRoots(roots) {
  if (!roots || roots.v !== 1 || typeof roots.heavenly !== 'boolean') return false;
  if (!Array.isArray(roots.roots) || roots.roots.length < 1 || roots.roots.length > 5) return false;
  const seen = new Set();
  for (const root of roots.roots) {
    if (!root || !ELEMENTS.includes(root.elem)) return false;
    if (!Number.isInteger(root.grade) || root.grade < 0 || root.grade > 3) return false;
    if (seen.has(root.elem)) return false;
    seen.add(root.elem);
  }
  if (roots.heavenly) {
    return roots.roots.length === 1 && roots.roots[0].grade === 3;
  }
  return true;
}

/** 灵根提供的属性加成；数值单位与 deriveStats 一致。 */
export function rootBonus(roots) {
  const out = Object.fromEntries(BONUS_KEYS.map((key) => [key, 0]));
  if (!isValidSpiritRoots(roots)) return out;
  const heavenMult = roots.heavenly ? HEAVENLY_STAT_MULT : 1;
  for (const root of roots.roots) {
    const mult = GRADE_MULT[root.grade] * heavenMult;
    for (const [key, value] of Object.entries(ELEMENT_META[root.elem].bonus)) {
      out[key] += value * mult;
    }
  }
  return out;
}

/** 战斗触发参数；同一元素只有一个配置。 */
export function getRootProcs(roots) {
  if (!isValidSpiritRoots(roots)) return [];
  const heavenly = roots.heavenly;
  return roots.roots.map((root) => {
    const g = root.grade;
    const meta = ELEMENT_META[root.elem];
    const base = {
      elem: root.elem,
      grade: g,
      heavenly,
      name: meta.effect,
      color: meta.color,
    };
    if (root.elem === 'metal') {
      return {
        ...base, kind: 'hit', chance: chanceOf(20 + 4 * g, heavenly), cd: 3,
        dmgMult: 0.5 * (1 + 0.2 * g) * (heavenly ? 1.5 : 1),
      };
    }
    if (root.elem === 'wood') {
      return {
        ...base, kind: 'periodic', cd: 8,
        healPct: (1.5 + 0.5 * g) * (heavenly ? 1.5 : 1),
        killHealPct: heavenly ? 1.5 : 1,
      };
    }
    if (root.elem === 'water') {
      return {
        ...base, kind: 'hit', chance: chanceOf(18 + 4 * g, heavenly), cd: 5,
        slowPct: heavenly ? 0.5 : 0.35,
        duration: heavenly ? 2.5 : 2,
      };
    }
    if (root.elem === 'fire') {
      return {
        ...base, kind: 'hit', chance: chanceOf(20 + 4 * g, heavenly), cd: 4,
        duration: heavenly ? 4 : 3,
        dpsPct: (18 + 4 * g) * (heavenly ? 1.5 : 1),
      };
    }
    return {
      ...base, kind: 'hit', chance: chanceOf(12 + 3 * g, heavenly), cd: 8,
      stun: heavenly ? 1 : 0.7,
      shieldPct: (3 + g) * (heavenly ? 1.5 : 1),
      shieldDuration: 6,
    };
  });
}

export function primaryElement(roots) {
  if (!isValidSpiritRoots(roots)) return null;
  let best = roots.roots[0];
  for (const root of roots.roots) {
    if (root.grade > best.grade) best = root;
    // 同品阶按金、木、水、火、土顺序取第一个
    else if (root.grade === best.grade && ELEMENTS.indexOf(root.elem) < ELEMENTS.indexOf(best.elem)) best = root;
  }
  return best.elem;
}

export function spiritRootSummary(roots) {
  if (!isValidSpiritRoots(roots)) return '灵根未测';
  if (roots.heavenly) {
    return `天灵根·${ELEMENT_META[roots.roots[0].elem].name}`;
  }
  return roots.roots
    .map((root) => `${ELEMENT_META[root.elem].name}（${GRADES[root.grade]}）`)
    .join('、');
}

export function rootBonusText(roots) {
  const bonus = rootBonus(roots);
  const out = [];
  for (const key of BONUS_KEYS) {
    const value = bonus[key];
    if (!value) continue;
    if (key === 'aspd') out.push(`${STAT_LABELS[key]} +${value.toFixed(2)}`);
    else out.push(`${STAT_LABELS[key]} +${value.toFixed(1)}%`);
  }
  return out;
}
