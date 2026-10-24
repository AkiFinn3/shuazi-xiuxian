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
  // fixed 序列下 shuffle 结果前两位为 wood/water（对应设计文档 6.3 的洗牌规则）
  assert.deepEqual(roots.roots.map((r) => r.elem), ['wood', 'water']);
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
  // 水天品基础 18 + 4*3 = 30，天灵根 +8 个百分点后 38，未触及 50% 上限（设计文档 6.5）
  assert.equal(heaven.chance, 38);
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
