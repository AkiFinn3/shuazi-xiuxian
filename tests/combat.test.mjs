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
    slowUntil: 0, slowPct: 0, stunUntil: 0, burn: null,
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
