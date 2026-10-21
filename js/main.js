// 主控制器：把引擎、战斗、界面串起来
import { Loop } from './engine/loop.js';
import { Fx } from './engine/fx.js';
import { Rng } from './engine/rng.js';
import { audio } from './engine/audio.js';
import { VIEW, BALANCE, RARITIES, CHAPTERS, REALMS, SLOTS } from './data/config.js';
import { createState, deriveStats, addExp, healFull, realmLabel, normalizeState } from './game/state.js';
import { Combat } from './game/combat.js';
import { rollItem, rarityIndex, isBetter, salvageValue } from './game/loot.js';
import { tickAlchemy, finishAlchemy, reroll } from './game/crafting.js';
import { saveGame, loadGame, clearGame, exportSave, importSave, offlineReward } from './game/save.js';
import { doTribulation } from './game/tribulation.js';
import { addFateExp, FATE_TYPES, FATE_TIERS, spiritLine } from './game/fate.js';
import { ensureQuests, count as countQuest, dayKey } from './game/quests.js';
import { randomEvent } from './data/events.js';
import { checkAchievements } from './data/achievements.js';
import { FATE_STORIES, storyUnlocked } from './data/fate_stories.js';
import { showFateStory } from './ui/fate_story.js';
import { bagSize, canAscend } from './game/ascend.js';
import { showEvent } from './ui/events.js';
import { nameReactions } from './game/easter.js';
import { openModal, closeModal, toast } from './ui/modal.js';
import { openCreation } from './ui/creation.js';
import { initHud, refreshHud } from './ui/hud.js';
import { buildPanels, refreshPanels, currentTab, isTouch } from './ui/panels.js';
import { buildSkillBar, refreshSkillBar } from './ui/skills.js';
import { logLine } from './ui/log.js';
import { DEATH_QUIPS, QUIPS } from './data/names.js';

class Game {
  constructor() {
    this.state = null;
    this.stats = null;
    this.fx = new Fx();
    this.rng = new Rng();
    this.audio = audio;
    this.combat = null;
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.saveTimer = 0;
    this.hudTimer = 0;
    this.quipTimer = 0;
    this.paused = false;
    this.loop = new Loop((dt) => this.update(dt), () => this.render());
  }

  /* ---------------- 启动 ---------------- */
  async boot() {
    const saved = loadGame();
    if (saved) {
      this.startGame(saved);
      const reward = offlineReward(saved);
      if (reward) this.showOfflineReport(reward);
    } else {
      openCreation((cfg) => {
        const state = createState(cfg);
        this.startGame(state);
        saveGame(state);
        const reaction = nameReactions(cfg.name)[0];
        logLine(`【${cfg.name}】正式踏上刷子之路。`, 'l-good');
        if (reaction) logLine(reaction, 'l-dim');
        logLine('提示：右下角可以随时开关自动战斗。', 'l-dim');
      });
    }
  }

  startGame(state) {
    this.state = normalizeState(state);
    ensureQuests(this.state);
    this.stats = deriveStats(state);
    this.rng = new Rng(Date.now() & 0xffffffff);
    this.combat = new Combat(this);
    document.getElementById('app').hidden = false;
    initHud(this);
    buildPanels(this);
    buildSkillBar(this);
    this.bindUi();
    this.loop.start();
    logLine(`${state.name} 来到青云山脚。`, 'l-good');
  }

  bindUi() {
    const s = this.state;
    const tgl = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.checked = !!s.settings[key];
      el.onchange = () => {
        s.settings[key] = el.checked;
        this.save();
      };
    };
    tgl('tglAutoBattle', 'autoBattle');
    tgl('tglAutoPick', 'autoPick');
    tgl('tglAutoSalvage', 'autoSalvage');

    document.getElementById('btnSettings').onclick = () => this.showSettings();
    document.getElementById('btnHelp').onclick = () => this.showHelp();

    // 触屏：点画面暂停/继续
    this.canvas.addEventListener('click', () => {
      if (!isTouch()) return;
      s.settings.autoBattle = !s.settings.autoBattle;
      const tgl = document.getElementById('tglAutoBattle');
      if (tgl) tgl.checked = s.settings.autoBattle;
      this.log(`自动战斗 ${s.settings.autoBattle ? '开启' : '暂停'}`, 'l-dim');
      this.save();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !document.getElementById('modalRoot').hidden === false) return;
      if (e.code === 'Space') {
        e.preventDefault();
        s.settings.autoBattle = !s.settings.autoBattle;
        document.getElementById('tglAutoBattle').checked = s.settings.autoBattle;
        this.log(`自动战斗 ${s.settings.autoBattle ? '开启' : '暂停'}`, 'l-dim');
        this.save();
      }
    });
  }

  /* ---------------- 循环 ---------------- */
  update(dt) {
    if (!this.state) return;
    this.state.stats.playtime += dt;

    // 任务计数
    countQuest(this.state, 'online', dt);
    this.questCheckTimer = (this.questCheckTimer || 0) + dt;
    if (this.questCheckTimer > 5) {
      this.questCheckTimer = 0;
      if (this.state.questDay !== dayKey()) {
        ensureQuests(this.state);
        this.log('新的一天，今日任务已刷新。', 'l-good');
      }
    }

    // 随机事件
    this.eventTimer = (this.eventTimer || 120) + dt;
    if (this.eventTimer > 200) {
      this.eventTimer = 0;
      if (!this.paused && document.getElementById('modalRoot').hidden) {
        const ev = randomEvent();
        this.log(`路上遇到「${ev.title}」。`, 'l-dim');
        showEvent(this, ev);
      }
    }

    if (this.combat && !this.paused) this.combat.update(dt);
    else if (this.paused) this.fx.update(dt);

    this.saveTimer += dt;
    if (this.saveTimer > 10) {
      this.saveTimer = 0;
      this.save();
    }

    this.hudTimer += dt;
    if (this.hudTimer > 0.15) {
      this.hudTimer = 0;
      this.recompute();
      refreshHud();
      refreshSkillBar();
    }

    // 器灵小故事
    this.storyTimer = (this.storyTimer || 0) + dt;
    if (this.storyTimer > 2) {
      this.storyTimer = 0;
      const stories = this.state.fateStories = this.state.fateStories || {};
      for (const st of FATE_STORIES) {
        if (stories[st.id]) continue;
        if (storyUnlocked(this.state, st)) {
          stories[st.id] = Date.now();
          if (!this.paused && document.getElementById('modalRoot').hidden) {
            this.log(`器灵手记：${st.title}`, 'l-dim');
            showFateStory(this, st);
          }
        }
      }
    }

    // 洞府面板定时刷新（灵田成熟、丹炉倒计时）
    this.panelTimer = (this.panelTimer || 0) + dt;
    if (this.panelTimer > 4) {
      this.panelTimer = 0;
      if (currentTab() === 'cave' && document.getElementById('modalRoot').hidden) {
        refreshPanels();
      }
    }

    // 成就检查
    this.achTimer = (this.achTimer || 0) + dt;
    if (this.achTimer > 1) {
      this.achTimer = 0;
      for (const a of checkAchievements(this.state)) {
        this.log(`成就达成【${a.name}】，称号「${a.title}」`, 'l-loot');
        toast(`成就：${a.name} · ${a.title}`, '#e8c46a');
        this.audio.fanfare();
        if (!this.state.title) this.state.title = a.title;
      }
    }

    // 丹炉
    if (!this.paused) {
      const done = tickAlchemy(this.state, dt);
      for (const job of done) {
        const pill = finishAlchemy(this.state, job, this.rng);
        this.state.alchemy = this.state.alchemy.filter((j) => j !== job);
        countQuest(this.state, 'craft');
        this.state.stats.craft = (this.state.stats.craft || 0) + 1;
        this.log(`丹炉开盖：${pill.quality}${pill.name}。`, 'l-good');
        toast(`炼成 ${pill.quality}${pill.name}`, '#6fd68a');
        this.audio.loot(2);
        this.state.alchemyLevel = (this.state.alchemyLevel || 1) + (job.qualityIndex === 3 ? 1 : 0.35);
      }
    }

    this.quipTimer += dt;
    if (this.quipTimer > 95) {
      this.quipTimer = 0;
      const spirit = spiritLine(this.state);
      if (spirit) {
        this.log(`【器灵】${spirit}`, 'l-good');
      } else {
        const minutes = Math.floor(this.state.stats.playtime / 60);
        const q = QUIPS[Math.floor(Math.random() * QUIPS.length)];
        this.log(q.replace('{min}', minutes).replace('{rarity}', '装备').replace('{n}', String(this.state.stats.drops)), 'l-dim');
      }
    }
  }

  render() {
    if (!this.state || !this.combat) return;
    const ctx = this.ctx;
    const off = this.fx.offset();
    ctx.save();
    ctx.translate(Math.round(off.x), Math.round(off.y));
    this.combat.draw(ctx);
    ctx.restore();

    if (this.fx.flash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(${this.fx.flashColor},${this.fx.flash * 0.5})`;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.restore();
    }
  }

  /* ---------------- 战斗回调 ---------------- */
  onEnemyKilled(enemy) {
    const s = this.state;
    const stats = this.stats;
    s.stats.kills++;
    countQuest(s, 'kills');
    if (enemy.isBoss) countQuest(s, 'boss');

    // 修为
    const res = addExp(s, enemy.exp);
    for (const lv of res.levels) {
      this.log(`修为精进：${lv.label}`, 'l-good');
      this.audio.fanfare();
    }
    if (res.realmUp) {
      this.log(`境界突破！${realmLabel(s)}`, 'l-good');
      this.fx.addFlash('255,220,150', 0.6);
      this.audio.fanfare();
      toast(`突破！${realmLabel(s)}`, '#e8c46a');
    }
    if (res.tribulation) {
      this.log(`天劫将至，需渡劫方可踏入${REALMS[res.tribulation].name}期。`, 'l-bad');
      this.audio.thunder();
      doTribulation(this, res.tribulation);
    }
    if (res.blocked) {
      const need = REALMS[s.realm + 1] ? REALMS[s.realm + 1].need : 0;
      this.log(`境界遇到瓶颈，需要通关第 ${need} 层。`, 'l-dim');
    }

    // 灵石
    const coin = Math.floor(enemy.coin * (1 + stats.coinPct / 100));
    s.coin += coin;
    s.stats.stone += coin;

    // 材料掉落
    if (Math.random() < 0.34) {
      s.mats.herb = (s.mats.herb || 0) + 1;
    }
    if (Math.random() < 0.08) {
      s.mats.core = (s.mats.core || 0) + 1;
    }

    // 本命法宝：器灵随杀敌成长
    if (s.fate && s.fate.unlocked) {
      const r = addFateExp(s, 1 + Math.floor(enemy.exp * 0.02));
      if (r) {
        if (r.tierUp) {
          this.log(`【${FATE_TYPES[s.fate.type].name}】进化为「${FATE_TIERS[r.tier - 1].name}」！`, 'l-loot');
          this.fx.addFlash('255,230,170', 0.5);
          this.audio.fanfare();
          toast('本命法宝进化！', '#ffb347');
        } else if (r.levelUp) {
          this.log(`器灵等级提升：Lv.${r.level}`, 'l-good');
        }
      }
    }

    // 掉落
    const dropRate = BALANCE.dropChance * (1 + stats.luck * 0.008);
    if (Math.random() < dropRate) {
      const item = rollItem(this.rng, s.floor, stats.luck);
      s.stats.drops++;
      countQuest(s, 'drops');
      this.handleDrop(item, enemy);
    }
  }

  handleDrop(item, enemy) {
    const s = this.state;
    const rarity = RARITIES[rarityIndex(item.rarity)];
    const rIdx = rarityIndex(item.rarity);
    if (rIdx > (s.bestRarity || 0)) s.bestRarity = rIdx;
    this.fx.beam(enemy.x, enemy.y - 4, rIdx);

    const eq = s.equip[item.slot];
    if (isBetter(item, eq, 1.02)) {
      // 自动换装
      if (eq) {
        if (s.settings.autoSalvage && this.belowSalvageLevel(eq)) this.salvageItem(eq.id, true);
        else s.bag.push(eq);
      }
      s.equip[item.slot] = item;
      this.log(`自动装备：${rarity.color === '#b9c0cc' ? '' : ''}[${rarity.name}] ${item.name}`, 'l-loot');
      this.audio.loot(rIdx);
    } else if (s.settings.autoSalvage && this.belowSalvageLevel(item) && !isBetter(item, eq, 1.0)) {
      this.salvageItem(item.id, false);
    } else if (s.bag.length >= bagSize(s)) {
      this.salvageItem(item.id, true);
      this.log('背包满了，只能分解。', 'l-dim');
    } else {
      s.bag.push(item);
      this.log(`获得 [${rarity.name}] ${item.name}`, 'l-loot');
      if (rIdx >= 3) {
        this.audio.loot(rIdx);
        toast(`获得 ${rarity.name}：${item.name}`, rarity.color);
      }
    }
    this.recompute();
  }

  belowSalvageLevel(item) {
    const threshold = rarityIndex(this.state.settings.autoSalvageBelow);
    return rarityIndex(item.rarity) <= threshold;
  }

  onPlayerDeath() {
    const s = this.state;
    s.stats.deaths++;
    this.combat.reviveTimer = BALANCE.reviveTime;
    this.combat.hero.state = 'dead';
    this.combat.hero.anims.death.reset();
    this.log(DEATH_QUIPS[Math.floor(Math.random() * DEATH_QUIPS.length)], 'l-bad');
    this.audio.thunder();
  }

  onFloorChanged(floor) {
    const chapter = CHAPTERS[Math.floor((floor - 1) / 10) % CHAPTERS.length];
    this.log(`进入第 ${floor} 层 · ${chapter.name}`, 'l-good');
    if (floor % BALANCE.bossEvery === 0) {
      this.log('前方有守关者，谨慎。', 'l-bad');
    }
  }

  /* ---------------- 丹药 ---------------- */
  usePill(pill) {
    const s = this.state;
    const now = Date.now();
    s.buffs = s.buffs || {};
    if (pill.effect.exp) {
      const res = addExp(s, pill.exp);
      for (const lv of res.levels) this.log(`修为精进：${lv.label}`, 'l-good');
      if (res.tribulation) {
        this.log('天劫将至。', 'l-bad');
        doTribulation(this, res.tribulation);
      }
    }
    if (pill.effect.atkPct) {
      s.buffs.atkUntil = now + (pill.effect.duration || 900) * 1000;
      s.buffs.atkPct = pill.effect.atkPct;
    }
    if (pill.effect.luck) {
      s.buffs.luckUntil = now + (pill.effect.duration || 900) * 1000;
      s.buffs.luck = pill.effect.luck;
    }
    if (pill.effect.reroll) {
      const item = Object.values(s.equip).find((i) => i && Object.keys(i.affixes || {}).length);
      if (item) {
        const before = JSON.stringify(item.affixes);
        reroll(item, this.rng);
        if (before !== JSON.stringify(item.affixes)) {
          this.log(`洗髓丹生效：${item.name} 词缀已变。`, 'l-loot');
        }
      }
    }
    this.recompute();
    this.log(`服下 ${pill.quality}${pill.name}。`, 'l-good');
    toast(`服用 ${pill.name}（${pill.quality}）`, '#6fd68a');
  }

  /* ---------------- 任务计数 ---------------- */
  countQuest(type, n = 1) {
    if (this.state) countQuest(this.state, type, n);
  }

  /* ---------------- 秘境 ---------------- */
  setFloor(floor) {
    const s = this.state;
    const max = (s.bestFloor || 0) + 1;
    const target = Math.max(1, Math.min(max, Math.floor(floor)));
    s.floor = target;
    if (this.combat) {
      this.combat.wavesDone = 0;
      this.combat.waveActive = false;
      this.combat.waveTimer = 0.8;
      this.combat._bossDefeated = false;
      this.combat.boss = null;
      this.combat.enemies.length = 0;
      this.combat.hero.x = 120;
    }
    const chapter = CHAPTERS[Math.floor((target - 1) / 10) % CHAPTERS.length];
    this.log(`前往第 ${target} 层 · ${chapter.name}`, 'l-good');
    this.save();
    refreshPanels();
  }

  /* ---------------- 装备 / 分解 ---------------- */
  equipItem(id) {
    const s = this.state;
    const item = s.bag.find((x) => x.id === id);
    if (!item) return;
    const idx = s.bag.indexOf(item);
    s.bag.splice(idx, 1);
    const old = s.equip[item.slot];
    s.equip[item.slot] = item;
    if (old) s.bag.push(old);
    this.recompute();
    this.audio.click();
  }

  equipBest() {
    const s = this.state;
    let changed = 0;
    for (const slot of SLOTS) {
      const candidates = s.bag.filter((x) => x.slot === slot.key)
        .sort((a, b) => b.power - a.power);
      const best = candidates[0];
      const cur = s.equip[slot.key];
      if (best && isBetter(best, cur, 1.0)) {
        s.bag = s.bag.filter((x) => x.id !== best.id);
        if (cur) s.bag.push(cur);
        s.equip[slot.key] = best;
        changed++;
      }
    }
    this.recompute();
    this.log(changed ? `一键最优：更换了 ${changed} 件装备。` : '一键最优：当前已是最优。', changed ? 'l-good' : 'l-dim');
  }

  salvageItem(id, silent = false) {
    const s = this.state;
    const idx = s.bag.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const item = s.bag[idx];
    s.bag.splice(idx, 1);
    const mats = salvageValue(item);
    for (const [k, v] of Object.entries(mats)) s.mats[k] = (s.mats[k] || 0) + v;
    s.stats.salvaged++;
    if (!silent) {
      const rarity = RARITIES[rarityIndex(item.rarity)];
      this.log(`分解 [${rarity.name}] ${item.name} → 玄铁+${mats.iron}`, 'l-dim');
      this.audio.click();
    }
  }

  salvageBelow() {
    const s = this.state;
    let n = 0;
    for (const item of s.bag.slice()) {
      if (this.belowSalvageLevel(item) && !isBetter(item, s.equip[item.slot], 1.0)) {
        this.salvageItem(item.id, true);
        n++;
      }
    }
    this.log(n ? `分解了 ${n} 件低阶装备。` : '没有可分解的低阶装备。', 'l-dim');
  }

  salvageAll() {
    const s = this.state;
    let n = 0;
    for (const item of s.bag.slice()) {
      this.salvageItem(item.id, true);
      n++;
    }
    this.log(n ? `分解了 ${n} 件装备。` : '背包是空的。', 'l-dim');
  }

  /* ---------------- 存档 ---------------- */
  recompute() {
    this.stats = deriveStats(this.state);
    if (this.state.hp > this.stats.maxHp) this.state.hp = this.stats.maxHp;
  }

  save() {
    if (this.state) saveGame(this.state);
  }

  /* ---------------- 弹窗 ---------------- */
  showOfflineReport(reward) {
    openModal((box) => {
      box.innerHTML = `
        <h2>你不在的时候</h2>
        <p class="muted">修士并没有偷懒。${reward.capped ? '（离线收益已达上限）' : ''}</p>
        <div class="divider"></div>
        <div class="kv"><span>离开时长</span><span>${formatDuration(reward.seconds)}</span></div>
        <div class="kv"><span>击杀妖兽</span><span>${reward.kills}</span></div>
        <div class="kv"><span>获得灵石</span><span class="gold">+${reward.coin}</span></div>
        <div class="kv"><span>获得修为</span><span class="jade">+${reward.exp}</span></div>
        <div class="divider"></div>
        <p class="muted">${offlineQuip(reward)}</p>
        <div class="row end mt8"><button class="btn btn-gold" id="offOk">收下</button></div>`;
      box.querySelector('#offOk').onclick = () => {
        const s = this.state;
        s.coin += reward.coin;
        s.stats.stone += reward.coin;
        countQuest(s, 'kills', reward.kills);
        const res = addExp(s, reward.exp);
        for (const lv of res.levels) this.log(`修为精进：${lv.label}`, 'l-good');
        this.recompute();
        refreshHud();
        refreshPanels();
        closeModal();
      };
    });
  }

  showSettings() {
    const s = this.state;
    openModal((box) => {
      box.innerHTML = `
        <h2>设置</h2>
        <div class="divider"></div>
        <div class="row mb8">
          <label class="tgl"><input type="checkbox" id="setBattle" ${s.settings.autoBattle ? 'checked' : ''}><span>自动战斗</span></label>
          <label class="tgl"><input type="checkbox" id="setPick" ${s.settings.autoPick ? 'checked' : ''}><span>自动拾取</span></label>
          <label class="tgl"><input type="checkbox" id="setSalv" ${s.settings.autoSalvage ? 'checked' : ''}><span>自动分解</span></label>
        </div>
        <div class="row mb8">
          <label class="tgl"><input type="checkbox" id="setSound" ${s.settings.sound ? 'checked' : ''}><span>音效</span></label>
          <span class="tgl">音量</span>
          <input type="range" id="setVol" min="0" max="100" value="${Math.round((s.settings.volume || 0) * 100)}">
        </div>
        <div class="divider"></div>
        <div class="panel-title">存档</div>
        <div class="row mb8">
          <button class="btn btn-sm" id="btnExport">导出存档</button>
          <button class="btn btn-sm" id="btnImport">导入存档</button>
          <button class="btn btn-sm" id="btnReset">重开一世</button>
        </div>
        <textarea id="saveBox" style="width:100%;height:90px;background:#0a0e15;color:var(--text);border:1px solid var(--line);font-family:inherit;font-size:11px" placeholder="存档码会显示在这里"></textarea>
        <div class="row end mt8"><button class="btn btn-ghost" id="setClose">关闭</button></div>`;

      const bind = (id, key) => {
        const el = box.querySelector(id);
        el.onchange = () => { s.settings[key] = el.checked; this.save(); };
      };
      bind('#setBattle', 'autoBattle');
      bind('#setPick', 'autoPick');
      bind('#setSalv', 'autoSalvage');
      bind('#setSound', 'sound');
      box.querySelector('#setVol').oninput = (e) => {
        s.settings.volume = e.target.value / 100;
        audio.setVolume(s.settings.volume);
        this.save();
      };
      audio.setEnabled(s.settings.sound);
      audio.setVolume(s.settings.volume || 0.5);

      box.querySelector('#btnExport').onclick = () => {
        box.querySelector('#saveBox').value = exportSave(s);
        toast('存档码已生成');
      };
      box.querySelector('#btnImport').onclick = () => {
        const text = box.querySelector('#saveBox').value.trim();
        const data = importSave(text);
        if (!data) { toast('存档码无效'); return; }
        clearGame();
        this.state = data;
        this.stats = deriveStats(data);
        this.combat = new Combat(this);
        refreshHud();
        refreshPanels();
        toast('存档已导入');
        closeModal();
      };
      box.querySelector('#btnReset').onclick = () => {
        if (!confirm('确定要重开一世吗？当前进度会全部消失。')) return;
        clearGame();
        location.reload();
      };
      box.querySelector('#setClose').onclick = closeModal;
    });
  }

  showHelp() {
    openModal((box) => {
      box.innerHTML = `
        <h2>玩法</h2>
        <p class="muted">一句话：<b>自动打怪 → 掉装备 → 换更好的 → 升级 → 渡劫突破 → 刷得更深。</b></p>
        <div class="divider"></div>
        <div class="kv"><span>自动战斗</span><span>空格键可暂停/继续</span></div>
        <div class="kv"><span>自动装备</span><span>掉落战力更高的装备会自动换上</span></div>
        <div class="kv"><span>自动分解</span><span>设定品质以下的自动分解成材料</span></div>
        <div class="kv"><span>秘境层数</span><span>每 10 层有守关 Boss，赢了才能进下一境</span></div>
        <div class="kv"><span>境界</span><span>${REALMS.map((r) => r.name).join(' → ')}</span></div>
        <div class="kv"><span>渡劫</span><span>大境界圆满后需扛过雷劫，扛不住修为散一半</span></div>
        <div class="kv"><span>技能</span><span>剑气斩 / 御剑术 / 九霄雷法，随境界自动解锁施放</span></div>
        <div class="divider"></div>
        <div class="panel-title">洞府</div>
        <div class="muted">
          灵草 + 妖丹 + 灵石 → 炼丹炉（聚气丹、破境丹、锐金丹、聚宝丹、洗髓丹）。<br>
          材料 + 灵石 → 图纸打造装备、强化（+N）、洗练词缀。
        </div>
        <div class="panel-title mt8">宗门</div>
        <div class="muted">
          十位同门：掌门、丹霞仙子、铁锤真人、贾道人、周不平，以及苏青鸾、阿九、云无月。<br>
          聊天赠礼涨好感，好感 100 可结为道侣；道侣能一起双修（涨修为）。
        </div>
        <div class="row end mt8"><button class="btn btn-gold" id="helpOk">知道了</button></div>`;
      box.querySelector('#helpOk').onclick = closeModal;
    });
  }

  log(text, cls) {
    logLine(text, cls);
  }
}

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h} 小时 ${m} 分`;
  if (m > 0) return `${m} 分钟`;
  return `${sec} 秒`;
}

function offlineQuip(reward) {
  const lines = [
    `你不在的 ${formatDuration(reward.seconds)} 里，修士偷偷刷了 ${reward.kills} 只妖兽。`,
    `离线收益按 60% 效率计算，躺平也是赚的。`,
    '回来第一件事：看看背包有没有满。',
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

const game = new Game();
window.__game = game;
game.boot();

/* PWA：注册 Service Worker（离线可玩、可添加到主屏幕） */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

/* 安装提示（安卓/桌面 Chrome 会弹「安装应用」） */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__installPrompt = e;
  if (!localStorage.getItem('installHinted')) {
    localStorage.setItem('installHinted', '1');
    toast('可以在浏览器菜单里「安装到主屏幕 / 添加到主屏幕」', '#6fd6b0');
  }
});
