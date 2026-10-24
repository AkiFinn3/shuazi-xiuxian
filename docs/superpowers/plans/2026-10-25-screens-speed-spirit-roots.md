# 多界面导航、战斗倍速与灵根系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏现有战斗、掉落与存档的前提下，加入 9 个独立界面、1/2/3 倍战斗速度、筑基后五行/天灵根体系，并把灵根属性与战斗触发特效接入现有战斗循环。

**Architecture:** 保留现有 `.main` 三栏战斗页 DOM，新增一层屏幕路由（`screens.js`）与导航（`nav.js`）。非战斗页共用一个全屏容器，进入时渲染、离开时卸载。战斗始终在后台更新，只在战斗页绘制。灵根逻辑拆成纯数据模块 `spirit_root.js`，属性在 `deriveStats` 末尾结算，战斗效果统一走 `Combat._applyDamage` 与 `_afterHeroDamage`。倍速只缩放战斗时间，炼丹、灵田、随机事件与存档继续使用真实时间。

**Tech Stack:** 原生 JavaScript ES Modules、Canvas 2D、CSS、localStorage；零构建、零运行时依赖；Node `node:test` 做纯逻辑测试。

**Spec:** `docs/superpowers/specs/2026-10-25-screens-speed-spirit-roots-design.md`

## Global Constraints

- 不新增 npm 依赖，不引入打包器；所有代码直接由浏览器以 ES Module 加载。
- 存档 key 保持 `shuazi_xiuxian_save_v1`；`SAVE_VERSION` 升到 `2`，旧档通过 `normalizeState` 补字段。
- 战斗页桌面三栏布局（232 / 1fr / 300）与现有移动端战场、技能栏保持原样；新增导航不得遮挡顶栏、战场与技能栏。
- 桌面导航固定 9 个入口；移动底栏固定 6 个入口（战斗 / 角色 / 背包 / 洞府 / 宗门 / 更多）。
- 倍速值为 `1 | 2 | 3`；2 倍在 `realm === 0 && stage >= 3` 解锁，3 倍在 `realm >= 1` 解锁。
- 天灵根总概率 1%；普通灵根数量 1/2/3/4/5 = 40%/30%/18%/9%/3%；品阶 下/中/上/天 = 60%/28%/10%/2%。
- 每次英雄伤害最多触发 1 个命中类灵根；Boss 的减速与眩晕时长 ×0.5。
- 灵根追加伤害、灼烧伤害必须走 `_applyDamage`，击杀必须走 `_killEnemy`，不得绕过掉落、任务计数与 Boss 判定。
- 所有新增纯逻辑必须能用 `node --test tests/*.test.mjs` 运行，测试不依赖 DOM。
- 每个任务的提交步骤只在用户明确授权执行本计划后运行；推送远端必须再次单独确认。

---

## 文件结构

**新增**

- `js/game/spirit_root.js`：灵根随机、校验、属性加成、战斗触发参数。纯函数，无 DOM。
- `js/ui/roots.js`：灵根卡片、属性文本、测灵根弹窗。只负责展示与调用回调。
- `js/ui/screens.js`：屏幕注册表、切换、脏标记、实时刷新、页面卸载。
- `js/ui/nav.js`：桌面侧栏、移动底栏、更多弹层。
- `js/ui/farm.js`：从洞府拆出的灵田页面。
- `tests/spirit_root.test.mjs`：概率、校验、属性、触发参数。
- `tests/state.test.mjs`：存档版本、速度钳制、灵根属性结算。
- `tests/combat.test.mjs`：伤害入口、灼烧、护盾、眩晕、单次触发。

**修改**

- `index.html`：应用外壳、屏幕容器、桌面/移动导航挂载点。
- `css/style.css`：导航、全屏页、灵根卡片、速度按钮、移动布局。
- `js/main.js`：倍速时间拆分、屏幕刷新、灵根排队、洗髓丹选择。
- `js/game/state.js`：`SAVE_VERSION`、`spiritRoots`、`settings.speed`、`maxSpeed`、属性结算。
- `js/game/save.js`：v2 迁移默认值。
- `js/game/tribulation.js`：筑基成功排队测灵根。
- `js/game/combat.js`：战斗时钟、统一伤害、灵根触发、敌人状态、护盾、特效绘制。
- `js/game/crafting.js`：洗髓丹描述。
- `js/ui/panels.js`：渲染函数容器化、角色/背包全屏导出、面板挂载状态。
- `js/ui/cave.js`：炼丹 / 炼器子页，移除灵田。
- `js/ui/skills.js`：技能栏速度按钮。
- `js/ui/layout.js`：移除旧页签/抽屉，只保留断点检测与旋转提示。
- `dev/mobile.html`、`dev/preview.html`：更新预览尺寸说明与可配置视口。
- `sw.js`：缓存版本与新增文件清单。

---

## Task 1: 灵根纯逻辑模块

**Files:**
- Create: `js/game/spirit_root.js`
- Create: `tests/spirit_root.test.mjs`

**Interfaces:**
- Produces:
  - `ELEMENTS: string[]`
  - `ELEMENT_META: Record<string, { name, color, effect, desc, bonus }>`
  - `GRADES: string[]`, `GRADE_MULT: number[]`
  - `rollSpiritRoots(rng?: (() => number) | { next(): number }, now?: number): SpiritRoots`
  - `isValidSpiritRoots(roots: unknown): boolean`
  - `rootBonus(roots): { atkPct, hpPct, defPct, crit, critDmg, aspd, lifesteal, pierce }`
  - `getRootProcs(roots): RootProc[]`
  - `primaryElement(roots): string | null`
  - `spiritRootSummary(roots): string`
  - `rootBonusText(roots): string[]`
- `SpiritRoots = { v: 1, testedAt: number, heavenly: boolean, roots: { elem: string, grade: 0|1|2|3 }[] }`

- [ ] **Step 1: 写失败的灵根测试**

创建 `tests/spirit_root.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELEMENTS,
  GRADE_MULT,
  rollSpiritRoots,
  isValidSpiritRoots,
  rootBonus,
  getRootProcs,
  primaryElement,
  rootBonusText,
} from '../js/game/spirit_root.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fixed(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

test('天灵根分支固定为单元素天品', () => {
  const roots = rollSpiritRoots(fixed([0.005, 0]), 123);
  assert.equal(roots.heavenly, true);
  assert.equal(roots.testedAt, 123);
  assert.equal(roots.roots.length, 1);
  assert.equal(roots.roots[0].elem, 'metal');
  assert.equal(roots.roots[0].grade, 3);
  assert.equal(isValidSpiritRoots(roots), true);
});

test('普通分支按权重抽数量与品阶且元素不重复', () => {
  const roots = rollSpiritRoots(fixed([0.5, 0.5, 0.1, 0.2, 0.3, 0.4, 0.5, 0.5]), 456);
  assert.equal(roots.heavenly, false);
  assert.equal(roots.roots.length, 2);
  assert.deepEqual(roots.roots.map((r) => r.elem), ['water', 'earth']);
  assert.deepEqual(roots.roots.map((r) => r.grade), [0, 0]);
  assert.equal(new Set(roots.roots.map((r) => r.elem)).size, 2);
});

test('非法结构被拒绝', () => {
  assert.equal(isValidSpiritRoots(null), false);
  assert.equal(isValidSpiritRoots({ v: 1, heavenly: false, roots: [] }), false);
  assert.equal(isValidSpiritRoots({ v: 1, heavenly: false, roots: [{ elem: 'gold', grade: 0 }] }), false);
  assert.equal(isValidSpiritRoots({
    v: 1, heavenly: false,
    roots: [{ elem: 'metal', grade: 0 }, { elem: 'metal', grade: 1 }],
  }), false);
  assert.equal(isValidSpiritRoots({
    v: 1, heavenly: true,
    roots: [{ elem: 'metal', grade: 2 }],
  }), false);
  assert.equal(isValidSpiritRoots({
    v: 1, heavenly: true,
    roots: [{ elem: 'metal', grade: 3 }, { elem: 'fire', grade: 3 }],
  }), false);
});

test('天灵根属性按品阶 5 倍再乘 1.4', () => {
  const roots = { v: 1, testedAt: 1, heavenly: true, roots: [{ elem: 'metal', grade: 3 }] };
  const bonus = rootBonus(roots);
  assert.equal(bonus.atkPct, 4 * GRADE_MULT[3] * 1.4);
  assert.equal(bonus.crit, 2 * GRADE_MULT[3] * 1.4);
  assert.equal(bonus.critDmg, 6 * GRADE_MULT[3] * 1.4);
  assert.equal(bonus.pierce, 2 * GRADE_MULT[3] * 1.4);
});

test('多灵根属性逐项相加', () => {
  const roots = {
    v: 1, testedAt: 1, heavenly: false,
    roots: [{ elem: 'metal', grade: 0 }, { elem: 'fire', grade: 1 }],
  };
  const bonus = rootBonus(roots);
  assert.equal(bonus.atkPct, 4 + 5 * 1.8);
  assert.equal(bonus.crit, 2);
});

test('触发参数遵守品阶、天灵根与 50% 上限', () => {
  const normal = getRootProcs({
    v: 1, testedAt: 1, heavenly: false,
    roots: [{ elem: 'metal', grade: 0 }, { elem: 'wood', grade: 1 }, { elem: 'earth', grade: 3 }],
  });
  const metal = normal.find((p) => p.elem === 'metal');
  const wood = normal.find((p) => p.elem === 'wood');
  const earth = normal.find((p) => p.elem === 'earth');
  assert.equal(metal.chance, 20);
  assert.equal(metal.cd, 3);
  assert.equal(wood.kind, 'periodic');
  assert.equal(wood.healPct, 2);
  assert.equal(earth.chance, 21);
  assert.equal(earth.shieldPct, 6);

  const heaven = getRootProcs({
    v: 1, testedAt: 1, heavenly: true,
    roots: [{ elem: 'water', grade: 3 }],
  })[0];
  assert.equal(heaven.chance, 50);
  assert.equal(heaven.slowPct, 0.5);
  assert.equal(heaven.duration, 2.5);
});

test('主元素取最高品阶，同阶按五行顺序', () => {
  assert.equal(primaryElement({
    v: 1, testedAt: 1, heavenly: false,
    roots: [{ elem: 'fire', grade: 1 }, { elem: 'metal', grade: 1 }],
  }), 'metal');
  assert.equal(primaryElement({
    v: 1, testedAt: 1, heavenly: true,
    roots: [{ elem: 'water', grade: 3 }],
  }), 'water');
  assert.equal(primaryElement(null), null);
});

test('属性文本与元素顺序稳定', () => {
  assert.deepEqual(ELEMENTS, ['metal', 'wood', 'water', 'fire', 'earth']);
  const text = rootBonusText({
    v: 1, testedAt: 1, heavenly: true,
    roots: [{ elem: 'metal', grade: 3 }],
  });
  assert.ok(text.includes('攻击 +28.0%'));
  assert.ok(text.includes('暴击 +14.0%'));
});

test('20 万次随机符合设计概率', () => {
  const rng = seeded(20261025);
  const n = 200000;
  let heavenly = 0;
  const countHits = [0, 0, 0, 0, 0];
  const gradeHits = [0, 0, 0, 0];
  let normalRoots = 0;

  for (let i = 0; i < n; i++) {
    const roots = rollSpiritRoots(rng, 0);
    if (roots.heavenly) {
      heavenly++;
      assert.equal(roots.roots.length, 1);
      assert.equal(roots.roots[0].grade, 3);
      continue;
    }
    countHits[roots.roots.length - 1]++;
    normalRoots += roots.roots.length;
    assert.equal(new Set(roots.roots.map((r) => r.elem)).size, roots.roots.length);
    for (const r of roots.roots) gradeHits[r.grade]++;
  }

  assert.ok(Math.abs(heavenly / n - 0.01) < 0.0015, `heavenly=${heavenly / n}`);
  const countWant = [0.4, 0.3, 0.18, 0.09, 0.03];
  countHits.forEach((hits, i) => {
    assert.ok(Math.abs(hits / (n - heavenly) - countWant[i]) < 0.005, `count${i + 1}=${hits / (n - heavenly)}`);
  });
  const gradeWant = [0.6, 0.28, 0.1, 0.02];
  gradeHits.forEach((hits, i) => {
    assert.ok(Math.abs(hits / normalRoots - gradeWant[i]) < 0.005, `grade${i}=${hits / normalRoots}`);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/spirit_root.test.mjs`

Expected: FAIL，报错 `Cannot find module .../js/game/spirit_root.js`。

- [ ] **Step 3: 实现灵根模块**

创建 `js/game/spirit_root.js`：

```js
// 灵根：五行/天灵根的随机、校验、属性与战斗参数
export const ELEMENTS = ['metal', 'wood', 'water', 'fire', 'earth'];

export const ELEMENT_META = {
  metal: {
    name: '金', color: '#e8d98a', effect: '裂金',
    desc: '命中时有几率追加一次金系伤害。',
    bonus: { atkPct: 4, crit: 2, critDmg: 6, pierce: 2 },
  },
  wood: {
    name: '木', color: '#6fd68a', effect: '回春',
    desc: '周期性回复气血，击杀敌人额外回血。',
    bonus: { hpPct: 5, lifesteal: 1.5 },
  },
  water: {
    name: '水', color: '#6fb8ff', effect: '寒霜',
    desc: '命中时有几率减速敌人。',
    bonus: { aspd: 0.06, defPct: 4 },
  },
  fire: {
    name: '火', color: '#ff8a5c', effect: '灼烧',
    desc: '命中时有几率点燃敌人，持续掉血。',
    bonus: { atkPct: 5 },
  },
  earth: {
    name: '土', color: '#c9a46a', effect: '震地',
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/spirit_root.test.mjs`

Expected: 全部 PASS，包括 20 万次概率模拟。

- [ ] **Step 5: 语法检查**

Run: `node --check js/game/spirit_root.js`

Expected: 无输出、退出码 0。

- [ ] **Step 6: 提交（用户授权后）**

```bash
git add js/game/spirit_root.js tests/spirit_root.test.mjs
git commit -m "feat: add spirit root roll and combat proc data"
```

---

## Task 2: 存档字段、速度上限与属性结算

**Files:**
- Modify: `js/game/state.js:1-76, 102-174`
- Modify: `js/game/save.js:1-44`
- Create: `tests/state.test.mjs`

**Interfaces:**
- Consumes: `rootBonus`, `isValidSpiritRoots` from Task 1。
- Produces:
  - `SAVE_VERSION = 2`
  - `state.spiritRoots: SpiritRoots | null`
  - `state.settings.speed: 1 | 2 | 3`
  - `maxSpeed(state): 1 | 2 | 3`
  - `normalizeState` 会清空非法灵根并钳制速度
  - `deriveStats` 在仙缘天赋之后、取整之前结算灵根属性

- [ ] **Step 1: 写失败的状态测试**

创建 `tests/state.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAVE_VERSION,
  createState,
  normalizeState,
  deriveStats,
  maxSpeed,
} from '../js/game/state.js';

function makeState() {
  return createState({ name: '测试道友', origin: 'no-such-origin', appearance: 'swordsman' });
}

test('新存档写入 v2、空灵根与默认速度', () => {
  const state = makeState();
  assert.equal(SAVE_VERSION, 2);
  assert.equal(state.v, 2);
  assert.equal(state.spiritRoots, null);
  assert.equal(state.settings.speed, 1);
});

test('maxSpeed 按境界与阶段解锁', () => {
  const state = makeState();
  state.realm = 0; state.stage = 2;
  assert.equal(maxSpeed(state), 1);
  state.stage = 3;
  assert.equal(maxSpeed(state), 2);
  state.realm = 1; state.stage = 0;
  assert.equal(maxSpeed(state), 3);
});

test('normalizeState 钳制速度并清理非法灵根', () => {
  const state = makeState();
  state.realm = 0; state.stage = 0; state.settings.speed = 3;
  normalizeState(state);
  assert.equal(state.settings.speed, 1);

  state.realm = 0; state.stage = 3; state.settings.speed = 3;
  normalizeState(state);
  assert.equal(state.settings.speed, 2);

  state.realm = 1; state.settings.speed = 3;
  normalizeState(state);
  assert.equal(state.settings.speed, 3);

  state.spiritRoots = { v: 1, heavenly: false, roots: [] };
  normalizeState(state);
  assert.equal(state.spiritRoots, null);

  state.spiritRoots = {
    v: 1, testedAt: 1, heavenly: false,
    roots: [{ elem: 'metal', grade: 0 }],
  };
  normalizeState(state);
  assert.equal(state.spiritRoots.roots[0].elem, 'metal');
  assert.equal(state.v, 2);
});

test('灵根属性在最终取整前结算', () => {
  const state = makeState();
  state.realm = 0; state.stage = 0;
  const base = deriveStats(state);

  state.spiritRoots = {
    v: 1, testedAt: 1, heavenly: true,
    roots: [{ elem: 'metal', grade: 3 }],
  };
  const rooted = deriveStats(state);

  assert.ok(Math.abs(rooted.atk / base.atk - 1.28) < 0.01);
  assert.equal(rooted.crit, base.crit + 14);
  assert.equal(rooted.critDmg, base.critDmg + 42);
  assert.equal(rooted.pierce, base.pierce + 14);
});

test('多灵根加成逐项相加', () => {
  const state = makeState();
  state.realm = 0; state.stage = 0;
  const base = deriveStats(state);
  state.spiritRoots = {
    v: 1, testedAt: 1, heavenly: false,
    roots: [{ elem: 'metal', grade: 0 }, { elem: 'fire', grade: 1 }],
  };
  const rooted = deriveStats(state);
  assert.ok(Math.abs(rooted.atk / base.atk - 1.13) < 0.01);
  assert.equal(rooted.crit, base.crit + 2);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/state.test.mjs`

Expected: FAIL，`SAVE_VERSION` 仍为 1 或 `maxSpeed` 未导出。

- [ ] **Step 3: 修改 `js/game/state.js`**

在文件顶部加入导入：

```js
import { rootBonus, isValidSpiritRoots } from './spirit_root.js';
```

把 `export const SAVE_VERSION = 1;` 改为：

```js
export const SAVE_VERSION = 2;
```

在 `createState` 的 `ascend` 与 `settings` 之间加入：

```js
    spiritRoots: null,
```

在 `settings` 对象中加入 `speed`：

```js
      volume: 0.5,
      sound: true,
      speed: 1,
```

在 `normalizeState` 的 `state.settings = Object.assign(...)` 之后、清理 `pendingRealm` 之前加入：

```js
  state.v = SAVE_VERSION;
  if (![1, 2, 3].includes(state.settings.speed)) state.settings.speed = 1;
  state.settings.speed = Math.min(state.settings.speed, maxSpeed(state));
  if (!isValidSpiritRoots(state.spiritRoots)) state.spiritRoots = null;
```

在 `nextRealmFloor` 之后加入：

```js
/** 当前境界允许的最高战斗速度 */
export function maxSpeed(state) {
  if (!state) return 1;
  if (state.realm >= 1) return 3;
  if (state.realm === 0 && state.stage >= 3) return 2;
  return 1;
}
```

在 `deriveStats` 的仙缘天赋循环之后、`stats.atk = Math.round(...)` 之前加入：

```js
  // 灵根：装备、法宝、天赋之后的加法/百分比加成，最终统一取整
  if (isValidSpiritRoots(state.spiritRoots)) {
    const root = rootBonus(state.spiritRoots);
    if (root.atkPct) stats.atk *= 1 + root.atkPct / 100;
    if (root.hpPct) stats.maxHp *= 1 + root.hpPct / 100;
    if (root.defPct) stats.def *= 1 + root.defPct / 100;
    stats.crit += root.crit;
    stats.critDmg += root.critDmg;
    stats.aspd += root.aspd;
    stats.lifesteal += root.lifesteal;
    stats.pierce += root.pierce;
  }
```

- [ ] **Step 4: 修改 `js/game/save.js`**

把迁移函数替换为：

```js
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
```

- [ ] **Step 5: 运行全部逻辑测试**

Run: `node --test tests/*.test.mjs`

Expected: Task 1 与 Task 2 的测试全部 PASS。

- [ ] **Step 6: 提交（用户授权后）**

```bash
git add js/game/state.js js/game/save.js tests/state.test.mjs
git commit -m "feat: persist speed and spirit roots in save v2"
```

---

## Task 3: 面板渲染容器化与角色/背包导出

**Files:**
- Modify: `js/ui/panels.js:29-112, 114-341, 344-408`

**Interfaces:**
- Produces:
  - `renderCharacter(game, root, opts?: { rerender?: () => void, onOpenFate?: () => void })`
  - `renderBagInto(game, body, opts?: { full?: boolean, rerender?: () => void })`
  - `setPanelDirtyHook(fn: ((which: string) => void) | null)`
  - `setPanelsMounted(mounted: boolean)`
  - `itemTooltip(item, state?)`
- 战斗侧栏仍由 `buildPanels` / `renderRight` 驱动，视觉不变。
- 角色页此任务先输出“属性 → 装备 → 修为”，Task 8 再插入灵根区块。

- [ ] **Step 1: 加入面板挂载状态与脏标记钩子**

在 `js/ui/panels.js` 的模块变量区加入：

```js
let panelsMounted = true;
let dirtyHook = null;
```

在 `isTouch` 之后加入：

```js
export function setPanelDirtyHook(fn) {
  dirtyHook = fn;
}

export function setPanelsMounted(mounted) {
  panelsMounted = !!mounted;
  if (!panelsMounted) {
    if (leftPanel) leftPanel.innerHTML = '';
    if (rightPanel) rightPanel.innerHTML = '';
  }
}
```

把 `buildPanels` 改为：

```js
export function buildPanels(g) {
  game = g;
  leftPanel = document.getElementById('leftPanel');
  rightPanel = document.getElementById('rightPanel');
  panelsMounted = true;
  dirty.left = dirty.right = false;
  renderLeft();
  renderRight();
}
```

把 `refreshPanels` 与 `markPanelsDirty` 改为：

```js
export function refreshPanels() {
  if (!game || !panelsMounted) return;
  dirty.left = dirty.right = false;
  renderLeft();
  renderRight();
}

export function markPanelsDirty(which = 'both') {
  if (which === 'left' || which === 'both') dirty.left = true;
  if (which === 'right' || which === 'both') dirty.right = true;
  if (dirtyHook) dirtyHook(which);
}
```

把 `flushPanels` 与 `refreshLivePanel` 的开头加上挂载判断：

```js
export function flushPanels() {
  if (!game || !panelsMounted) return;
  // 其余不变
}

export function refreshLivePanel() {
  if (!game || !panelsMounted || !rightPanel || !LIVE_TABS.has(rightTab)) return;
  // 其余不变
}
```

- [ ] **Step 2: 把左栏改为容器化函数**

用下面两个函数替换整个 `renderLeft`（原 115-217 行）：

```js
export function renderCharacter(g, root, opts = {}) {
  renderLeftInto(g, root, { ...opts, full: true, showRoots: true });
}

function renderLeftInto(g, root, opts = {}) {
  const s = g.state;
  const stats = g.stats;
  const scroll = root.scrollTop;
  const rerender = opts.rerender || refreshPanels;

  const bodyHtml = SLOTS.map((slot) => {
    const item = s.equip[slot.key];
    const rarity = item ? RARITIES[rarityIndex(item.rarity)] : null;
    const color = rarity ? rarity.color : '#3b4763';
    const icon = item ? iconHtml(item, slot) : `<img src="${SLOT_ICON[slot.key]}" alt="" style="opacity:.4">`;
    return `
      <div class="slot" data-slot="${slot.key}">
        <div class="slot-icon" style="border-color:${color}">${icon}</div>
        <div class="slot-info">
          <div class="slot-name" style="color:${color}">${item ? item.name : slot.name}</div>
          <div class="slot-sub">${item ? `${rarity.name} · ${item.ilvl}阶 · 战力 ${item.power}` : '未装备'}</div>
        </div>
      </div>`;
  }).join('');

  const need = expNeed(s);
  const gate = nextRealmFloor(s);
  const realmBlock = gate !== null && s.bestFloor < gate
    ? `<div class="kv"><span>境界瓶颈</span><span class="red">需通关第 ${gate} 层</span></div>`
    : '';

  const fate = s.fate || {};
  const fateRow = fate.unlocked
    ? `<div class="slot" id="fateSlot">
        <div class="slot-icon" style="border-color:#e8c46a">${fateSprite(fate.type, fate.tier) ? `<img src="${fateSprite(fate.type, fate.tier)}">` : '<span>宝</span>'}</div>
        <div class="slot-info">
          <div class="slot-name" style="color:#e8c46a">${FATE_TYPES[fate.type].name}</div>
          <div class="slot-sub">${FATE_TIERS[fate.tier - 1].name} · 器灵 Lv.${fate.level}</div>
        </div>
      </div>`
    : `<div class="slot" id="fateSlot">
        <div class="slot-icon" style="border-color:#39435c"><span style="color:#39435c">宝</span></div>
        <div class="slot-info">
          <div class="slot-name" style="color:#5a6784">本命法宝</div>
          <div class="slot-sub">${s.realm >= 2 ? '点击觉醒' : '金丹期可觉醒'}</div>
        </div>
      </div>`;

  const equipmentHtml = `
    <div class="paperdoll">
      <div class="pd-mid">
        <div class="pd-body"><canvas id="bodyPreview" width="56" height="80"></canvas></div>
      </div>
      <div>${bodyHtml}${fateRow}</div>
    </div>`;

  const statsHtml = `
    <div class="stat-list">
      <div><span class="k">攻击</span><span>${stats.atk}</span></div>
      <div><span class="k">气血</span><span>${stats.maxHp}</span></div>
      <div><span class="k">防御</span><span>${stats.def}</span></div>
      <div><span class="k">暴击</span><span>${stats.crit.toFixed(1)}%</span></div>
      <div><span class="k">暴伤</span><span>${stats.critDmg.toFixed(0)}%</span></div>
      <div><span class="k">攻速</span><span>${stats.aspd.toFixed(2)}/秒</span></div>
      <div><span class="k">吸血</span><span>${stats.lifesteal.toFixed(1)}%</span></div>
      <div><span class="k">幸运</span><span>${stats.luck.toFixed(0)}</span></div>
      <div><span class="k">元素伤害</span><span>${stats.elem.toFixed(1)}%</span></div>
    </div>`;

  const progressHtml = `
    <div class="stat-list">
      <div><span class="k">境界</span><span>${realmLabel(s)}</span></div>
      <div><span class="k">修为</span><span>${Math.floor(s.exp)}/${need}</span></div>
      ${realmBlock}
      <div><span class="k">击杀</span><span>${s.stats.kills}</span></div>
      <div><span class="k">掉落</span><span>${s.stats.drops}</span></div>
      <div><span class="k">分解</span><span>${s.stats.salvaged}</span></div>
      <div><span class="k">死亡</span><span>${s.stats.deaths}</span></div>
    </div>`;

  root.innerHTML = opts.full
    ? `<div class="panel-title">角色</div>
       <div class="sub-title">属性</div>${statsHtml}
       <div class="sub-title">装备</div>${equipmentHtml}
       <div class="sub-title">修为</div>${progressHtml}`
    : `<div class="panel-title">装备</div>${equipmentHtml}
       <div class="sub-title">属性</div>${statsHtml}
       <div class="sub-title">修为</div>${progressHtml}`;

  root.scrollTop = scroll;

  const c = root.querySelector('#bodyPreview');
  if (c) drawBodyPreview(c, s.appearance, root);

  root.querySelectorAll('.slot[data-slot]').forEach((el) => {
    el.onclick = () => {
      const key = el.dataset.slot;
      const item = g.state.equip[key];
      if (!item) return;
      if (g.state.bag.length >= bagSize(g.state)) { toast('背包满了'); return; }
      g.state.equip[key] = null;
      g.state.bag.push(item);
      g.recompute();
      g.save();
      rerender();
    };
  });

  const fateSlot = root.querySelector('#fateSlot');
  if (fateSlot) {
    fateSlot.onclick = () => {
      if (opts.onOpenFate) { opts.onOpenFate(); return; }
      setRightTab('fate');
      rerender();
    };
  }
}

function renderLeft() {
  renderLeftInto(game, leftPanel, { rerender: refreshPanels, full: false, showRoots: false });
}
```

- [ ] **Step 3: 把背包改为容器化导出**

把 `renderBag(body)` 替换为：

```js
export function renderBagInto(g, body, opts = {}) {
  const s = g.state;
  const rerender = opts.rerender || refreshPanels;
  const cells = [];
  for (let i = 0; i < bagSize(s); i++) {
    const item = s.bag[i];
    if (!item) {
      cells.push('<div class="cell"></div>');
      continue;
    }
    const rarity = RARITIES[rarityIndex(item.rarity)];
    const eq = s.equip[item.slot];
    const better = isBetter(item, eq, 1.0);
    const slot = SLOTS.find((x) => x.key === item.slot);
    cells.push(`<div class="cell has" data-id="${item.id}" style="border-color:${rarity.color}">
      ${iconHtml(item, slot)}
      ${better ? '<span class="up">▲</span>' : ''}
    </div>`);
  }

  const mats = Object.entries(s.mats).filter(([, v]) => v > 0).map(([k, v]) =>
    `<div class="kv"><span>${MAT_NAME[k] || k}</span><span>${v}</span></div>`).join('') || '<div class="muted">暂无材料</div>';

  body.innerHTML = `
    ${opts.full ? '<div class="panel-title">背包</div>' : ''}
    <div class="row mb8">
      <button class="btn btn-sm btn-jade" id="btnBest">一键最优</button>
      <button class="btn btn-sm" id="btnSalvageLow">分解低阶</button>
      <button class="btn btn-sm" id="btnSalvageAll">全部分解</button>
    </div>
    <div class="row mb8">
      <label class="tgl"><input type="checkbox" id="chkAutoSalvage" ${s.settings.autoSalvage ? 'checked' : ''}><span>自动分解</span></label>
      <select id="selSalvageLevel" class="btn btn-sm" style="padding:2px 4px">
        ${RARITIES.map((r) => `<option value="${r.key}" ${s.settings.autoSalvageBelow === r.key ? 'selected' : ''}>${r.name}以下</option>`).join('')}
      </select>
    </div>
    <div class="bag-grid">${cells.join('')}</div>
    <div class="sub-title">材料</div>
    <div>${mats}</div>`;

  const chk = body.querySelector('#chkAutoSalvage');
  if (chk) {
    chk.onchange = () => {
      g.state.settings.autoSalvage = chk.checked;
      const foot = document.getElementById('tglAutoSalvage');
      if (foot) foot.checked = chk.checked;
      g.save();
    };
  }
  const sel = body.querySelector('#selSalvageLevel');
  if (sel) sel.onchange = () => { g.state.settings.autoSalvageBelow = sel.value; g.save(); };

  const best = body.querySelector('#btnBest');
  if (best) best.onclick = () => { g.equipBest(); rerender(); };
  const sl = body.querySelector('#btnSalvageLow');
  if (sl) sl.onclick = () => { g.salvageBelow(); rerender(); };
  const sa = body.querySelector('#btnSalvageAll');
  if (sa) {
    sa.onclick = () => {
      if (!g.state.bag.length) { toast('背包是空的'); return; }
      if (!confirm(`确定分解背包里的 ${g.state.bag.length} 件装备吗？`)) return;
      g.salvageAll();
      rerender();
    };
  }

  body.querySelectorAll('.cell.has').forEach((el) => {
    const item = g.state.bag.find((x) => x.id === Number(el.dataset.id));
    if (!item) return;
    el.onmouseenter = (e) => showTooltip(itemTooltip(item, g.state), e.clientX, e.clientY);
    el.onmousemove = (e) => moveTooltip(e.clientX, e.clientY);
    el.onmouseleave = hideTooltip;
    el.onclick = () => {
      if (isTouch()) {
        openItemSheet(item, {
          onEquip: (it) => { g.equipItem(it.id); rerender(); },
          onSalvage: (it) => { g.salvageItem(it.id); rerender(); },
        });
        return;
      }
      g.equipItem(item.id);
      rerender();
    };
    el.oncontextmenu = (e) => { e.preventDefault(); g.salvageItem(item.id); rerender(); };
  });
}
```

把 `renderRightBody` 中的 `renderBag(body)` 改为：

```js
  else renderBagInto(game, body);
```

- [ ] **Step 4: 让物品气泡接受状态参数，并让预览查询使用传入根容器**

把 `drawBodyPreview(canvas, appearance)` 改为：

```js
function drawBodyPreview(canvas, appearance, scope) {
  const meta = SPRITES.anims[`hero/${appearance}_idle`];
  if (!meta) return;
  const draw = (image, target) => {
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.imageSmoothingEnabled = false;
    const [cw, ch] = meta.cell;
    const scale = Math.min(target.width / cw, target.height / ch);
    ctx.drawImage(image, 0, 0, cw, ch,
      (target.width - cw * scale) / 2, target.height - ch * scale, cw * scale, ch * scale);
  };
  if (preview.src !== meta.src) {
    preview = { src: meta.src, image: new Image() };
    const image = preview.image;
    image.onload = () => {
      const current = scope.querySelector('#bodyPreview');
      if (current && preview.image === image) draw(image, current);
    };
    image.src = meta.src;
  }
  if (preview.image && preview.image.complete && preview.image.naturalWidth) {
    draw(preview.image, canvas);
  }
}
```

把 `itemTooltip` 的签名与第一行改为：

```js
export function itemTooltip(item, state = game && game.state) {
  const s = state;
  if (!s) return '';
  // 函数其余部分不变
```

- [ ] **Step 5: 语法与逻辑测试**

Run:

```bash
node --check js/ui/panels.js
node --test tests/*.test.mjs
```

Expected: 语法检查通过；已有测试全部 PASS。

- [ ] **Step 6: 浏览器回归战斗侧栏**

Run: `./run.sh`（后台）

在 `http://127.0.0.1:8123` 执行：

```js
({
  slots: document.querySelectorAll('#leftPanel .slot[data-slot]').length,
  cells: document.querySelectorAll('#rightPanel .cell').length,
  tabs: document.querySelectorAll('#rightPanel .tab').length,
  errors: window.__game && window.__game.state ? 'ok' : 'no-state',
})
```

Expected: `slots === 6`，`tabs === 6`，`errors === 'ok'`；页面无控制台报错。

- [ ] **Step 7: 提交（用户授权后）**

```bash
git add js/ui/panels.js
git commit -m "refactor: make panel renderers container scoped"
```

---

## Task 4: 桌面应用外壳、屏幕路由与后台战斗

**Files:**
- Modify: `index.html:50-78`
- Create: `js/ui/nav.js`
- Create: `js/ui/screens.js`
- Modify: `js/main.js:5-26, 75-102, 187-316, 535-554, 622-635`
- Modify: `css/style.css:120-126`
- Modify: `sw.js:1-13`

**Interfaces:**
- Consumes: `renderCharacter`, `renderBagInto`, `setPanelDirtyHook`, `setPanelsMounted` from Task 3。
- Produces:
  - `initNav(game, onSelect: (key: string) => void)`
  - `setNavActive(key: string)`
  - `initScreens(game)`
  - `showScreen(key: string)`
  - `currentScreen(): string`
  - `battleVisible(): boolean`
  - `markScreenDirty(key?: string)`
  - `refreshActiveScreen()`
  - `refreshLiveScreen()`
  - `flushScreens()`
- 本任务先只做桌面导航；移动端仍暂时使用旧 tabbar，Task 5 替换。

- [ ] **Step 1: 改造 `index.html` 外壳**

把 50-74 行的 `<main class="main">...</main>` 与 `<footer class="bottombar">...</footer>` 包进屏幕容器。替换 50-78 行为：

```html
  <div class="app-body">
    <nav class="nav-rail" id="navRail" aria-label="主界面导航"></nav>
    <div class="screen-root" id="screenRoot">
      <section class="screen" data-screen="battle" id="battleScreen">
        <main class="main">
          <aside class="side side-left" id="leftPanel"></aside>

          <section class="stage-wrap">
            <div class="stage" id="stage">
              <canvas id="game" width="640" height="360"></canvas>
              <div class="stage-overlay" id="stageOverlay"></div>
            </div>
            <div class="skillbar" id="skillBar"></div>
          </section>

          <aside class="side side-right" id="rightPanel"></aside>
        </main>
      </section>
      <section class="screen page-screen" data-screen="page" id="pageScreen" hidden></section>
    </div>
  </div>

  <footer class="bottombar">
    <div class="log" id="log"></div>
    <div class="toggles">
      <label class="tgl"><input type="checkbox" id="tglAutoBattle" checked><span>自动战斗</span></label>
      <label class="tgl"><input type="checkbox" id="tglAutoEquip" checked><span>自动装备</span></label>
      <label class="tgl"><input type="checkbox" id="tglAutoSalvage" checked><span>自动分解</span></label>
      <button id="btnHelp" class="btn btn-ghost">玩法</button>
    </div>
  </footer>

  <!-- 移动端底部页签（Task 5 替换） -->
  <nav class="tabbar" id="tabbar" hidden></nav>
  <div class="scrim" id="scrim" hidden></div>
```

- [ ] **Step 2: 创建桌面导航 `js/ui/nav.js`**

```js
// 主界面导航：桌面侧栏；Task 5 追加移动底栏与更多弹层
export const NAV_ITEMS = [
  { key: 'battle', label: '战斗', glyph: '战' },
  { key: 'character', label: '角色', glyph: '角' },
  { key: 'bag', label: '背包', glyph: '包' },
  { key: 'cave', label: '洞府', glyph: '府' },
  { key: 'sect', label: '宗门', glyph: '宗' },
  { key: 'farm', label: '灵田', glyph: '田' },
  { key: 'dungeon', label: '秘境', glyph: '秘' },
  { key: 'fate', label: '法宝', glyph: '宝' },
  { key: 'ascend', label: '仙缘', glyph: '缘' },
];

let gameRef = null;
let selectHandler = () => {};
let activeKey = 'battle';

export function initNav(game, onSelect) {
  gameRef = game;
  selectHandler = onSelect;
  const rail = document.getElementById('navRail');
  if (!rail) return;
  rail.innerHTML = NAV_ITEMS.map((item) => `
    <button data-nav="${item.key}" title="${item.label}" aria-label="${item.label}">
      <span class="ni">${item.glyph}</span>
      <span class="nl">${item.label}</span>
    </button>`).join('');
  rail.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.onclick = () => selectHandler(btn.dataset.nav);
  });
  setNavActive('battle');
}

export function setNavActive(key) {
  activeKey = key;
  const rail = document.getElementById('navRail');
  if (rail) {
    rail.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.nav === key);
    });
  }
}
```

- [ ] **Step 3: 创建屏幕路由 `js/ui/screens.js`**

```js
// 屏幕路由：战斗页常驻，其它页面按需挂载
import {
  renderCharacter,
  renderBagInto,
  setPanelDirtyHook,
  setPanelsMounted,
  refreshPanels,
  markPanelsDirty,
} from './panels.js';
import { renderCave } from './cave.js';
import { renderSect } from './sect.js';
import { renderFate } from './fate.js';
import { renderDungeon } from './dungeon.js';
import { renderAscend } from './ascend.js';
import { initNav, setNavActive } from './nav.js';

const PAGES = {
  character: {
    label: '角色',
    render: (g, el) => renderCharacter(g, el, {
      rerender: () => refreshActiveScreen(),
      onOpenFate: () => showScreen('fate'),
    }),
  },
  bag: {
    label: '背包',
    render: (g, el) => renderBagInto(g, el, {
      full: true,
      rerender: () => refreshActiveScreen(),
    }),
  },
  cave: { label: '洞府', render: (g, el) => renderCave(g, el) },
  sect: { label: '宗门', render: (g, el) => renderSect(g, el) },
  dungeon: { label: '秘境', render: (g, el) => renderDungeon(g, el) },
  fate: { label: '法宝', render: (g, el) => renderFate(g, el) },
  ascend: { label: '仙缘', render: (g, el) => renderAscend(g, el) },
};

const LIVE_PAGES = new Set(['character', 'cave', 'sect']);
const PRIMARY_MOBILE = new Set(['battle', 'character', 'bag', 'cave', 'sect']);

let game = null;
let battleScreen = null;
let pageScreen = null;
let active = 'battle';
let pageDirty = false;

export function initScreens(g) {
  game = g;
  battleScreen = document.getElementById('battleScreen');
  pageScreen = document.getElementById('pageScreen');
  setPanelDirtyHook(() => { pageDirty = true; });
  initNav(g, (key) => showScreen(key));
  setPanelsMounted(true);
  showScreen('battle');
}

export function showScreen(key) {
  if (!game || !battleScreen || !pageScreen) return;

  if (key === 'battle') {
    if (active !== 'battle') {
      pageScreen.hidden = true;
      pageScreen.innerHTML = '';
      battleScreen.hidden = false;
      active = 'battle';
      setPanelsMounted(true);
      markPanelsDirty('both');
      refreshPanels();
    }
    battleScreen.hidden = false;
    setNavActive('battle');
    game.render();
    return;
  }

  if (!PAGES[key]) return;
  if (key === active) return;

  if (active === 'battle') {
    setPanelsMounted(false);
  }
  active = key;
  battleScreen.hidden = true;
  pageScreen.hidden = false;
  pageScreen.dataset.screen = key;
  pageScreen.innerHTML = '<div class="page-inner" id="pageBody"></div>';
  pageDirty = false;
  renderPage(key);
  pageScreen.scrollTop = 0;
  setNavActive(key);
}

function renderPage(key) {
  const body = pageScreen.querySelector('#pageBody');
  if (!body || !PAGES[key]) return;
  body.innerHTML = '';
  PAGES[key].render(game, body);
}

export function refreshActiveScreen() {
  if (!game || active === 'battle') return;
  if (pageScreen.hidden) return;
  const modal = document.getElementById('modalRoot');
  if (modal && !modal.hidden) return;
  const focused = document.activeElement;
  if (focused && pageScreen.contains(focused) && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName)) return;
  const scroll = pageScreen.scrollTop;
  renderPage(active);
  pageScreen.scrollTop = scroll;
}

export function refreshLiveScreen() {
  if (!LIVE_PAGES.has(active)) return;
  refreshActiveScreen();
}

export function flushScreens() {
  if (!pageDirty) return;
  pageDirty = false;
  refreshActiveScreen();
}

export function markScreenDirty(key = active) {
  if (key === active) pageDirty = true;
}

export function currentScreen() {
  return active;
}

export function battleVisible() {
  return active === 'battle';
}
```

- [ ] **Step 4: 接入 `js/main.js`**

把导入行改为：

```js
import { initHud, refreshHud } from './ui/hud.js';
import { buildPanels, refreshPanels, isTouch, markPanelsDirty, flushPanels, refreshLivePanel } from './ui/panels.js';
import { initLayout, isMobileLayout } from './ui/layout.js';
import { initScreens, battleVisible, flushScreens, refreshLiveScreen } from './ui/screens.js';
```

在 `startGame` 中，把：

```js
    initHud(this);
    buildPanels(this);
    buildSkillBar(this);
    initLayout(this);
    this.bindUi();
```

改为：

```js
    initHud(this);
    buildPanels(this);
    buildSkillBar(this);
    initLayout(this);
    initScreens(this);
    this.bindUi();
```

在 `update(dt)` 中，把面板刷新段改为：

```js
    // 面板脏标记合并刷新，避免每次掉落都重建 DOM
    this.flushTimer += dt;
    if (this.flushTimer > 0.35) {
      this.flushTimer = 0;
      flushPanels();
      flushScreens();
    }
```

把定时刷新段改为：

```js
    // 战斗侧栏与全屏实时页刷新（灵田成熟、丹炉倒计时）
    this.panelTimer = (this.panelTimer || 0) + dt;
    if (this.panelTimer > 4) {
      this.panelTimer = 0;
      refreshLivePanel();
      refreshLiveScreen();
    }
```

把 `render()` 开头改为：

```js
  render() {
    if (!this.state || !this.combat) return;
    if (!battleVisible()) return;
    const ctx = this.ctx;
    // 其余不变
```

在 `setFloor` 末尾，把：

```js
    this.save();
    refreshPanels();
```

改为：

```js
    this.save();
    markPanelsDirty('both');
    refreshPanels();
```

- [ ] **Step 5: 加入桌面外壳、导航与页面样式**

在 `css/style.css` 的 `.main` 规则之前插入：

```css
/* ---------------- 屏幕外壳 ---------------- */
.app-body {
  display: flex;
  gap: 6px;
  min-height: 0;
  min-width: 0;
}
.nav-rail {
  width: 64px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  background: var(--panel-bg);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow-y: auto;
  scrollbar-width: none;
}
.nav-rail::-webkit-scrollbar { display: none; }
.nav-rail button {
  display: grid;
  place-items: center;
  gap: 1px;
  min-height: 48px;
  padding: 3px 2px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  color: var(--dim);
  font-family: inherit;
  cursor: pointer;
}
.nav-rail button:hover { color: var(--text); border-color: var(--line); }
.nav-rail button.on {
  color: var(--gold);
  border-color: var(--gold);
  background: rgba(232, 196, 106, .08);
}
.nav-rail .ni { font-size: 16px; line-height: 1; }
.nav-rail .nl { font-size: 10px; letter-spacing: 1px; }
.screen-root {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
}
.screen {
  height: 100%;
  min-height: 0;
}
.screen[hidden] { display: none; }
.screen[data-screen="battle"] .main { height: 100%; }
.page-screen {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--panel-bg);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 10px 16px 18px;
}
.page-inner {
  max-width: 1180px;
  margin: 0 auto;
}
.page-screen .bag-grid {
  grid-template-columns: repeat(auto-fill, minmax(46px, 1fr));
}
.nav-mobile { display: none; }
```

- [ ] **Step 6: 更新 Service Worker 清单**

把 `sw.js` 顶部改为：

```js
const VERSION = 'shuazi-xiuxian-v2';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/data/config.js',
  './js/data/sprites.js',
  './js/game/spirit_root.js',
  './js/ui/screens.js',
  './js/ui/nav.js',
  './js/ui/roots.js',
  './js/ui/farm.js',
  './assets/fonts/fusion-pixel-12px.woff2',
  './assets/icons/icon-192.png',
];
```

- [ ] **Step 7: 浏览器验证桌面导航与后台战斗**

Run: `./run.sh`

在 `http://127.0.0.1:8123` 执行：

```js
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nav = document.querySelectorAll('#navRail [data-nav]');
  const before = window.__game.state.stats.kills;
  document.querySelector('#navRail [data-nav="sect"]').click();
  await wait(1600);
  const after = window.__game.state.stats.kills;
  const onSect = !document.querySelector('#pageScreen').hidden
    && document.querySelector('#pageBody').textContent.includes('宗门');
  document.querySelector('#navRail [data-nav="battle"]').click();
  await wait(120);
  return {
    navCount: nav.length,
    onSect,
    killDelta: after - before,
    battleCanvasVisible: !document.querySelector('#battleScreen').hidden,
    leftSlots: document.querySelectorAll('#leftPanel .slot[data-slot]').length,
  };
})()
```

Expected:

- `navCount === 9`
- `onSect === true`
- `killDelta >= 1`（说明后台战斗继续）
- `battleCanvasVisible === true`
- `leftSlots === 6`

- [ ] **Step 8: 提交（用户授权后）**

```bash
git add index.html js/ui/nav.js js/ui/screens.js js/main.js css/style.css sw.js
git commit -m "feat: add screen router and desktop navigation"
```

---

## Task 5: 移动底栏与旧抽屉退役

**Files:**
- Modify: `index.html:76-78`
- Modify: `js/ui/nav.js`
- Modify: `js/ui/screens.js`
- Modify: `js/ui/layout.js`
- Modify: `css/style.css:120-126, 438-664`
- Modify: `dev/mobile.html:27-38`
- Modify: `dev/preview.html:1-23`

**Interfaces:**
- Consumes: Task 4 的 `initNav(game, onSelect)` 与 `setNavActive`。
- Produces:
  - `initNav` 同时渲染桌面侧栏与移动底栏
  - `openMoreSheet()` / `closeMoreSheet()`
  - `isMobileLayout()` 只依赖媒体查询
  - `initLayout()` 只注册旋转提示与断点监听

- [ ] **Step 1: 替换移动端挂载点**

把 `index.html` 中的：

```html
  <!-- 移动端底部页签（Task 5 替换） -->
  <nav class="tabbar" id="tabbar" hidden></nav>
  <div class="scrim" id="scrim" hidden></div>
```

替换为：

```html
  <nav class="nav-mobile" id="navMobile" hidden aria-label="主界面导航"></nav>
  <div class="sheet-root" id="moreSheet" hidden></div>
```

- [ ] **Step 2: 扩展 `js/ui/nav.js`**

在 `NAV_ITEMS` 之后加入：

```js
const MOBILE_ITEMS = [
  { key: 'battle', label: '战斗', glyph: '战' },
  { key: 'character', label: '角色', glyph: '角' },
  { key: 'bag', label: '背包', glyph: '包' },
  { key: 'cave', label: '洞府', glyph: '府' },
  { key: 'sect', label: '宗门', glyph: '宗' },
  { key: 'more', label: '更多', glyph: '更' },
];

const MORE_ITEMS = [
  { key: 'farm', label: '灵田', glyph: '田' },
  { key: 'dungeon', label: '秘境', glyph: '秘' },
  { key: 'fate', label: '法宝', glyph: '宝' },
  { key: 'ascend', label: '仙缘', glyph: '缘' },
];
```

在 `initNav` 中，在 `setNavActive('battle');` 之前加入：

```js
  renderMobileNav();
  ensureMoreSheet();
```

在 `initNav` 之后加入：

```js
function renderMobileNav() {
  const nav = document.getElementById('navMobile');
  if (!nav) return;
  nav.innerHTML = MOBILE_ITEMS.map((item) => `
    <button data-mobile-nav="${item.key}" title="${item.label}" aria-label="${item.label}">
      <span class="ni">${item.glyph}</span>
      <span class="nl">${item.label}</span>
    </button>`).join('');
  nav.querySelectorAll('[data-mobile-nav]').forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.mobileNav === 'more') openMoreSheet();
      else selectHandler(btn.dataset.mobileNav);
    };
  });
}

function ensureMoreSheet() {
  const root = document.getElementById('moreSheet');
  if (!root || root.dataset.ready === '1') return;
  root.dataset.ready = '1';
  root.innerHTML = `
    <div class="sheet-mask"></div>
    <div class="sheet more-sheet">
      <div class="sheet-grab"></div>
      <div class="sheet-title">更多</div>
      <div class="more-grid">
        ${MORE_ITEMS.map((item) => `
          <button class="more-item" data-more="${item.key}">
            <span class="ni">${item.glyph}</span>
            <span class="nl">${item.label}</span>
          </button>`).join('')}
        <button class="more-item" data-more="settings">
          <span class="ni">设</span>
          <span class="nl">设置</span>
        </button>
      </div>
    </div>`;
  root.querySelector('.sheet-mask').onclick = closeMoreSheet;
  root.querySelectorAll('[data-more]').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.more;
      closeMoreSheet();
      if (key === 'settings') {
        if (gameRef) gameRef.showSettings();
      } else {
        selectHandler(key);
      }
    };
  });
}

export function openMoreSheet() {
  const root = document.getElementById('moreSheet');
  if (root) root.hidden = false;
}

export function closeMoreSheet() {
  const root = document.getElementById('moreSheet');
  if (root) root.hidden = true;
}
```

把 `setNavActive` 改为：

```js
export function setNavActive(key) {
  activeKey = key;
  const rail = document.getElementById('navRail');
  if (rail) {
    rail.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.nav === key);
    });
  }
  const mobile = document.getElementById('navMobile');
  if (mobile) {
    const inMore = key === 'farm' || key === 'dungeon' || key === 'fate' || key === 'ascend';
    mobile.querySelectorAll('[data-mobile-nav]').forEach((btn) => {
      const target = btn.dataset.mobileNav;
      btn.classList.toggle('on', target === key || (target === 'more' && inMore));
    });
  }
}
```

- [ ] **Step 3: 重写 `js/ui/layout.js`**

```js
// 自适应布局：只负责断点检测与竖屏旋转提示
const mqNarrow = window.matchMedia('(max-width: 900px), (max-height: 560px)');
const mqLandscape = window.matchMedia('(max-height: 560px) and (orientation: landscape)');

let mobile = mqNarrow.matches;
let rotateHinted = false;

export function isMobileLayout() { return mobile; }

export function initLayout() {
  const sync = () => {
    mobile = mqNarrow.matches;
    maybeRotateHint();
  };
  mqNarrow.addEventListener('change', sync);
  mqLandscape.addEventListener('change', sync);
  window.addEventListener('orientationchange', () => setTimeout(sync, 120));
  sync();
}

function maybeRotateHint() {
  if (rotateHinted) return;
  if (!(mqNarrow.matches && !mqLandscape.matches)) return;
  if (localStorage.getItem('rotateHinted')) { rotateHinted = true; return; }
  rotateHinted = true;
  localStorage.setItem('rotateHinted', '1');
  const el = document.createElement('div');
  el.className = 'rotate-hint';
  el.innerHTML = '横屏体验更好<span>知道了</span>';
  el.querySelector('span').onclick = () => el.remove();
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}
```

- [ ] **Step 4: 替换移动端 CSS**

在 `@media (max-width: 900px), (max-height: 560px)` 内，把旧的抽屉/页签规则替换为：

```css
  .app {
    height: 100dvh;
    grid-template-rows: auto minmax(0, 1fr) auto;
    padding: 0;
    gap: 0;
  }
  .app-body {
    display: block;
    min-height: 0;
    min-width: 0;
  }
  .nav-rail { display: none; }
  .screen-root { height: 100%; }
  .screen[data-screen="battle"] .main { height: 100%; }
  .page-screen {
    border: none;
    border-radius: 0;
    padding: 10px 10px calc(14px + env(safe-area-inset-bottom));
  }

  .main {
    display: flex;
    flex-direction: column;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  .stage-wrap {
    flex: none;
    display: block;
    position: relative;
  }
  .stage {
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 100%;
    border: none;
    border-radius: 0;
  }
  .skillbar {
    position: static;
    justify-content: flex-end;
    padding: 6px 6px 0;
    z-index: 3;
    pointer-events: none;
  }
  .skillbar .skill,
  .skillbar .speed-btn { pointer-events: auto; }

  .side { display: none; }

  .topbar {
    padding: calc(4px + env(safe-area-inset-top)) 8px 4px;
    gap: 6px;
    flex-wrap: wrap;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
  .topbar-left { flex: 1 1 auto; min-width: 0; }
  .who { min-width: 0; }
  .who-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .who-realm { font-size: 11px; white-space: nowrap; }
  .avatar-box { width: 34px; height: 34px; flex: none; }
  .avatar-box canvas { width: 30px; height: 30px; }
  .topbar-mid {
    order: 3;
    flex: 0 0 100%;
    width: 100%;
    max-width: none;
    gap: 3px;
  }
  .topbar-right { flex: 0 0 auto; gap: 4px; flex-wrap: nowrap; }
  .stat-chip { padding: 1px 5px; font-size: 10px; gap: 2px; }
  .stat-chip img { width: 13px; height: 13px; }
  .chip-label { font-size: 10px; }
  .topbar .btn { min-height: 30px; padding: 3px 8px; font-size: 11px; }
  .bar-track { height: 9px; }
  .bar-text { font-size: 10px; width: 72px; }

  .bottombar { display: none; }

  .nav-mobile {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 2px;
    padding: 4px 4px calc(4px + env(safe-area-inset-bottom));
    background: linear-gradient(180deg, rgba(16, 20, 30, .97), rgba(10, 13, 19, .99));
    border-top: 1px solid var(--line);
  }
  .nav-mobile button {
    min-height: 44px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    color: var(--dim);
    font-family: inherit;
    font-size: 10px;
    cursor: pointer;
    display: grid;
    place-items: center;
    gap: 1px;
  }
  .nav-mobile .ni { font-size: 16px; line-height: 1; }
  .nav-mobile button.on {
    color: var(--gold);
    border-color: var(--line);
    background: rgba(111, 214, 176, .08);
  }

  .more-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .more-item {
    min-height: 64px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: #141926;
    color: var(--text);
    font-family: inherit;
    display: grid;
    place-items: center;
    gap: 2px;
    cursor: pointer;
  }
  .more-item .ni { color: var(--gold); font-size: 20px; }
  .more-item .nl { font-size: 11px; color: var(--dim); }

  .btn { min-height: 38px; padding: 6px 12px; }
  .btn-sm { min-height: 34px; padding: 5px 10px; }
  .cell { min-height: 40px; }
  .slot { min-height: 44px; }
  .bag-grid { grid-template-columns: repeat(6, 1fr); }
  .page-screen .bag-grid { grid-template-columns: repeat(auto-fill, minmax(42px, 1fr)); }
  .skill { width: 46px; height: 46px; }
  .modal-root { padding: 10px; }
  .modal { padding: 12px; width: 100%; max-height: calc(100dvh - 20px); }
  .creation { grid-template-columns: minmax(0, 1fr); }
  .creation .preview { height: 180px; }
  .tooltip { display: none !important; }
```

在 `@media (max-height: 560px) and (orientation: landscape)` 内，删除 `.side`、`.tabbar`、`.scrim` 相关规则，保留并调整技能栏：

```css
  .topbar {
    position: absolute;
    top: 0; left: 0; right: 0;
    z-index: 4;
    flex-wrap: nowrap;
    background: linear-gradient(180deg, rgba(8, 11, 17, .88), rgba(8, 11, 17, .35));
    border: none;
    pointer-events: none;
  }
  .topbar > * { pointer-events: auto; }
  .topbar-left { flex: 0 1 auto; }
  .topbar-mid {
    order: 0;
    flex: 1 1 140px;
    width: auto;
    min-width: 120px;
  }
  .topbar-right { flex: 0 0 auto; }
  .bar-text { display: none; }

  .main { height: 100%; }
  .stage-wrap { height: 100%; }
  .stage {
    height: 100%;
    aspect-ratio: auto;
    background: transparent;
    border: none;
  }
  #game { object-fit: contain; }

  .nav-mobile {
    padding-top: 2px;
    padding-bottom: calc(2px + env(safe-area-inset-bottom));
  }
  .nav-mobile button { min-height: 40px; }
  .nav-mobile .nl { font-size: 9px; }

  .skillbar {
    position: absolute;
    top: calc(50px + env(safe-area-inset-top));
    right: 8px;
    bottom: auto;
    padding: 0;
  }
```

- [ ] **Step 5: 更新开发预览工具**

把 `dev/mobile.html` 的标题与说明改为：

```html
    <h3>横屏 852 × 390（底部导航）</h3>
```

```html
    <h3>竖屏 393 × 852（底部导航 + 可滚动页面）</h3>
```

```html
  <div class="note">
    两台设备各自独立存档（不同 iframe 但同源 → 共享 localStorage，刷新后进度互通）。<br />
    手机上打开时，会自动命中窄屏断点：战场在上，底部导航在拇指区；横屏时战场占满剩余高度。
  </div>
```

把 `dev/preview.html` 的脚本替换为支持 `?w=&h=`：

```html
<script>
  const params = new URLSearchParams(location.search);
  const W = Number(params.get('w')) || 1440;
  const H = Number(params.get('h')) || 900;
  const wrap = document.getElementById('wrap');
  const frame = document.getElementById('f');
  wrap.style.width = W + 'px';
  wrap.style.height = H + 'px';
  frame.style.width = W + 'px';
  frame.style.height = H + 'px';
  function fit() {
    const s = Math.min(1, window.innerWidth / W);
    wrap.style.transform = 'scale(' + s + ')';
    document.body.style.height = (H * s) + 'px';
  }
  window.addEventListener('resize', fit);
  fit();
</script>
```

同时把 `#wrap` 与 `iframe` 的固定宽高从 CSS 中移除，改由脚本设置：

```css
#wrap { transform-origin: 0 0; }
iframe { border: 0; display: block; }
```

- [ ] **Step 6: 浏览器验证移动布局**

打开 `http://127.0.0.1:8123/dev/mobile.html`，执行：

```js
(() => {
  const land = document.getElementById('f1').contentWindow;
  const port = document.getElementById('f2').contentWindow;
  return {
    landNav: land.document.querySelectorAll('#navMobile [data-mobile-nav]').length,
    portNav: port.document.querySelectorAll('#navMobile [data-mobile-nav]').length,
    landNavVisible: land.getComputedStyle(land.document.getElementById('navMobile')).display,
    landRail: land.getComputedStyle(land.document.getElementById('navRail')).display,
    portSkillTop: port.document.getElementById('skillBar').getBoundingClientRect().top,
    portNavTop: port.document.getElementById('navMobile').getBoundingClientRect().top,
  };
})()
```

Expected:

- 两帧 `nav` 数量均为 6
- `landNavVisible === 'grid'`
- `landRail === 'none'`
- `portSkillTop < portNavTop`（技能栏在底栏上方，不重叠）

点击两帧中的“更多”，确认 `.more-sheet` 可见并包含 5 个按钮。

- [ ] **Step 7: 提交（用户授权后）**

```bash
git add index.html js/ui/nav.js js/ui/screens.js js/ui/layout.js css/style.css dev/mobile.html dev/preview.html
git commit -m "feat: replace mobile tabs with persistent bottom navigation"
```

---

## Task 6: 战斗倍速

**Files:**
- Modify: `js/main.js:24-26, 75-102, 174-184, 187-299, 622-635, 676-746`
- Modify: `js/ui/skills.js:1-57`
- Modify: `css/style.css:166-186`

**Interfaces:**
- Consumes: `maxSpeed(state)` from Task 2。
- Produces:
  - `Game.setSpeed(speed, silent?)`
  - `Game.cycleSpeed()`
  - `Game.checkSpeedUnlock()`
  - 技能栏 `#speedBtn`，显示 `×1 | ×2 | ×3`
  - `update(realDt)` 中 `battleDt = realDt * settings.speed`

- [ ] **Step 1: 拆分战斗时间与真实时间**

在 `js/main.js` 的导入中，把 `createState, deriveStats, addExp, realmLabel, normalizeState` 改为：

```js
import { createState, deriveStats, addExp, realmLabel, normalizeState, maxSpeed } from './game/state.js';
```

在 `startGame` 中，`this.state.hp = ...` 之前加入：

```js
    this._lastMaxSpeed = maxSpeed(this.state);
```

把 `update(dt)` 中的战斗更新段：

```js
    if (this.combat && !this.paused) this.combat.update(dt);
    else if (this.paused) this.fx.update(dt);
```

改为：

```js
    const speed = this.state.settings.speed || 1;
    if (this.combat) {
      if (this.paused) this.fx.update(dt);
      else this.combat.update(dt * speed);
    }
```

除上述改动外，`update` 中所有计时（修为时长、任务在线、随机事件、自动存档、HUD、器灵手记、成就、炼丹、提示）继续使用原始 `dt`。

- [ ] **Step 2: 加入速度控制方法**

在 `toggleAutoBattle` 之后加入：

```js
  setSpeed(speed, silent = false) {
    const s = this.state;
    if (!s) return;
    const max = maxSpeed(s);
    const next = Math.max(1, Math.min(max, Number(speed) || 1));
    s.settings.speed = next;
    this.save();
    refreshSkillBar();
    if (!silent) toast(`战斗速度 ×${next}`, '#6fd6b0');
  }

  cycleSpeed() {
    const s = this.state;
    if (!s) return;
    const max = maxSpeed(s);
    const cur = s.settings.speed || 1;
    this.setSpeed(cur >= max ? 1 : cur + 1);
  }

  checkSpeedUnlock() {
    const s = this.state;
    if (!s) return;
    const max = maxSpeed(s);
    const prev = this._lastMaxSpeed || 1;
    if (max > prev) {
      const condition = max === 2 ? '炼气圆满' : '筑基初期';
      this.log(`战斗速度 ×${max} 已解锁（${condition}）。`, 'l-good');
      toast(`战斗速度 ×${max} 解锁`, '#e8c46a');
    }
    this._lastMaxSpeed = max;
    if ((s.settings.speed || 1) > max) {
      s.settings.speed = max;
      refreshSkillBar();
    }
  }
```

在 `recompute()` 末尾加入：

```js
    this.checkSpeedUnlock();
```

- [ ] **Step 3: 重写技能栏，加入速度按钮**

替换 `js/ui/skills.js` 全文：

```js
// 技能栏：显示冷却、解锁状态与战斗速度
import { SKILLS, isUnlocked } from '../game/skills.js';
import { maxSpeed } from '../game/state.js';
import { toast } from './modal.js';

let game = null;
let el = null;

export function buildSkillBar(g) {
  game = g;
  el = document.getElementById('skillBar');
  el.innerHTML = `
    <button class="speed-btn" id="speedBtn" aria-label="战斗速度 1 倍" title="战斗速度 1 倍">×1</button>
    ${SKILLS.map((s, i) => `
      <div class="skill" data-i="${i}" title="${s.desc}">
        <span class="glyph" style="color:${s.color}">${s.glyph}</span>
        <div class="cd" style="display:none"></div>
      </div>`).join('')}
    <span class="muted" id="skillHint" style="font-size:11px"></span>`;

  el.querySelectorAll('.skill').forEach((node) => {
    node.onclick = () => {
      const s = SKILLS[Number(node.dataset.i)];
      toast(`【${s.name}】${s.desc}`);
    };
  });
  const speedBtn = el.querySelector('#speedBtn');
  if (speedBtn) speedBtn.onclick = () => game.cycleSpeed();
  refreshSkillBar();
}

export function refreshSkillBar() {
  if (!game || !el) return;
  const state = game.state;
  const cds = game.combat ? game.combat.skillCds : [];
  const speedBtn = el.querySelector('#speedBtn');
  if (speedBtn) {
    const cur = state.settings.speed || 1;
    const max = maxSpeed(state);
    const title = `战斗速度 ${cur} 倍，点击切换（最高 ×${max}）`;
    speedBtn.textContent = '×' + cur;
    speedBtn.title = title;
    speedBtn.setAttribute('aria-label', title);
    speedBtn.classList.toggle('locked', max === 1);
  }
  SKILLS.forEach((s, i) => {
    const node = el.querySelector(`.skill[data-i="${i}"]`);
    if (!node) return;
    const unlocked = isUnlocked(s, state);
    const cd = cds[i] || 0;
    node.classList.toggle('ready', unlocked && cd <= 0);
    const cdEl = node.querySelector('.cd');
    if (!unlocked) {
      cdEl.style.display = 'grid';
      cdEl.textContent = s.unlockRealm !== undefined
        ? ['炼气', '筑基', '金丹', '元婴'][s.unlockRealm]
        : 'Lv' + s.unlockLevel;
      cdEl.style.fontSize = '11px';
    } else if (cd > 0) {
      cdEl.style.display = 'grid';
      cdEl.textContent = cd.toFixed(1);
    } else {
      cdEl.style.display = 'none';
    }
  });
  const hint = el.querySelector('#skillHint');
  if (hint) {
    const need = SKILLS.filter((s) => !isUnlocked(s, state))
      .map((s) => (s.unlockRealm !== undefined ? `${['炼气', '筑基', '金丹', '元婴'][s.unlockRealm]}期` : `Lv.${s.unlockLevel}`))
      .join('、');
    hint.textContent = need ? `解锁中：${need}` : '技能已全开';
  }
}
```

- [ ] **Step 4: 在设置 modal 中加入速度行**

在 `showSettings` 的 `box.innerHTML` 中，把音效行之后插入：

```html
        <div class="panel-title">战斗速度</div>
        <div class="row mb8" id="setSpeeds">
          ${[1, 2, 3].map((n) => {
            const unlocked = n <= maxSpeed(s);
            const label = n === 1 ? '×1' : n === 2 ? '×2（炼气圆满解锁）' : '×3（筑基初期解锁）';
            return `<button class="btn btn-sm ${s.settings.speed === n ? 'btn-jade' : ''}"
              data-speed="${n}" ${unlocked ? '' : 'disabled'}>${label}</button>`;
          }).join('')}
        </div>
```

在设置 modal 的音频绑定之后加入：

```js
      box.querySelectorAll('[data-speed]').forEach((btn) => {
        btn.onclick = () => {
          if (btn.disabled) return;
          this.setSpeed(Number(btn.dataset.speed));
          box.querySelectorAll('[data-speed]').forEach((item) => {
            item.classList.toggle('btn-jade', Number(item.dataset.speed) === s.settings.speed);
          });
        };
      });
```

- [ ] **Step 5: 加入速度按钮样式**

在 `.skill.ready` 之后加入：

```css
.speed-btn {
  width: 46px;
  height: 46px;
  border: 1px solid var(--gold);
  border-radius: 3px;
  background: #171d29;
  color: var(--gold);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
}
.speed-btn:hover { background: #222b3d; }
.speed-btn.locked { border-color: var(--line); color: var(--dim); }
```

在移动端技能栏触控规则里补充 `.speed-btn`（Task 5 已写入）：

```css
  .skillbar .skill,
  .skillbar .speed-btn { pointer-events: auto; }
```

- [ ] **Step 6: 浏览器验证倍速只加速战斗**

在 `http://127.0.0.1:8123` 执行：

```js
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = window.__game;
  g.state.realm = 1;
  g.state.stage = 0;
  g.state.settings.speed = 3;
  g.state.alchemy = [{ key: 'juqi', remain: 100, total: 100, quality: null }];
  const clock0 = g.combat.clock;
  const alchemy0 = g.state.alchemy[0].remain;
  await wait(1000);
  return {
    speedLabel: document.getElementById('speedBtn').textContent,
    battleDelta: +(g.combat.clock - clock0).toFixed(2),
    alchemyDelta: +(alchemy0 - g.state.alchemy[0].remain).toFixed(2),
  };
})()
```

Expected:

- `speedLabel === '×3'`
- `battleDelta` 在 2.7–3.3 之间
- `alchemyDelta` 在 0.8–1.2 之间（炼丹按真实时间推进）

再设置 `realm=0, stage=0, speed=3` 并调用 `__game.setSpeed(3)`，确认 `state.settings.speed === 1`；设置 `stage=3` 后确认最高只能到 2。

- [ ] **Step 7: 提交（用户授权后）**

```bash
git add js/main.js js/ui/skills.js css/style.css
git commit -m "feat: add 1x/2x/3x battle speed with realm unlocks"
```

---

## Task 7: 统一伤害入口、灵根触发与敌人状态

**Files:**
- Modify: `js/game/combat.js:1-575`
- Create: `tests/combat.test.mjs`

**Interfaces:**
- Consumes: `getRootProcs`, `primaryElement` from Task 1。
- Produces:
  - `Combat.clock: number`（只按战斗时间推进）
  - `Combat.refreshRoots(roots?)`
  - `Combat._mitigateRaw(target, amount, drScale?)`
  - `Combat._applyDamage(target, amount, opts?)`
  - `Combat._afterHeroDamage(target, damage)`
  - `Combat._triggerRoot(proc, target, damage)`
  - `Combat._updateRoots(dt)`
  - 敌人字段：`slowUntil`, `slowPct`, `stunUntil`, `burn`
  - 英雄字段：`shield`, `shieldUntil`

- [ ] **Step 1: 写失败的战斗测试**

创建 `tests/combat.test.mjs`：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../js/game/combat.js';

function anim() {
  return { done: false, update() {}, reset() {}, draw() {} };
}

function makeEnemy(overrides = {}) {
  const a = anim();
  return {
    x: 200, y: 300, hp: 1000, maxHp: 1000, atk: 10, defense: 0,
    speed: 20, scale: 1, facing: -1, attackCd: 0, hitTimer: 0,
    flash: 0, dead: false, isBoss: false, state: 'idle',
    anim: a, anims: { idle: a, move: a, attack: a, hurt: a, death: a },
    def: { scale: 1 },
    ...overrides,
  };
}

function makeCombat(spiritRoots = null) {
  const state = {
    appearance: 'swordsman', floor: 1, hp: 100,
    settings: { autoBattle: true }, spiritRoots,
    fate: null, buffs: {},
  };
  const kills = [];
  const game = {
    state,
    stats: {
      atk: 100, maxHp: 100, def: 0, crit: 0, critDmg: 50,
      aspd: 1, lifesteal: 0, pierce: 0, elem: 0, power: 100,
    },
    fx: { damage() {}, spark() {}, addShake() {}, addFlash() {}, update() {} },
    audio: { hit() {}, crit() {}, thunder() {}, fanfare() {}, loot() {}, click() {} },
    log() {},
    recompute() {},
    onEnemyKilled(enemy) { kills.push(enemy); },
    onPlayerDeath() {},
  };
  const combat = new Combat(game);
  return { game, combat, kills };
}

function roots(elem, grade = 0, heavenly = false) {
  return { v: 1, testedAt: 1, heavenly, roots: [{ elem, grade }] };
}

function withZeroRandom(fn) {
  const original = Math.random;
  Math.random = () => 0;
  try {
    fn();
  } finally {
    Math.random = original;
  }
}

test('_applyDamage 统一扣血并在死亡时走击杀结算', () => {
  const { combat, kills } = makeCombat();
  const e = makeEnemy({ hp: 50 });
  const dealt = combat._applyDamage(e, 80, { hurt: false });
  assert.equal(dealt, 80);
  assert.equal(e.dead, true);
  assert.equal(kills.length, 1);
});

test('火灵根命中挂灼烧，灼烧按战斗时间结算', () => {
  withZeroRandom(() => {
    const { combat } = makeCombat(roots('fire'));
    const e = makeEnemy();
    combat._afterHeroDamage(e, 100);
    assert.ok(e.burn);
    const before = e.hp;
    combat.clock += 0.5;
    combat._updateEnemyBurn(e);
    assert.ok(e.hp < before);
  });
});

test('每次命中最多触发一个灵根', () => {
  withZeroRandom(() => {
    const { combat } = makeCombat({
      v: 1, testedAt: 1, heavenly: false,
      roots: [{ elem: 'metal', grade: 0 }, { elem: 'fire', grade: 0 }],
    });
    const e = makeEnemy();
    combat._afterHeroDamage(e, 100);
    assert.equal(e.burn, null);
    assert.equal(combat.rootCd.metal, 3);
  });
});

test('Boss 的减速与眩晕持续时间减半', () => {
  const { combat } = makeCombat(roots('water'));
  const e = makeEnemy({ isBoss: true });
  combat.clock = 10;
  combat._triggerRoot(combat.rootProcs[0], e, 10);
  assert.equal(e.slowUntil, 11);
  assert.equal(e.slowPct, 0.35);
});

test('土灵根提供护盾，敌人伤害先扣护盾', () => {
  withZeroRandom(() => {
    const { game, combat } = makeCombat(roots('earth'));
    combat._afterHeroDamage(makeEnemy(), 100);
    assert.equal(combat.hero.shield, 3);

    combat.hero.shield = 999;
    combat.hero.shieldUntil = combat.clock + 5;
    combat.hero.invuln = 0;
    const e = makeEnemy({ x: combat.hero.x + 10, atk: 10 });
    combat._enemyHit(e);
    assert.equal(game.state.hp, 100);
    assert.ok(combat.hero.shield < 999);
  });
});

test('眩晕期间敌人不移动也不攻击', () => {
  const { game, combat } = makeCombat();
  const e = makeEnemy({
    x: combat.hero.x + 10,
    attackCd: 0,
    stunUntil: combat.clock + 1,
  });
  const x0 = e.x;
  combat._updateEnemies(0.5, false);
  assert.equal(e.x, x0);
  assert.equal(game.state.hp, 100);
});

test('木灵根周期回春与击杀回血', () => {
  const { game, combat } = makeCombat(roots('wood'));
  game.state.hp = 50;
  combat.hero.hp = 50;
  combat.rootCd.wood = 0;
  combat._updateRoots(0.1);
  assert.ok(game.state.hp > 50);
  assert.equal(combat.rootCd.wood, 8);

  const before = game.state.hp;
  const e = makeEnemy({ hp: 1 });
  combat._applyDamage(e, 10, { hurt: false });
  assert.ok(game.state.hp > before);
});

test('灼烧可以击杀敌人', () => {
  const { combat, kills } = makeCombat();
  const e = makeEnemy({ hp: 5 });
  e.burn = { until: combat.clock + 3, nextTick: combat.clock, dps: 100 };
  combat.clock += 0.5;
  combat._updateEnemyBurn(e);
  assert.equal(e.dead, true);
  assert.equal(kills.length, 1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/combat.test.mjs`

Expected: FAIL，`refreshRoots` / `_applyDamage` 未定义或行为不符。

- [ ] **Step 3: 在 `js/game/combat.js` 顶部加入导入**

```js
import { getRootProcs, primaryElement } from './spirit_root.js';
```

- [ ] **Step 4: 扩展构造函数**

把构造函数替换为：

```js
  constructor(game) {
    this.game = game;
    this.enemies = [];
    this.wavesDone = 0;
    this.waveTimer = 1.2;
    this.waveActive = false;
    this.scroll = 0;
    this.boss = null;
    this.reviveTimer = 0;
    this.clock = 0;
    this.rootProcs = [];
    this.rootCd = {};
    this.rootPrimary = null;
    this.rootHeavenly = false;
    this.hero = {
      x: HERO_X,
      y: VIEW.ground,
      hp: game.state.hp,
      facing: 1,
      state: 'idle',
      attackCd: 0,
      hitTimer: 0,
      flash: 0,
      combo: 0,
      anims: {},
      dead: false,
      shield: 0,
      shieldUntil: 0,
    };
    this._buildHeroAnims();
    this._buildSkills();
    this.refreshRoots();
  }
```

在 `_buildSkills` 之后加入：

```js
  refreshRoots(roots = this.game.state.spiritRoots) {
    this.rootProcs = getRootProcs(roots);
    this.rootPrimary = primaryElement(roots);
    this.rootHeavenly = !!(roots && roots.heavenly);
    this.rootCd = {};
    for (const p of this.rootProcs) {
      if (p.kind === 'periodic') this.rootCd[p.elem] = p.cd;
    }
  }
```

- [ ] **Step 5: 把技能与普攻统一到 `_applyDamage`**

把 `_skillDamage` 替换为：

```js
  _skillDamage(target, amount, color, big) {
    const g = this.game;
    const final = this._mitigateRaw(target, amount * (0.9 + Math.random() * 0.2));
    const applied = this._applyDamage(target, final, { crit: big, color });
    g.fx.spark(target.x, target.y - 30, color || '#ffe0b0', big ? 14 : 6);
    this._afterHeroDamage(target, applied);
  }
```

把 `_heroHit` 替换为：

```js
  _heroHit() {
    const hero = this.hero;
    const g = this.game;
    const stats = g.stats;
    const target = this._nearestEnemy();
    if (!target) return;

    const crit = Math.random() * 100 < stats.crit;
    const variance = 0.9 + Math.random() * 0.2;
    let dmg = stats.atk * variance * (1 + (stats.elem || 0) / 100);
    if (crit) dmg *= 1 + stats.critDmg / 100;

    const applied = this._applyDamage(target, this._mitigateRaw(target, dmg), { crit });
    g.fx.spark(target.x, target.y - 30, crit ? '#ffd76a' : '#ffe0b0', crit ? 10 : 5);
    if (crit) {
      g.audio.crit();
      g.fx.addShake(3);
    }
    if (stats.lifesteal > 0) {
      const heal = applied * stats.lifesteal / 100;
      g.state.hp = Math.min(stats.maxHp, g.state.hp + heal);
      hero.hp = g.state.hp;
    }
    this._afterHeroDamage(target, applied);
  }
```

在 `_skillDamage` 之前加入：

```js
  _mitigateRaw(target, amount, drScale = 1) {
    const stats = this.game.stats;
    const dr = target.defense / (target.defense + 60 + this.floor * 10);
    const effective = Math.max(0, dr - (stats.pierce || 0) / 1000) * drScale;
    return Math.max(1, Math.round(amount * (1 - effective)));
  }

  _applyDamage(target, amount, opts = {}) {
    if (!target || target.dead) return 0;
    const dmg = Math.max(1, Math.round(amount));
    target.hp -= dmg;
    target.flash = 1;
    const g = this.game;
    g.fx.damage(target.x, target.y - (opts.yOff ?? 60), dmg, {
      crit: !!opts.crit,
      color: opts.color,
      elem: !!opts.elem,
    });
    if (opts.hurt !== false) {
      target.anim = target.anims.hurt;
      target.anims.hurt.reset();
      target.state = 'hurt';
    }
    if (target.hp <= 0) this._killEnemy(target);
    return dmg;
  }

  _afterHeroDamage(target, damage) {
    if (!target || target.dead || !this.rootProcs.length) return;
    for (const proc of this.rootProcs) {
      if (proc.kind !== 'hit') continue;
      if ((this.rootCd[proc.elem] || 0) > 0) continue;
      if (Math.random() * 100 >= proc.chance) continue;
      this.rootCd[proc.elem] = proc.cd;
      this._triggerRoot(proc, target, damage);
      break;
    }
  }

  _triggerRoot(proc, target, damage) {
    const g = this.game;
    const stats = g.stats;
    if (proc.elem === 'metal') {
      const final = this._mitigateRaw(target, damage * proc.dmgMult, 0.6);
      this._applyDamage(target, final, { color: proc.color, elem: true, hurt: false });
      g.fx.spark(target.x, target.y - 34, proc.color, 8, 90);
      g.fx.damage(target.x, target.y - 76, 0, { text: '裂金', color: proc.color });
      return;
    }
    if (proc.elem === 'water') {
      const duration = proc.duration * (target.isBoss ? 0.5 : 1);
      target.slowUntil = this.clock + duration;
      target.slowPct = proc.slowPct;
      g.fx.spark(target.x, target.y, proc.color, 10, 40);
      g.fx.damage(target.x, target.y - 84, 0, { text: '寒霜', color: proc.color });
      return;
    }
    if (proc.elem === 'fire') {
      target.burn = {
        until: this.clock + proc.duration,
        nextTick: this.clock + 0.5,
        dps: stats.atk * proc.dpsPct / 100,
      };
      g.fx.spark(target.x, target.y - 30, proc.color, 10, 50);
      g.fx.damage(target.x, target.y - 84, 0, { text: '灼烧', color: proc.color });
      return;
    }
    if (proc.elem === 'earth') {
      const stun = proc.stun * (target.isBoss ? 0.5 : 1);
      target.stunUntil = Math.max(target.stunUntil || 0, this.clock + stun);
      const shield = stats.maxHp * proc.shieldPct / 100;
      this.hero.shield = Math.max(this.hero.shield || 0, shield);
      this.hero.shieldUntil = this.clock + proc.shieldDuration;
      g.fx.spark(target.x, target.y, proc.color, 12, 60);
      g.fx.spark(this.hero.x, this.hero.y - 30, '#f2d98a', 8, 50);
      g.fx.damage(this.hero.x, this.hero.y - 86, 0, { text: '震地', color: proc.color });
    }
  }

  _updateRoots(dt) {
    for (const proc of this.rootProcs) {
      if (proc.kind === 'hit') {
        this.rootCd[proc.elem] = Math.max(0, (this.rootCd[proc.elem] || 0) - dt);
      }
    }
    const wood = this.rootProcs.find((proc) => proc.kind === 'periodic');
    if (wood) {
      this.rootCd[wood.elem] = Math.max(0, (this.rootCd[wood.elem] || 0) - dt);
      if (this.rootCd[wood.elem] <= 0 && this.game.state.hp > 0) {
        const heal = this.game.stats.maxHp * wood.healPct / 100;
        this.game.state.hp = Math.min(this.game.stats.maxHp, this.game.state.hp + heal);
        this.hero.hp = this.game.state.hp;
        this.rootCd[wood.elem] = wood.cd;
        this.game.fx.damage(this.hero.x, this.hero.y - 86, 0, {
          text: `回春 +${Math.round(heal)}`,
          color: wood.color,
        });
        this.game.fx.spark(this.hero.x, this.hero.y - 30, wood.color, 8, 40);
      }
    }
    if (this.hero.shield > 0 && this.clock >= this.hero.shieldUntil) {
      this.hero.shield = 0;
      this.hero.shieldUntil = 0;
    }
  }
```

- [ ] **Step 6: 推进战斗时钟并更新根状态**

把 `update(dt)` 的开头改为：

```js
  update(dt) {
    const g = this.game;
    const state = g.state;
    const stats = g.stats;

    this.clock += dt;
    this.scroll += dt * 12;
    g.fx.update(dt);

    if (state.hp <= 0) {
      this._updateDeath(dt);
      return;
    }

    this._updateRoots(dt);
    // 其余不变
```

把 `_updateDeath` 的复活分支加入护盾清零：

```js
      this.hero.dead = false;
      this.hero.state = 'idle';
      this.hero.invuln = 2;
      this.hero.shield = 0;
      this.hero.shieldUntil = 0;
```

- [ ] **Step 7: 用战斗时钟替换真实时间**

在 `_castSkill` 的御剑术分支，把：

```js
      this.buff.aspdUntil = performance.now() / 1000 + 8;
```

改为：

```js
      this.buff.aspdUntil = this.clock + 8;
```

在 `_updateHero` 中，把：

```js
        const buffed = performance.now() / 1000 < this.buff.aspdUntil ? this.buff.aspdMult : 1;
```

改为：

```js
        const buffed = this.clock < this.buff.aspdUntil ? this.buff.aspdMult : 1;
```

- [ ] **Step 8: 敌人初始化状态字段**

在 `_spawnMob` 的敌人对象中加入：

```js
      slowUntil: 0,
      slowPct: 0,
      stunUntil: 0,
      burn: null,
```

在 `_spawnBoss` 的 boss 对象中加入同样的四个字段。

- [ ] **Step 9: 重写敌人更新与受击**

把 `_updateEnemies` 替换为：

```js
  _updateEnemies(dt, passive) {
    const g = this.game;
    for (const e of this.enemies) {
      e.flash = Math.max(0, e.flash - dt * 4);
      this._updateEnemyBurn(e);

      if (e.dead) {
        e.anim.update(dt);
        if (e.anim.done) e.remove = true;
        continue;
      }

      const stunned = this.clock < (e.stunUntil || 0);
      if (!stunned) e.anim.update(dt);

      if (e.state === 'hurt') {
        if (e.anim.done) {
          e.state = 'idle';
          e.anim = e.anims.idle;
        }
        continue;
      }
      if (passive || stunned) continue;

      const slow = this.clock < (e.slowUntil || 0) ? 1 - (e.slowPct || 0) : 1;
      e.attackCd -= dt * slow;
      const dx = this.hero.x - e.x;
      e.facing = dx >= 0 ? 1 : -1;
      const range = e.isBoss ? ENEMY_RANGE + 14 : ENEMY_RANGE;

      if (Math.abs(dx) > range) {
        e.state = 'move';
        e.anim = e.anims.move;
        e.x += Math.sign(dx) * e.speed * slow * dt;
      } else {
        e.state = 'attack';
        if (e.attackCd <= 0) {
          e.attackCd = e.isBoss ? 1.5 : 1.25;
          e.anim = e.anims.attack;
          e.anims.attack.reset();
          this._enemyHit(e);
        }
      }
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (this.enemies[i].remove) this.enemies.splice(i, 1);
    }
  }

  _updateEnemyBurn(enemy) {
    if (!enemy.burn) return;
    if (this.clock >= enemy.burn.until) {
      enemy.burn = null;
      return;
    }
    if (this.clock >= enemy.burn.nextTick) {
      enemy.burn.nextTick += 0.5;
      this._applyDamage(enemy, enemy.burn.dps * 0.5, {
        color: '#ff8a5c',
        elem: true,
        hurt: false,
        yOff: 46,
      });
    }
  }
```

把 `_enemyHit` 替换为：

```js
  _enemyHit(enemy) {
    const g = this.game;
    const stats = g.stats;
    if (this.hero.invuln > 0) return;
    this.hero.invuln = 0.34;
    const variance = 0.9 + Math.random() * 0.2;
    let dmg = enemy.atk * variance - stats.def * 0.62;
    dmg = Math.max(1, Math.round(dmg));

    if ((this.hero.shield || 0) > 0 && this.clock < this.hero.shieldUntil) {
      const absorbed = Math.min(this.hero.shield, dmg);
      this.hero.shield -= absorbed;
      dmg -= absorbed;
      g.fx.damage(this.hero.x, this.hero.y - 96, 0, {
        text: `护盾 -${Math.round(absorbed)}`,
        color: '#f2d98a',
      });
      if (this.hero.shield <= 0) {
        this.hero.shield = 0;
        this.hero.shieldUntil = 0;
      }
    } else {
      this.hero.shield = 0;
    }

    if (dmg > 0) {
      g.state.hp -= dmg;
      g.fx.damage(this.hero.x, this.hero.y - 78, dmg, { color: '#ff8a80' });
    }
    this.hero.flash = 1;
    g.fx.addShake(enemy.isBoss ? 4 : 2);

    if (g.state.hp <= 0) {
      g.state.hp = 0;
      g.onPlayerDeath();
    }
  }
```

- [ ] **Step 10: 击杀时清状态并结算木系回血**

把 `_killEnemy` 改为：

```js
  _killEnemy(enemy) {
    enemy.dead = true;
    enemy.state = 'dead';
    enemy.anim = enemy.anims.death;
    enemy.anims.death.reset();
    enemy.slowUntil = 0;
    enemy.stunUntil = 0;
    enemy.burn = null;

    const g = this.game;
    const wood = this.rootProcs.find((proc) => proc.kind === 'periodic');
    if (wood && g.state.hp > 0) {
      const heal = g.stats.maxHp * wood.killHealPct / 100;
      g.state.hp = Math.min(g.stats.maxHp, g.state.hp + heal);
      this.hero.hp = g.state.hp;
      g.fx.damage(this.hero.x, this.hero.y - 86, 0, {
        text: `回春 +${Math.round(heal)}`,
        color: wood.color,
      });
    }

    g.fx.spark(enemy.x, enemy.y - 30, '#d8d0a0', 14, 90);
    if (enemy.isBoss) {
      g.fx.addShake(7);
      g.fx.addFlash('255,240,200', 0.45);
      g.audio.thunder();
      this._bossDefeated = true;
      g.state.stats.bossKills++;
    }
    g.onEnemyKilled(enemy);
  }
```

- [ ] **Step 11: 运行战斗测试**

Run:

```bash
node --check js/game/combat.js
node --test tests/combat.test.mjs
```

Expected: 8 个测试全部 PASS。

- [ ] **Step 12: 运行全部测试**

Run: `node --test tests/*.test.mjs`

Expected: 全部 PASS。

- [ ] **Step 13: 提交（用户授权后）**

```bash
git add js/game/combat.js tests/combat.test.mjs
git commit -m "feat: unify combat damage and add spirit root procs"
```

---

## Task 8: 测灵根弹窗、排队触发与角色灵根区

**Files:**
- Create: `js/ui/roots.js`
- Modify: `js/ui/panels.js:1-14, 115-217`
- Modify: `js/main.js:5-31, 75-102, 162-172, 638-674`
- Modify: `js/game/tribulation.js:124-151`
- Modify: `css/style.css`（灵根样式追加）

**Interfaces:**
- Consumes: Task 1 的 `rollSpiritRoots`, `spiritRootSummary`, `rootBonusText`; Task 7 的 `Combat.refreshRoots()`。
- Produces:
  - `openRootTest(game, roots, opts?: { retest?: boolean, onDone?: () => void })`
  - `rootCardsHtml(roots, realm?)`
  - `renderRootBlock(game)`
  - `Game.queueRootTest(opts?: { retest?: boolean, delay?: number })`

- [ ] **Step 1: 创建灵根 UI `js/ui/roots.js`**

```js
// 灵根展示与测灵根弹窗
import {
  ELEMENTS,
  ELEMENT_META,
  GRADES,
  rootBonusText,
  spiritRootSummary,
} from '../game/spirit_root.js';
import { openModal } from './modal.js';

export function rootCardsHtml(roots, realm = 0) {
  if (!roots) {
    return `<div class="root-lock">${realm >= 1 ? '灵根未测，稍后自动测灵根。' : '灵根未测，筑基后开启。'}</div>`;
  }
  const cards = roots.roots.map((root) => {
    const meta = ELEMENT_META[root.elem];
    return `<div class="root-card" style="--root-color:${meta.color}">
      <div class="root-elem">${meta.name}</div>
      <div class="root-grade">${GRADES[root.grade]}</div>
      <div class="root-effect">${meta.effect}：${meta.desc}</div>
    </div>`;
  }).join('');
  const bonus = rootBonusText(roots);
  return `<div class="roots ${roots.heavenly ? 'heavenly' : ''}">
    ${roots.heavenly ? '<div class="root-title">天灵根</div>' : ''}
    <div class="root-cards">${cards}</div>
    <div class="root-bonus">${bonus.join(' · ') || '无额外属性'}</div>
  </div>`;
}

export function renderRootBlock(game) {
  const roots = game.state.spiritRoots;
  return `<div class="sub-title">灵根</div>${rootCardsHtml(roots, game.state.realm)}`;
}

/**
 * 结果必须已经写入 state 并保存，本弹窗只负责展示。
 */
export function openRootTest(game, roots, opts = {}) {
  openModal((box, close) => {
    box.innerHTML = `
      <h2>${opts.retest ? '重测灵根' : '测灵根'}</h2>
      <p class="muted">${roots.heavenly ? '五色灵光冲天而起。' : '灵石映出你体内的灵根。'}</p>
      <div class="root-stage ${roots.heavenly ? 'heavenly' : ''}" id="rootStage">
        <div class="root-orbs">
          ${ELEMENTS.map((elem, i) => `
            <span class="root-orb" style="--root-color:${ELEMENT_META[elem].color};--i:${i}">
              ${ELEMENT_META[elem].name}
            </span>`).join('')}
        </div>
        <div class="root-result">${rootCardsHtml(roots, 1)}</div>
      </div>
      <p class="muted mt8">${spiritRootSummary(roots)}</p>
      <div class="row end mt8"><button class="btn btn-gold" id="rootOk">确认</button></div>`;

    box.querySelector('#rootOk').onclick = () => {
      close();
      if (opts.onDone) opts.onDone();
    };

    setTimeout(() => {
      const stage = box.querySelector('#rootStage');
      if (stage) stage.classList.add('reveal');
    }, 1200);
  }, { width: '520px', dismissible: false });
}
```

- [ ] **Step 2: 把灵根区插入角色页**

在 `js/ui/panels.js` 顶部加入：

```js
import { renderRootBlock } from './roots.js';
```

在 `renderLeftInto` 中，把：

```js
  root.innerHTML = opts.full
    ? `<div class="panel-title">角色</div>
       <div class="sub-title">属性</div>${statsHtml}
       <div class="sub-title">装备</div>${equipmentHtml}
       <div class="sub-title">修为</div>${progressHtml}`
```

改为：

```js
  root.innerHTML = opts.full
    ? `<div class="panel-title">角色</div>
       <div class="sub-title">属性</div>${statsHtml}
       ${opts.showRoots ? renderRootBlock(g) : ''}
       <div class="sub-title">装备</div>${equipmentHtml}
       <div class="sub-title">修为</div>${progressHtml}`
```

- [ ] **Step 3: 在 `js/main.js` 接入排队测灵根**

在导入中加入：

```js
import { rollSpiritRoots, spiritRootSummary } from './game/spirit_root.js';
import { openRootTest } from './ui/roots.js';
```

在 `startGame` 的 `this.loop.start();` 之后加入：

```js
    if (this.state.realm >= 1 && !this.state.spiritRoots) {
      this.queueRootTest({ delay: 600 });
    }
```

在 `startTribulation` 之后加入：

```js
  queueRootTest(opts = {}) {
    if (!this.state || this._rootQueue) return;
    this._rootQueue = true;
    const retest = !!opts.retest;
    const delay = opts.delay ?? 300;

    const tryOpen = () => {
      if (!this.state) {
        this._rootQueue = false;
        return;
      }
      const modal = document.getElementById('modalRoot');
      if (modal && !modal.hidden) {
        setTimeout(tryOpen, 300);
        return;
      }
      this._rootQueue = false;
      const roots = rollSpiritRoots(this.rng);
      this.state.spiritRoots = roots;
      this.recompute();
      if (this.combat) this.combat.refreshRoots();
      this.log(`测灵根：${spiritRootSummary(roots)}`, roots.heavenly ? 'l-loot' : 'l-good');
      if (roots.heavenly) this.log('天灵根现世。', 'l-loot');
      this.save();
      markPanelsDirty('both');
      openRootTest(this, roots, { retest });
    };
    setTimeout(tryOpen, delay);
  }
```

- [ ] **Step 4: 在渡劫成功时触发补测**

在 `js/game/tribulation.js` 的成功分支，把：

```js
    game.log(`雷劫已过，${realmName}期！`, 'l-good');
    game.fx.addFlash('255,240,190', 0.7);
    game.fx.addShake(8);
    audio.fanfare();
    toast(`渡劫成功 · ${realmName}期`, '#e8c46a');
```

改为：

```js
    game.log(`雷劫已过，${realmName}期！`, 'l-good');
    game.fx.addFlash('255,240,190', 0.7);
    game.fx.addShake(8);
    audio.fanfare();
    toast(`渡劫成功 · ${realmName}期`, '#e8c46a');
    if (realmIndex === 1 && !state.spiritRoots) {
      game.queueRootTest({ delay: 60 });
    }
```

- [ ] **Step 5: 加入灵根样式**

在 `css/style.css` 的 `.stat-list` 之后加入：

```css
/* 灵根 */
.root-lock {
  color: var(--dim);
  font-size: 11px;
  padding: 8px;
  border: 1px dashed var(--line);
  border-radius: 3px;
}
.root-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
}
.root-card {
  border: 1px solid var(--root-color);
  border-radius: 4px;
  padding: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, .04), transparent);
}
.root-elem {
  color: var(--root-color);
  font-size: 18px;
  letter-spacing: 4px;
}
.root-grade { color: var(--gold); font-size: 11px; }
.root-effect { color: var(--dim); font-size: 10px; margin-top: 4px; }
.root-bonus { color: var(--text); font-size: 11px; margin-top: 6px; }
.roots.heavenly .root-card {
  border-color: #f2d98a;
  box-shadow: 0 0 18px rgba(242, 217, 138, .35);
}
.root-title {
  color: #f2d98a;
  letter-spacing: 6px;
  font-size: 15px;
  text-shadow: 0 0 12px rgba(242, 217, 138, .6);
  margin-bottom: 6px;
}
.root-orbs {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 18px 0;
}
.root-orb {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--root-color);
  color: var(--root-color);
  display: grid;
  place-items: center;
  font-size: 12px;
  opacity: .2;
  animation: root-glow 2.4s ease-in-out infinite;
  animation-delay: calc(var(--i) * .2s);
}
@keyframes root-glow {
  50% { opacity: 1; box-shadow: 0 0 14px var(--root-color); }
}
.root-result { opacity: 0; transition: opacity .35s; }
.root-stage.reveal .root-result { opacity: 1; }
.root-stage.reveal .root-orbs { opacity: .35; transition: opacity .4s; }
.root-stage.heavenly.reveal { animation: root-flash .8s ease-out; }
@keyframes root-flash {
  from { background: rgba(242, 217, 138, .35); }
  to { background: transparent; }
}
```

- [ ] **Step 6: 浏览器验证测灵根与旧档补测**

在 `http://127.0.0.1:8123` 执行：

```js
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = window.__game;
  g.state.realm = 1;
  g.state.stage = 0;
  g.state.spiritRoots = null;
  g.queueRootTest({ delay: 0 });
  await wait(1500);
  const modal = document.querySelector('#modalRoot .modal');
  const result = {
    title: modal ? modal.querySelector('h2').textContent : null,
    cards: modal ? modal.querySelectorAll('.root-result .root-card').length : 0,
    hasButton: !!(modal && modal.querySelector('#rootOk')),
  };
  if (modal) modal.querySelector('#rootOk').click();
  await wait(100);
  const before = JSON.stringify(g.state.spiritRoots);
  g.queueRootTest({ delay: 0 });
  await wait(500);
  return {
    ...result,
    rootsSaved: !!g.state.spiritRoots,
    noDuplicateModal: document.getElementById('modalRoot').hidden,
    sameRoll: before === JSON.stringify(g.state.spiritRoots),
  };
})()
```

Expected:

- 标题为“测灵根”
- 卡片数量 1–5
- 关闭后 `rootsSaved === true`
- 再次排队不会弹出第二个测灵根（`noDuplicateModal === true` 且 `sameRoll === true`）

再进入角色页，确认“灵根”区块显示元素卡片与属性文本。

- [ ] **Step 7: 提交（用户授权后）**

```bash
git add js/ui/roots.js js/ui/panels.js js/main.js js/game/tribulation.js css/style.css
git commit -m "feat: add spirit root test flow and character root panel"
```

---

## Task 9: 灵根战斗视觉与天灵根光环

**Files:**
- Modify: `js/game/combat.js:497-573`

**Interfaces:**
- Consumes: Task 7 的 `rootPrimary`, `rootHeavenly`, `hero.shield`, 敌人状态字段。
- Produces:
  - 英雄脚下主元素光环
  - 土系护盾环
  - 敌人减速蓝环、灼烧火光、眩晕星点
  - 无新增 DOM，不改变 HUD 与 Boss 血条布局

- [ ] **Step 1: 加入元素颜色导入**

在 `js/game/combat.js` 顶部把灵根导入改为：

```js
import { ELEMENT_META, getRootProcs, primaryElement } from './spirit_root.js';
```

- [ ] **Step 2: 重写英雄绘制**

把 `_drawHero` 替换为：

```js
  _drawHero(ctx) {
    const hero = this.hero;
    const pulse = this.game.lowFx ? 1 : 0.82 + 0.18 * Math.sin(this.clock * 3.2);

    if (this.rootPrimary) {
      const color = ELEMENT_META[this.rootPrimary].color;
      ctx.save();
      ctx.globalAlpha = (this.rootHeavenly ? 0.5 : 0.32) * pulse;
      ctx.strokeStyle = color;
      ctx.lineWidth = this.rootHeavenly ? 2 : 1;
      ctx.beginPath();
      ctx.ellipse(hero.x, hero.y + 2, this.rootHeavenly ? 28 : 23, this.rootHeavenly ? 10 : 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (this.rootHeavenly) {
        ctx.globalAlpha = 0.22 * pulse;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(hero.x, hero.y + 2, 30, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (hero.shield > 0) {
      ctx.save();
      ctx.globalAlpha = 0.45 + 0.2 * pulse;
      ctx.strokeStyle = '#f2d98a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(hero.x, hero.y + 1, 26, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    this._drawShadow(ctx, hero.x, hero.y, 20);
    const anim = hero.state === 'attack' && hero.currentAnim ? hero.currentAnim
      : (hero.anims[hero.state] || hero.anims.idle);
    anim.draw(ctx, hero.x, hero.y, {
      flip: hero.facing < 0,
      flash: hero.flash,
    });
  }
```

- [ ] **Step 3: 给敌人增加状态视觉**

在 `_drawEnemy` 中，把：

```js
    anim.draw(ctx, e.x, e.y, {
      flip: e.facing > 0,
      flash: e.flash,
      scale: e.scale,
    });
    if (!e.dead && e.hp < e.maxHp) {
```

改为：

```js
    anim.draw(ctx, e.x, e.y, {
      flip: e.facing > 0,
      flash: e.flash,
      scale: e.scale,
    });
    if (!e.dead) {
      if (this.clock < (e.slowUntil || 0)) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = '#6fb8ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + 2, 18 * e.scale, 6 * e.scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (e.burn) {
        const r = 7 + Math.sin(this.clock * 12) * 2;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ff8a5c';
        ctx.beginPath();
        ctx.arc(e.x, e.y - 26 * e.scale, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (this.clock < (e.stunUntil || 0)) {
        ctx.save();
        ctx.fillStyle = '#f2d98a';
        for (let i = 0; i < 3; i++) {
          const a = this.clock * 4 + i * Math.PI * 2 / 3;
          ctx.fillRect(e.x + Math.cos(a) * 14, e.y - 46 * e.scale + Math.sin(a) * 4, 2, 2);
        }
        ctx.restore();
      }
    }
    if (!e.dead && e.hp < e.maxHp) {
```

- [ ] **Step 4: 低特效设备降低光效**

在 `_drawHero` 的光环计算中已使用 `this.game.lowFx`。不需要修改 `fx.js`；灵根飘字与粒子继续受现有 `Fx.lowFx` 上限约束。

- [ ] **Step 5: 浏览器验证五种特效**

在 `http://127.0.0.1:8123` 执行：

```js
(() => {
  const g = window.__game;
  const setRoot = (elem, grade = 3, heavenly = false) => {
    g.state.spiritRoots = {
      v: 1, testedAt: 1, heavenly,
      roots: [{ elem, grade }],
    };
    g.combat.refreshRoots();
    g.recompute();
  };
  setRoot('fire');
  g.combat._afterHeroDamage(g.combat.enemies.find((e) => !e.dead) || { dead: true }, 100);
  return {
    primary: g.combat.rootPrimary,
    procs: g.combat.rootProcs.map((p) => p.elem),
  };
})()
```

再依次把 `fire` 换成 `metal / wood / water / earth`，确认：

- `combat.rootPrimary` 与设置一致
- 画面英雄脚下出现对应颜色光环
- 触发后能看到对应飘字；土系额外出现金色护盾环
- 天灵根设置 `heavenly: true` 时光环更亮

- [ ] **Step 6: 提交（用户授权后）**

```bash
git add js/game/combat.js
git commit -m "feat: render spirit root auras and combat status effects"
```

---

## Task 10: 洗髓丹重测灵根

**Files:**
- Modify: `js/game/crafting.js:33-39`
- Modify: `js/main.js:491-527`
- Modify: `js/ui/cave.js:187-197`

**Interfaces:**
- Consumes: Task 8 的 `openRootTest`, `Combat.refreshRoots()`。
- Produces:
  - `Game.usePill(pill, opts?: { onConsume?: () => void }): boolean`
  - `Game.openRerollChoice(pill, opts)`
  - `Game.rerollSpiritRoots(): SpiritRoots`
  - 取消选择不消耗丹药

- [ ] **Step 1: 更新丹方描述**

把 `js/game/crafting.js` 中洗髓丹的 `desc` 改为：

```js
    desc: '洗去杂质：重铸一条装备词缀，或重测灵根（筑基后）。',
```

- [ ] **Step 2: 重构 `usePill`**

把 `js/main.js` 的 `usePill` 替换为：

```js
  usePill(pill, opts = {}) {
    const s = this.state;
    const now = Date.now();
    const onConsume = opts.onConsume || null;
    s.buffs = s.buffs || {};

    const finish = () => {
      this.recompute();
      markPanelsDirty('both');
      this.save();
      this.log(`服下 ${pill.quality}${pill.name}。`, 'l-good');
      toast(`服用 ${pill.name}（${pill.quality}）`, '#6fd68a');
      if (onConsume) onConsume();
    };

    if (pill.effect.reroll) {
      this.openRerollChoice(pill, {
        canRoots: !!(s.spiritRoots && s.realm >= 1),
        onConsume,
      });
      return false;
    }

    let tribulation = null;
    if (pill.effect.exp) {
      const res = addExp(s, pill.exp);
      for (const lv of res.levels) this.log(`修为精进：${lv.label}`, 'l-good');
      tribulation = res.tribulation;
    }
    if (pill.effect.atkPct) {
      s.buffs.atkUntil = now + (pill.effect.duration || 900) * 1000;
      s.buffs.atkPct = pill.effect.atkPct;
    }
    if (pill.effect.luck) {
      s.buffs.luckUntil = now + (pill.effect.duration || 900) * 1000;
      s.buffs.luck = pill.effect.luck;
    }
    if (pill.effect.tribulation) {
      s.buffs.tribResist = Math.min(0.75, (s.buffs.tribResist || 0) + pill.effect.tribulation);
      this.log(`破境丹护体：下次渡劫伤害 -${Math.round(s.buffs.tribResist * 100)}%。`, 'l-good');
    }

    finish();
    if (tribulation) this.startTribulation(tribulation);
    return true;
  }

  openRerollChoice(pill, { canRoots, onConsume } = {}) {
    openModal((box, close) => {
      box.innerHTML = `
        <h2>${pill.name}</h2>
        <p class="muted">${pill.desc}</p>
        <div class="divider"></div>
        <div class="row">
          ${canRoots ? '<button class="btn btn-gold" data-choice="roots">重测灵根</button>' : ''}
          <button class="btn" data-choice="affix">重铸装备词缀</button>
          <button class="btn btn-ghost" data-choice="cancel">取消</button>
        </div>`;
      box.querySelectorAll('[data-choice]').forEach((btn) => {
        btn.onclick = () => {
          const choice = btn.dataset.choice;
          close();
          if (choice === 'cancel') return;
          if (choice === 'roots') {
            this.rerollSpiritRoots();
            this.recompute();
            markPanelsDirty('both');
            this.save();
            this.log(`服下 ${pill.quality}${pill.name}。`, 'l-good');
            toast(`服用 ${pill.name}（${pill.quality}）`, '#6fd68a');
            if (onConsume) onConsume();
            return;
          }
          this.rerollEquipAffix();
          this.recompute();
          markPanelsDirty('both');
          this.save();
          this.log(`服下 ${pill.quality}${pill.name}。`, 'l-good');
          toast(`服用 ${pill.name}（${pill.quality}）`, '#6fd68a');
          if (onConsume) onConsume();
        };
      });
    });
  }

  rerollEquipAffix() {
    const s = this.state;
    const item = Object.values(s.equip).find((i) => i && Object.keys(i.affixes || {}).length);
    if (!item) {
      this.log('身上没有可洗练的装备。', 'l-dim');
      return;
    }
    const before = JSON.stringify(item.affixes);
    reroll(item, this.rng);
    if (before !== JSON.stringify(item.affixes)) {
      this.log(`洗髓丹生效：${item.name} 词缀已变。`, 'l-loot');
    } else {
      this.log(`洗髓丹生效：${item.name} 的词缀没有变化。`, 'l-dim');
    }
  }

  rerollSpiritRoots() {
    const roots = rollSpiritRoots(this.rng);
    this.state.spiritRoots = roots;
    if (this.combat) this.combat.refreshRoots();
    this.log(`重测灵根：${spiritRootSummary(roots)}`, roots.heavenly ? 'l-loot' : 'l-good');
    if (roots.heavenly) this.log('天灵根现世。', 'l-loot');
    this.save();
    openRootTest(this, roots, { retest: true });
    return roots;
  }
```

- [ ] **Step 3: 修改洞府服丹逻辑，确认后才移除**

在 `js/ui/cave.js` 中，把：

```js
  el.querySelectorAll('[data-pill]').forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.pill);
      const pill = s.pills[i];
      if (!pill) return;
      s.pills.splice(i, 1);
      game.usePill(pill);
      game.save();
      renderCave(game, el);
    };
  });
```

改为：

```js
  el.querySelectorAll('[data-pill]').forEach((b) => {
    b.onclick = () => {
      const pill = s.pills[Number(b.dataset.pill)];
      if (!pill) return;
      game.usePill(pill, {
        onConsume: () => {
          const idx = s.pills.indexOf(pill);
          if (idx >= 0) s.pills.splice(idx, 1);
          game.save();
          renderCave(game, el);
        },
      });
    };
  });
```

- [ ] **Step 4: 浏览器验证取消与两种用途**

在 `http://127.0.0.1:8123` 执行：

```js
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = window.__game;
  g.state.realm = 1;
  g.state.spiritRoots = {
    v: 1, testedAt: 1, heavenly: false,
    roots: [{ elem: 'metal', grade: 0 }],
  };
  g.state.pills = [{
    key: 'xisui', name: '洗髓丹', quality: '中品', qi: 1, count: 1,
    desc: '测试', effect: { reroll: true },
  }];
  document.querySelector('#navRail [data-nav="cave"]').click();
  await wait(100);
  document.querySelector('[data-cave-tab="alchemy"]')?.click();
  const pillBtn = document.querySelector('[data-pill="0"]');
  pillBtn.click();
  await wait(50);
  const choices = [...document.querySelectorAll('[data-choice]')].map((b) => b.dataset.choice);
  document.querySelector('[data-choice="cancel"]').click();
  await wait(50);
  const stillThere = g.state.pills.length;
  document.querySelector('[data-pill="0"]').click();
  await wait(50);
  document.querySelector('[data-choice="roots"]').click();
  await wait(1400);
  return {
    choices,
    stillThere,
    consumed: g.state.pills.length,
    rootTitle: document.querySelector('#modalRoot .modal h2')?.textContent,
  };
})()
```

Expected:

- `choices` 包含 `roots`、`affix`、`cancel`
- 取消后 `stillThere === 1`
- 选择重测后 `consumed === 0`
- 弹窗标题为“重测灵根”

- [ ] **Step 5: 提交（用户授权后）**

```bash
git add js/game/crafting.js js/main.js js/ui/cave.js
git commit -m "feat: let marrow pills reroll spirit roots"
```

---

## Task 11: 洞府子页、灵田独立与全流程回归

**Files:**
- Create: `js/ui/farm.js`
- Modify: `js/ui/cave.js:1-257`
- Modify: `js/ui/screens.js:1-40`
- Modify: `js/ui/nav.js`（无需改动，灵田入口已在 Task 4 注册）
- Modify: `sw.js`（Task 4 已加入）
- Modify: `dev/preview.html`（Task 5 已改）

**Interfaces:**
- Consumes: Task 4 的 `PAGES` 注册表。
- Produces:
  - `renderFarm(game, el, opts?)`
  - 洞府页 `炼丹` / `炼器` 两个子页
  - 灵田可从桌面侧栏或移动“更多”进入
  - 战斗侧栏洞府页只保留炼丹 / 炼器

- [ ] **Step 1: 创建 `js/ui/farm.js`**

```js
// 灵田：种植、浇灌、除虫、看守与收获
import {
  farmState,
  plant,
  harvest,
  plotInfo,
  SEEDS,
  water,
  clearPest,
  assignGuard,
} from '../game/farm.js';
import { spiritName } from '../game/fate.js';
import { toast } from './modal.js';

export function renderFarm(game, el, opts = {}) {
  const s = game.state;
  const rerender = opts.rerender || (() => renderFarm(game, el, opts));
  const farm = farmState(s);

  const plotHtml = farm.plots.map((_, i) => {
    const info = plotInfo(s, i);
    if (info.empty) {
      return `<div class="kv"><span>第 ${i + 1} 块 · 空地</span>
        <span>${SEEDS.map((sd) => `<button class="btn btn-sm" data-seed="${sd.key}">${sd.name} ${sd.cost}</button>`).join(' ')}</span></div>`;
    }
    const guardName = info.guard === 'tool' ? '傀儡看守' : (info.guard === 'spirit' ? '器灵看守' : '无');
    const bug = info.pest ? '<span class="red">有虫害！产量减半</span>' : '';
    return `<div class="kv" style="align-items:center">
      <span>第 ${i + 1} 块 · ${info.seed.name} <span class="muted">${guardName}</span><br>
        <span class="muted" style="font-size:10px">${info.ready ? '已成熟' : '还差 ' + Math.ceil(info.left / 60) + ' 分钟'}</span>
        ${bug ? `<br><span style="font-size:10px">${bug}</span>` : ''}</span>
      <span>
        ${info.pest ? `<button class="btn btn-sm" data-pest="${i}">除虫</button>` : ''}
        ${!info.ready && !info.guard ? `<button class="btn btn-sm" data-water="${i}">浇灌</button>` : ''}
        ${!info.guard ? `<button class="btn btn-sm" data-guard="${i}">派守</button>` : ''}
        ${info.ready ? `<button class="btn btn-sm btn-jade" data-harvest="${i}">收获</button>` : ''}
      </span>
    </div>
    <div class="bar bar-xp" style="margin:2px 0 6px"><div class="bar-track"><i style="width:${info.pct}%"></i></div></div>`;
  }).join('');

  el.innerHTML = `
    <div class="panel-title">灵田</div>
    <div class="row mb8">
      <span class="muted" style="font-size:10px">灵草与妖丹的主要来源。浇灌、除虫与看守都会影响产量。</span>
    </div>
    ${plotHtml}
    <div class="muted" style="font-size:10px">${SEEDS.map((sd) => sd.name + '：' + sd.desc).join('<br>')}
      <br>浇灌 30 灵石：剩余时间减半（每块地最多 2 次）；虫害使产量减半，除虫免费。</div>`;

  el.querySelectorAll('[data-pest]').forEach((b) => {
    b.onclick = () => {
      const r = clearPest(s, Number(b.dataset.pest));
      if (r.error) { toast(r.error); return; }
      game.log('灵田里的虫被赶走了。', 'l-good');
      game.save();
      rerender();
    };
  });

  el.querySelectorAll('[data-water]').forEach((b) => {
    b.onclick = () => {
      const r = water(s, Number(b.dataset.water));
      if (r.error) { toast(r.error); return; }
      game.log('浇了一遍水，苗长快了些。', 'l-good');
      game.save();
      rerender();
    };
  });

  el.querySelectorAll('[data-guard]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.guard);
      const spiritFree = s.fate && s.fate.unlocked
        && !farm.plots.some((p) => p && p.guard === 'spirit');
      const kind = spiritFree ? 'spirit' : 'tool';
      const r = assignGuard(s, idx, kind);
      if (r.error) { toast(r.error); return; }
      game.log(kind === 'spirit'
        ? `${spiritName(s)}自愿去看守灵田了：「交给我。」`
        : '炼了一具傀儡放在田里守着。', 'l-good');
      game.save();
      rerender();
    };
  });

  el.querySelectorAll('[data-seed]').forEach((b) => {
    b.onclick = () => {
      const r = plant(s, b.dataset.seed);
      if (r.error) { toast(r.error); return; }
      game.log(`在灵田种下了${r.seed.name}。`, 'l-good');
      game.save();
      rerender();
    };
  });

  el.querySelectorAll('[data-harvest]').forEach((b) => {
    b.onclick = () => {
      const r = harvest(s, Number(b.dataset.harvest));
      if (r.error) { toast(r.error); return; }
      const parts = Object.entries(r.yield)
        .map(([k, v]) => `${k === 'herb' ? '灵草' : k === 'core' ? '妖丹' : '寒玉'} +${v}`)
        .join('、');
      game.log(`收获${r.seed.name}：${parts}`, 'l-loot');
      toast(`收获 ${parts}`, '#6fd68a');
      game.save();
      rerender();
    };
  });
}
```

- [ ] **Step 2: 把洞府拆成炼丹 / 炼器**

在 `js/ui/cave.js` 顶部删除灵田相关导入，只保留炼丹/炼器所需：

```js
import { RECIPES, BLUEPRINTS, canAfford, pay, queueAlchemy, forge, upgradeCost, upgradeChance, reroll } from '../game/crafting.js';
import { SPRITES } from '../data/sprites.js';
import { Rng } from '../engine/rng.js';
import { toast } from './modal.js';
import { itemPower } from '../game/state.js';
import { bagSize } from '../game/ascend.js';

const MAT_NAME = { iron: '玄铁', bone: '妖骨', jade: '寒玉', wood: '灵木', core: '妖丹', herb: '灵草' };
let caveTab = 'alchemy';
```

把 `renderCave` 的灵田计算、`farmHtml` 与最终 `el.innerHTML` 替换为：

```js
export function renderCave(game, el) {
  const s = game.state;
  s.alchemy = s.alchemy || [];
  s.pills = s.pills || [];
  s.mats.herb = s.mats.herb || 0;

  const queue = s.alchemy.map((job) => {
    const r = RECIPES.find((x) => x.key === job.key);
    const pct = Math.max(0, Math.min(100, (1 - job.remain / job.total) * 100));
    return `<div class="kv"><span>${r ? r.name : job.key}</span><span>${job.done ? '可收取' : Math.ceil(job.remain) + 's'}</span></div>
      <div class="bar bar-xp" style="margin:2px 0 8px"><div class="bar-track"><i style="width:${pct}%"></i></div></div>`;
  }).join('') || '<div class="muted">丹炉空着。闲得慌。</div>';

  const recipeHtml = RECIPES.map((r) => {
    const cost = { herb: r.herb, core: r.core, coin: r.coin };
    const ok = canAfford(s, cost);
    return `<div class="kv" style="align-items:center">
      <span>${r.name}<br><span class="muted" style="font-size:10px">${costText(cost)} · ${r.time}s</span></span>
      <span><button class="btn btn-sm ${ok ? 'btn-jade' : ''}" data-recipe="${r.key}" ${ok ? '' : 'disabled'}>炼制</button></span>
    </div>`;
  }).join('');

  const pillHtml = s.pills.length
    ? s.pills.map((p, i) => `<div class="kv"><span>${p.name}<br><span class="muted" style="font-size:10px">${p.quality}${p.exp ? ' · 修为 +' + p.exp : ''}</span></span>
        <span><button class="btn btn-sm" data-pill="${i}">服用</button></span></div>`).join('')
    : '<div class="muted">没有丹药。丹霞仙子会笑你。</div>';

  const blueHtml = BLUEPRINTS.map((b) => {
    const cost = { iron: b.iron || 0, bone: b.bone || 0, jade: b.jade || 0, wood: b.wood || 0, coin: b.coin };
    const ok = canAfford(s, cost);
    return `<div class="kv" style="align-items:center">
      <span>${b.name}<br><span class="muted" style="font-size:10px">${costText(cost)}</span></span>
      <span><button class="btn btn-sm ${ok ? 'btn-jade' : ''}" data-blue="${b.key}" ${ok ? '' : 'disabled'}>打造</button></span>
    </div>`;
  }).join('');

  const equipList = Object.entries(s.equip).filter(([, v]) => v).map(([slot, item]) => {
    const cost = upgradeCost(item);
    const chance = upgradeChance(item);
    return `<div class="kv" style="align-items:center">
      <span>${item.name} <span class="muted">+${item.plus || 0}</span><br>
        <span class="muted" style="font-size:10px">强化 ${Math.round(chance * 100)}% · ${costText(cost)}</span></span>
      <span>
        <button class="btn btn-sm" data-up="${slot}">强化</button>
        <button class="btn btn-sm" data-rr="${slot}">洗练</button>
      </span></div>`;
  }).join('') || '<div class="muted">身上没装备。</div>';

  el.innerHTML = `
    <div class="panel-title">洞府</div>
    <div class="tabs cave-tabs">
      <div class="tab ${caveTab === 'alchemy' ? 'on' : ''}" data-cave-tab="alchemy">炼丹</div>
      <div class="tab ${caveTab === 'forge' ? 'on' : ''}" data-cave-tab="forge">炼器</div>
    </div>
    ${caveTab === 'alchemy' ? `
      <div class="row mb8">
        <span class="muted">炼丹等级 Lv.${s.alchemyLevel || 1}</span>
      </div>
      ${queue}
      <div class="sub-title">丹方</div>
      ${recipeHtml}
      <div class="sub-title">丹药</div>
      ${pillHtml}
    ` : `
      <div class="sub-title">图纸</div>
      ${blueHtml}
      <div class="sub-title">炼器 · 强化 / 洗练</div>
      ${equipList}
    `}`;

  el.querySelectorAll('[data-cave-tab]').forEach((tab) => {
    tab.onclick = () => {
      caveTab = tab.dataset.caveTab;
      renderCave(game, el);
    };
  });

  // 其余事件绑定（[data-recipe]、[data-pill]、[data-blue]、[data-up]、[data-rr]）保持原逻辑，
  // 但把每处 renderCave(game, el) 调用保留。
}
```

删除 `js/ui/cave.js` 中原有的灵田事件绑定（`[data-pest]`、`[data-water]`、`[data-guard]`、`[data-seed]`、`[data-harvest]`），它们已经迁移到 `farm.js`。

- [ ] **Step 3: 注册灵田全屏页**

在 `js/ui/screens.js` 顶部加入：

```js
import { renderFarm } from './farm.js';
```

在 `PAGES` 的 `cave` 之后加入：

```js
  farm: { label: '灵田', render: (g, el) => renderFarm(g, el) },
```

把 `LIVE_PAGES` 改为：

```js
const LIVE_PAGES = new Set(['character', 'cave', 'sect', 'farm']);
```

- [ ] **Step 4: 验证洞府子页与灵田独立**

在 `http://127.0.0.1:8123` 执行：

```js
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('#navRail [data-nav="cave"]').click();
  await wait(100);
  const tabs = [...document.querySelectorAll('[data-cave-tab]')].map((t) => t.textContent.trim());
  const alchemyHasFarm = document.querySelector('#pageBody').textContent.includes('第 1 块');
  document.querySelector('[data-cave-tab="forge"]').click();
  await wait(50);
  const forgeHasBlueprints = document.querySelector('#pageBody').textContent.includes('图纸');
  document.querySelector('#navRail [data-nav="farm"]').click();
  await wait(100);
  return {
    tabs,
    alchemyHasFarm,
    forgeHasBlueprints,
    farmPlots: document.querySelectorAll('#pageBody [data-seed]').length,
  };
})()
```

Expected:

- `tabs` 为 `['炼丹', '炼器']`
- `alchemyHasFarm === false`
- `forgeHasBlueprints === true`
- `farmPlots >= 3`

再点战斗页右侧“洞府”页签，确认同样只有炼丹 / 炼器两个子页。

- [ ] **Step 5: 提交（用户授权后）**

```bash
git add js/ui/farm.js js/ui/cave.js js/ui/screens.js
git commit -m "feat: split cave and farm screens"
```

---

## Task 12: 概率、迁移、布局与全流程回归

**Files:**
- No production file changes unless regression finds a bug.
- Test data via browser script.

**Interfaces:**
- Consumes: 全部已实现功能。
- Produces: 通过验收的构建；若调数值，只改 `js/game/spirit_root.js`。

- [ ] **Step 1: 运行全部自动化测试**

```bash
node --test tests/*.test.mjs
```

Expected: `spirit_root`、`state`、`combat` 三组测试全部 PASS，0 failed。

- [ ] **Step 2: 语法检查全部修改文件**

```bash
node --check js/main.js
node --check js/game/state.js
node --check js/game/save.js
node --check js/game/combat.js
node --check js/game/tribulation.js
node --check js/game/crafting.js
node --check js/game/spirit_root.js
node --check js/ui/panels.js
node --check js/ui/cave.js
node --check js/ui/farm.js
node --check js/ui/screens.js
node --check js/ui/nav.js
node --check js/ui/roots.js
node --check js/ui/skills.js
node --check js/ui/layout.js
```

Expected: 全部退出码 0。

- [ ] **Step 3: 旧存档迁移回归**

在 `http://127.0.0.1:8123` 执行：

```js
(async () => {
  const { createState } = await import('./js/game/state.js');
  const s = createState({ name: '回归道友', origin: 'no-such-origin', appearance: 'swordsman' });
  s.v = 1;
  s.realm = 1;
  s.stage = 0;
  s.spiritRoots = null;
  s.settings.speed = 3;
  localStorage.setItem('shuazi_xiuxian_save_v1', JSON.stringify(s));
  location.reload();
})()
```

刷新后等待 2 秒，确认：

- 弹出“测灵根”且不可用遮罩关闭
- 点击确认后 `__game.state.spiritRoots` 非空
- `__game.state.settings.speed === 3`
- 再次刷新页面不再弹测灵根
- 导出存档文本包含 `spiritRoots` 与 `"speed":3`

- [ ] **Step 4: 炼气存档不测灵根**

```js
(async () => {
  const { createState } = await import('./js/game/state.js');
  const s = createState({ name: '炼气道友', origin: 'no-such-origin', appearance: 'swordsman' });
  s.realm = 0; s.stage = 3; s.spiritRoots = null; s.settings.speed = 3;
  localStorage.setItem('shuazi_xiuxian_save_v1', JSON.stringify(s));
  location.reload();
})()
```

刷新后确认：

- 没有测灵根弹窗
- `__game.state.settings.speed === 2`（被 `maxSpeed` 钳制）
- 角色页灵根区显示“灵根未测，筑基后开启。”

- [ ] **Step 5: 倍速与后台战斗回归**

在战斗页执行：

```js
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const g = window.__game;
  g.state.realm = 1;
  g.state.settings.speed = 3;
  g.state.alchemy = [{ key: 'juqi', remain: 100, total: 100, quality: null }];
  const c0 = g.combat.clock;
  const a0 = g.state.alchemy[0].remain;
  await wait(1000);
  const battle = g.combat.clock - c0;
  const alchemy = a0 - g.state.alchemy[0].remain;
  const kills0 = g.state.stats.kills;
  document.querySelector('#navRail [data-nav="sect"]').click();
  await wait(1500);
  const kills1 = g.state.stats.kills;
  document.querySelector('#navRail [data-nav="battle"]').click();
  return {
    battle: +battle.toFixed(2),
    alchemy: +alchemy.toFixed(2),
    backgroundKills: kills1 - kills0,
  };
})()
```

Expected:

- `battle` 约 3
- `alchemy` 约 1
- `backgroundKills >= 1`

- [ ] **Step 6: 五种灵根触发回归**

把下列脚本依次替换 `elem` 为 `metal / wood / water / fire / earth` 执行：

```js
(() => {
  const g = window.__game;
  const elem = 'fire';
  g.state.realm = 1;
  g.state.spiritRoots = {
    v: 1, testedAt: 1, heavenly: false,
    roots: [{ elem, grade: 3 }],
  };
  g.combat.refreshRoots();
  g.recompute();
  const e = g.combat.enemies.find((x) => !x.dead);
  if (!e) return { elem, noEnemy: true };
  const hp0 = e.hp;
  g.combat._afterHeroDamage(e, 100);
  return {
    elem,
    proc: g.combat.rootProcs[0],
    burn: !!e.burn,
    slowed: g.combat.clock < (e.slowUntil || 0),
    stunned: g.combat.clock < (e.stunUntil || 0),
    shield: g.combat.hero.shield,
    damaged: e.hp < hp0 || e.dead,
  };
})()
```

Expected：

- `metal`：`damaged === true`，飘字出现“裂金”
- `wood`：英雄回血，出现“回春”
- `water`：`slowed === true`
- `fire`：`burn === true`
- `earth`：`stunned === true` 且 `shield > 0`

Boss 层（`__game.setFloor(10)` 等）确认减速与眩晕持续时间减半。

- [ ] **Step 7: 布局回归**

打开：

- `http://127.0.0.1:8123/dev/preview.html?w=1440&h=900`
- `http://127.0.0.1:8123/dev/preview.html?w=1024&h=768`
- `http://127.0.0.1:8123/dev/mobile.html`

逐项确认：

- 桌面：导航不遮挡顶栏；战斗页三栏不溢出；全屏页最大宽度居中。
- 1024×768：战斗页仍为三栏；导航 64px；技能栏速度按钮可见。
- 竖屏 393×852：底部 6 个入口；技能栏在底栏上方；页面可滚动；modal 完整可见。
- 横屏 852×390：战场、技能栏、底部导航、Boss 血条互不遮挡。
- 触屏物品详情底部弹层仍能打开。
- 控制台无报错。

- [ ] **Step 8: 全功能冒烟**

依次走通并确认无报错：

1. 新角色创建 → 战斗 → 掉落入包 → 自动装备 / 自动分解。
2. 洞府炼丹 → 收取 → 服丹；炼器打造 → 强化 → 洗练。
3. 灵田种植 → 浇灌 → 除虫 → 派守 → 收获。
4. 宗门赠礼 / 任务 / 道侣对话。
5. 秘境跳层 → Boss → 自动进阶开关。
6. 法宝觉醒 → 词缀吸收 → 器灵故事。
7. 渡劫成功 → 测灵根 → 角色页查看灵根。
8. 洗髓丹取消不扣丹；重测灵根与重铸词缀都能消耗。
9. 设置里切换 1/2/3 倍速；导出、导入、刷新后灵根与速度保留。
10. 技能 1/2/3 与空格暂停在战斗页正常，输入框内不误触。

- [ ] **Step 9: 数值调优（仅当实测明显失衡时）**

只允许改 `js/game/spirit_root.js` 的以下数值，不改结构：

- `ELEMENT_META[*].bonus`：元素基础属性
- `getRootProcs` 中的冷却、概率、倍率
- `HEAVENLY_STAT_MULT`：天灵根属性倍率

调整后重新运行：

```bash
node --test tests/*.test.mjs
```

Expected: 全部 PASS。若调了概率，必须同步更新 `tests/spirit_root.test.mjs` 的期望值与 `docs/superpowers/specs/2026-10-25-screens-speed-spirit-roots-design.md` 的对应数值。

- [ ] **Step 10: 最终提交（用户授权后）**

```bash
git add -A
git commit -m "feat: ship screens, battle speed and spirit roots"
```

---

## 自检结果

**1. 规格覆盖**

- 9 个界面与导航：Task 4（桌面）、Task 5（移动 + 更多）、Task 11（灵田独立）。
- 原战斗页三栏保留、后台战斗：Task 4。
- 1/2/3 倍速、解锁、真实时间隔离：Task 6。
- 筑基测灵根、旧档补测、排队避免 modal 叠加：Task 8。
- 五行/天灵根概率、品阶、属性：Task 1、Task 2。
- 战斗触发、状态、护盾、Boss 控制减半、统一伤害入口：Task 7。
- 元素颜色、粒子/飘字、天灵根光环：Task 9。
- 角色页灵根区：Task 8。
- 洗髓丹重测与取消不消耗：Task 10。
- 存档 v2、key 不变、导出导入：Task 2、Task 8、Task 12。
- 布局与回归：Task 5、Task 12。

**2. 占位符扫描**

计划中没有 `TBD`、`TODO`、`稍后实现`。所有新增函数都给出了完整实现或完整的替换代码。

**3. 类型一致性**

- 灵根结构在 Task 1、2、7、8、10 中统一为 `{ v, testedAt, heavenly, roots: [{ elem, grade }] }`。
- `rootBonus` 返回的键与 `deriveStats` 使用的键一致：`atkPct / hpPct / defPct / crit / critDmg / aspd / lifesteal / pierce`。
- `getRootProcs` 的 `kind` 只有 `hit | periodic`，Task 7 与 Task 9 都按这两个值分支。
- `Combat.refreshRoots` 在 Task 7 定义，Task 8 的排队与 Task 10 的重测都调用同一个方法。
- `settings.speed` 只在 `setSpeed`、`normalizeState`、`checkSpeedUnlock` 三处写入，避免分散。
- `markPanelsDirty` 的钩子在 Task 3 定义，Task 4 的 `screens.js` 注册，命名一致。
