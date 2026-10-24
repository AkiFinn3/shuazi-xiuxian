// 战斗：自动战斗、波次、Boss、伤害结算
import { VIEW, CHAPTERS, MOBS, BOSSES, BALANCE } from '../data/config.js';
import { Anim } from '../engine/anim.js';
import { drawScene } from './scene.js';
import { SKILLS, isUnlocked } from './skills.js';
import { getRootProcs, primaryElement } from './spirit_root.js';

const WAVES_PER_FLOOR = 4;
const HERO_X = 120;
const ATTACK_RANGE = 66;
const ENEMY_RANGE = 48;

export class Combat {
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

  refreshRoots(roots = this.game.state.spiritRoots) {
    this.rootProcs = getRootProcs(roots);
    this.rootPrimary = primaryElement(roots);
    this.rootHeavenly = !!(roots && roots.heavenly);
    this.rootCd = {};
    for (const p of this.rootProcs) {
      if (p.kind === 'periodic') this.rootCd[p.elem] = p.cd;
    }
  }

  _buildHeroAnims() {
    const key = this.game.state.appearance;
    this.hero.anims = {
      idle: new Anim(`hero/${key}_idle`),
      walk: new Anim(`hero/${key}_walk`),
      attack: new Anim(`hero/${key}_attack`),
      combo1: new Anim(`hero/${key}_combo1`),
      combo2: new Anim(`hero/${key}_combo2`),
      hurt: new Anim(`hero/${key}_hurt`),
      death: new Anim(`hero/${key}_death`),
    };
    this.hero.anims.dead = this.hero.anims.death;
  }

  _buildSkills() {
    this.skillCds = SKILLS.map(() => 0);
    this.buff = { aspdUntil: 0, aspdMult: 1 };
  }

  /** 施放技能 */
  _castSkill(index) {
    const s = SKILLS[index];
    const g = this.game;
    const stats = g.stats;
    const enemies = this.enemies.filter((e) => !e.dead);
    if (!enemies.length) return;

    if (s.key === 'sword') {
      for (const e of enemies) {
        this._skillDamage(e, stats.atk * 2.2, s.color, false);
      }
      g.fx.addShake(3);
      g.audio.crit();
    } else if (s.key === 'fly') {
      const target = this._nearestEnemy();
      if (target) this._skillDamage(target, stats.atk * 1.2, s.color, false);
      this.buff.aspdUntil = this.clock + 8;
      this.buff.aspdMult = 1.6;
      g.log('御剑术：手中剑化作流光，攻速大增。', 'l-good');
    } else if (s.key === 'thunder') {
      const target = enemies.slice().sort((a, b) => b.hp - a.hp)[0];
      this._skillDamage(target, stats.atk * 6, s.color, true);
      g.fx.addFlash('190,170,255', 0.35);
      g.fx.addShake(6);
      g.fx.spark(target.x, target.y - 40, s.color, 22, 120);
      g.audio.thunder();
    }
  }

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

  _skillDamage(target, amount, color, big) {
    const g = this.game;
    const final = this._mitigateRaw(target, amount * (0.9 + Math.random() * 0.2));
    const applied = this._applyDamage(target, final, { crit: big, color });
    g.fx.spark(target.x, target.y - 30, color || '#ffe0b0', big ? 14 : 6);
    this._afterHeroDamage(target, applied);
  }

  _updateSkills(dt) {
    const state = this.game.state;
    const fate = state.fate;
    const cdMult = fate && fate.unlocked && fate.tier >= 2 ? 0.9 : 1;
    for (let i = 0; i < SKILLS.length; i++) {
      this.skillCds[i] = Math.max(0, this.skillCds[i] - dt);
      const s = SKILLS[i];
      if (this.skillCds[i] <= 0 && isUnlocked(s, state) && this.enemies.some((e) => !e.dead)) {
        this.skillCds[i] = s.cd * cdMult;
        this._castSkill(i);
      }
    }
  }

  get floor() { return this.game.state.floor; }

  chapterIndex() {
    return Math.floor((this.floor - 1) / 10);
  }

  isBossFloor() {
    return this.floor % BALANCE.bossEvery === 0;
  }

  /* ---------------- 更新 ---------------- */
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

    // 回血（挂机友好）
    if (state.settings.autoBattle) {
      state.hp = Math.min(stats.maxHp, state.hp + stats.maxHp * 0.04 * dt);
    }
    this.hero.hp = state.hp;
    this.hero.flash = Math.max(0, this.hero.flash - dt * 4);
    this.hero.invuln = Math.max(0, (this.hero.invuln || 0) - dt);

    if (!state.settings.autoBattle) {
      this._updateHeroAnim(dt, true);
      this._updateEnemies(dt, true);
      return;
    }

    this._spawnLogic(dt);
    this._updateHero(dt);
    this._updateEnemies(dt);
    this._updateSkills(dt);

    // 一波清空 -> 推进
    if (this.waveActive && this.enemies.length === 0) {
      this.waveActive = false;
      this.onWaveCleared();
    }
  }

  _updateDeath(dt) {
    this.reviveTimer -= dt;
    this.hero.anims.death.update(dt);
    for (const e of this.enemies) e.anim.update(dt);
    if (this.reviveTimer <= 0) {
      const state = this.game.state;
      state.hp = this.game.stats.maxHp;
      this.hero.hp = state.hp;
      this.hero.dead = false;
      this.hero.state = 'idle';
      this.hero.invuln = 2;   // 复活保护
      this.hero.shield = 0;
      this.hero.shieldUntil = 0;
      this.hero.anims.death.reset();
      this.enemies.length = 0;
      this.boss = null;
      this.wavesDone = 0;
      this.waveActive = false;
      this.waveTimer = 1.5;
      this.game.log('你睁开眼，爬起来，接着刷。', 'l-good');
    }
  }

  _spawnLogic(dt) {
    if (this.enemies.length > 0) return;
    this.waveTimer -= dt;
    if (this.waveTimer > 0) return;

    const floor = this.floor;
    const chapter = CHAPTERS[this.chapterIndex() % CHAPTERS.length];

    if (this.isBossFloor() && !this._bossDefeated) {
      this._spawnBoss(chapter);
      this.waveActive = true;
    } else {
      const count = BALANCE.waveSize[0] + Math.floor(Math.random() * (BALANCE.waveSize[1] - BALANCE.waveSize[0] + 1));
      for (let i = 0; i < count; i++) this._spawnMob(chapter);
      this.waveActive = true;
      this.waveTimer = 0.8;
    }
  }

  _bossDefeated = false;

  _spawnMob(chapter) {
    const type = chapter.mobs[Math.floor(Math.random() * chapter.mobs.length)];
    const def = MOBS[type];
    if (!def) return;
    const floor = this.floor;
    const g = Math.pow(BALANCE.enemyHpGrowth, floor - 1);
    const aG = Math.pow(BALANCE.enemyAtkGrowth, floor - 1);
    const maxHp = Math.round(def.hp * g);
    const x = VIEW.w - 30 - Math.random() * 90 + this.enemies.length * 46;
    const anims = {
      idle: new Anim(`mob/${type}_idle`),
      move: new Anim(`mob/${type}_move`),
      attack: new Anim(`mob/${type}_attack`),
      hurt: new Anim(`mob/${type}_hurt`),
      death: new Anim(`mob/${type}_death`),
    };
    this.enemies.push({
      type, def, anims, anim: anims.idle, state: 'idle',
      x, y: VIEW.ground - (def.flying ? 22 : 0),
      hp: maxHp, maxHp,
      atk: def.atk * aG,
      defense: def.def + floor * 0.35,
      exp: def.exp * Math.pow(BALANCE.enemyExpGrowth, floor - 1),
      coin: def.coin * Math.pow(BALANCE.enemyCoinGrowth, floor - 1),
      speed: def.speed,
      scale: def.scale,
      facing: -1,
      attackCd: 0.6 + Math.random() * 0.8,
      hitTimer: 0,
      flash: 0,
      dead: false,
      isBoss: false,
      slowUntil: 0,
      slowPct: 0,
      stunUntil: 0,
      burn: null,
    });
  }

  _spawnBoss(chapter) {
    const type = chapter.boss;
    const def = BOSSES[type];
    const chapterIdx = this.chapterIndex();
    const mult = Math.pow(1.85, chapterIdx);
    const maxHp = Math.round(def.hp * mult);
    const anims = {
      idle: new Anim(`boss/${type}_idle`),
      move: new Anim(`boss/${type}_move`),
      attack: new Anim(`boss/${type}_attack_a`),
      hurt: new Anim(`boss/${type}_hurt`),
      death: new Anim(`boss/${type}_death`),
    };
    const boss = {
      type, def, anims, anim: anims.idle, state: 'idle',
      x: VIEW.w - 90, y: VIEW.ground,
      hp: maxHp, maxHp,
      atk: def.atk * mult * 0.9,
      defense: def.def + chapterIdx * 3,
      exp: def.exp * Math.pow(2.1, chapterIdx),
      coin: def.coin * Math.pow(2.0, chapterIdx),
      speed: 22, scale: def.scale, facing: -1,
      attackCd: 1.6, hitTimer: 0, flash: 0, dead: false, isBoss: true,
      slowUntil: 0, slowPct: 0, stunUntil: 0, burn: null,
    };
    this.enemies.push(boss);
    this.boss = boss;
    // 随从
    for (let i = 0; i < 2; i++) this._spawnMob(chapter);
    this.game.log(`【${def.name}】挡在第 ${this.floor} 层！`, 'l-bad');
    this.game.audio.thunder();
  }

  /* ---------------- 主角 ---------------- */
  _updateHero(dt) {
    const hero = this.hero;
    const g = this.game;
    const stats = g.stats;

    hero.attackCd -= dt;
    if (hero.hitTimer > 0) {
      hero.hitTimer -= dt;
      if (hero.hitTimer <= 0) this._heroHit();
    }

    const target = this._nearestEnemy();
    if (!target) {
      hero.state = 'idle';
      this._updateHeroAnim(dt, false);
      return;
    }

    const dx = target.x - hero.x;
    hero.facing = dx >= 0 ? 1 : -1;

    if (Math.abs(dx) > ATTACK_RANGE) {
      hero.state = 'walk';
      hero.x += Math.sign(dx) * 78 * dt;
      hero.x = Math.max(30, Math.min(VIEW.w - 30, hero.x));
    } else {
      hero.state = 'attack';
      if (hero.attackCd <= 0) {
        const buffed = this.clock < this.buff.aspdUntil ? this.buff.aspdMult : 1;
        hero.attackCd = 1 / Math.max(0.2, stats.aspd * buffed);
        hero.combo = (hero.combo + 1) % 3;
        const anim = hero.combo === 0 ? hero.anims.attack : hero.anims['combo' + hero.combo];
        anim.reset();
        hero.currentAnim = anim;
        hero.hitTimer = 0.22;
        g.audio.hit(0.7);
      }
    }
    this._updateHeroAnim(dt, false);
  }

  _updateHeroAnim(dt, idleOnly) {
    const hero = this.hero;
    if (hero.state === 'attack' && hero.currentAnim) {
      hero.currentAnim.update(dt);
      if (hero.currentAnim.done) {
        hero.currentAnim = null;
        if (hero.state === 'attack') hero.state = 'idle';
      }
      return;
    }
    const anim = hero.anims[hero.state] || hero.anims.idle;
    anim.update(dt);
  }

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

  _nearestEnemy() {
    let best = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.abs(e.x - this.hero.x);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

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

  /* ---------------- 敌人 ---------------- */
  _updateEnemies(dt, passive) {
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

  /* ---------------- 波次推进 ---------------- */
  onWaveCleared() {
    const g = this.game;
    const st = g.state;
    if (st.fate && st.fate.unlocked && st.fate.tier >= 4) {
      st.hp = Math.min(g.stats.maxHp, st.hp + g.stats.maxHp * 0.03);
      this.hero.hp = st.hp;
    }
    this.wavesDone++;
    this.waveTimer = 0.7;
    if (this._bossDefeated) {
      this._bossDefeated = false;
      this.advanceFloor();
      this.boss = null;
      return;
    }
    if (this.wavesDone >= WAVES_PER_FLOOR) {
      this.wavesDone = 0;
      this.advanceFloor();
    }
  }

  advanceFloor() {
    const g = this.game;
    const auto = g.state.settings.autoAdvance !== false;
    if (auto) {
      g.state.floor += 1;
      g.state.bestFloor = Math.max(g.state.bestFloor, g.state.floor);
      g.onFloorChanged(g.state.floor);
    } else {
      // 挂机刷层：留在当前层继续刷
      this.wavesDone = 0;
      this.waveTimer = 0.6;
    }
  }

  /* ---------------- 绘制 ---------------- */
  draw(ctx) {
    const chapter = CHAPTERS[this.chapterIndex() % CHAPTERS.length];
    drawScene(ctx, this.chapterIndex(), this.scroll);

    // 敌人（按 y 排序）
    const list = this.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of list) {
      this._drawEnemy(ctx, e);
    }
    this._drawHero(ctx);
    this.game.fx.draw(ctx);

    if (this.boss && !this.boss.dead) this._drawBossBar(ctx);
  }

  _drawShadow(ctx, x, y, w) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w, w * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawHero(ctx) {
    const hero = this.hero;
    this._drawShadow(ctx, hero.x, hero.y, 20);
    const anim = hero.state === 'attack' && hero.currentAnim ? hero.currentAnim
      : (hero.anims[hero.state] || hero.anims.idle);
    anim.draw(ctx, hero.x, hero.y, {
      flip: hero.facing < 0,
      flash: hero.flash,
    });
  }

  _drawEnemy(ctx, e) {
    const anim = e.anim;
    this._drawShadow(ctx, e.x, e.y, 18 * e.scale);
    anim.draw(ctx, e.x, e.y, {
      flip: e.facing > 0,
      flash: e.flash,
      scale: e.scale,
    });
    if (!e.dead && e.hp < e.maxHp) {
      const w = e.isBoss ? 46 : 30;
      const y = e.y - (e.isBoss ? 96 : 62 * e.scale);
      ctx.fillStyle = 'rgba(0,0,0,.65)';
      ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 6);
      ctx.fillStyle = '#e0574f';
      ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  }

  _drawBossBar(ctx) {
    const b = this.boss;
    const w = 320;
    const x = (VIEW.w - w) / 2;
    // 横屏顶栏浮在画布上，Boss 血条下移让出位置
    const mobileLandscape = matchMedia('(max-height: 560px) and (orientation: landscape)').matches;
    const y = mobileLandscape ? 56 : 14;
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,12,.78)';
    ctx.fillRect(x - 3, y - 3, w + 6, 18);
    ctx.strokeStyle = '#3b4763';
    ctx.strokeRect(x - 3.5, y - 3.5, w + 7, 19);
    ctx.fillStyle = '#8a2f2c';
    ctx.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 12);
    ctx.fillStyle = '#e0574f';
    ctx.fillRect(x, y, w * Math.max(0, b.hp / b.maxHp), 6);
    ctx.fillStyle = '#e6ecf5';
    ctx.font = '12px FusionPixel, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${b.def.name}  ${Math.ceil(b.hp)}/${b.maxHp}`, VIEW.w / 2, y + 11);
    ctx.restore();
  }
}

export { WAVES_PER_FLOOR };
