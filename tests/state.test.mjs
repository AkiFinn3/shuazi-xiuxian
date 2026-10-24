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
