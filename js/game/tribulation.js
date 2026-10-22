// 渡劫：大境界突破的试炼
import { REALMS } from '../data/config.js';
import { openModal, closeModal, toast } from '../ui/modal.js';
import { audio } from '../engine/audio.js';

const TRIAL_SECONDS = 12;

/** 某境界渡劫所需的战力 */
export function tribulationPower(realmIndex) {
  return Math.round(200 * Math.pow(3, realmIndex));
}

/**
 * 发起一次渡劫
 * @returns {Promise<boolean>} 是否渡劫成功
 */
export function runTribulation(game, realmIndex) {
  return new Promise((resolve) => {
    const state = game.state;
    const stats = game.stats;
    const realm = REALMS[Math.min(realmIndex, REALMS.length - 1)];
    const need = tribulationPower(realmIndex);
    const dps = Math.max(6, stats.atk * stats.aspd * 1.25);
    const thunderHp = Math.round(260 + need * 0.35);
    const resist = Math.min(0.75, state.buffs?.tribResist || 0);
    const thunderDps = (8 + realmIndex * 6 + need * 0.01) * (1 - resist);

    let elapsed = 0;
    let thunder = thunderHp;
    let playerHp = stats.maxHp;
    let done = false;
    let raf = 0;
    let last = performance.now();
    const lines = [];

    game.paused = true;

    openModal((box) => {
      box.innerHTML = `
        <h2>渡劫 · ${realm.name}期</h2>
        <p class="muted">九天雷云压顶。撑过去，你就是${realm.name}期修士；撑不过，修为散尽，再来。</p>
        <div class="divider"></div>
        <div class="kv"><span>渡劫要求</span><span class="gold">战力 ≥ ${need}（当前 ${stats.power}）</span></div>
        ${resist > 0 ? `<div class="kv"><span>破境丹护体</span><span class="jade">雷劫伤害 -${Math.round(resist * 100)}%</span></div>` : ''}
        <div class="kv"><span>你的血量</span><span id="tbPlayer">${Math.round(playerHp)}</span></div>
        <div class="bar bar-hp" style="margin:4px 0 10px"><div class="bar-track"><i id="tbPlayerFill"></i></div></div>
        <div class="kv"><span>雷劫之威</span><span id="tbThunder">${thunder}</span></div>
        <div class="bar bar-xp" style="margin:4px 0 10px"><div class="bar-track"><i id="tbThunderFill"></i></div></div>
        <div class="log" id="tbLog" style="height:90px"></div>
        <div class="row end mt8"><span class="muted" id="tbTime"></span></div>`;

      const pFill = box.querySelector('#tbPlayerFill');
      const tFill = box.querySelector('#tbThunderFill');
      const pText = box.querySelector('#tbPlayer');
      const tText = box.querySelector('#tbThunder');
      const timeText = box.querySelector('#tbTime');
      const logBox = box.querySelector('#tbLog');

      const push = (text, cls) => {
        const d = document.createElement('div');
        d.className = cls || 'l-dim';
        d.textContent = text;
        logBox.appendChild(d);
        while (logBox.children.length > 6) logBox.removeChild(logBox.firstChild);
      };

      const finish = (success) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        game.paused = false;
        closeModal();
        resolve(success);
      };

      const tick = (now) => {
        if (done) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        elapsed += dt;

        // 雷劫伤害
        const tDamage = thunderDps * dt * (0.8 + Math.random() * 0.4);
        playerHp -= tDamage;
        // 玩家输出
        thunder -= dps * dt;

        pFill.style.width = Math.max(0, (playerHp / stats.maxHp) * 100) + '%';
        tFill.style.width = Math.max(0, (thunder / thunderHp) * 100) + '%';
        pText.textContent = `${Math.max(0, Math.round(playerHp))}/${stats.maxHp}`;
        tText.textContent = `${Math.max(0, Math.round(thunder))}/${thunderHp}`;
        timeText.textContent = `第 ${elapsed.toFixed(1)} 秒`;

        if (Math.random() < dt * 2.2) {
          push('一道天雷落下，护体灵光碎裂。', 'l-bad');
          game.fx.addShake(4);
          audio.thunder();
        }

        if (thunder <= 0) {
          push('雷云散去。天地为你让路。', 'l-good');
          finish(true);
          return;
        }
        if (playerHp <= 0) {
          push('……你被雷劫劈得外焦里嫩。', 'l-bad');
          finish(false);
          return;
        }
        if (elapsed > TRIAL_SECONDS) {
          push('雷劫未散，你的修为被生生压了回去。', 'l-bad');
          finish(false);
          return;
        }
        raf = requestAnimationFrame(tick);
      };

      push('雷云在头顶凝聚，第一道天雷正在成形。', 'l-dim');
      raf = requestAnimationFrame(tick);
    }, { width: '520px', dismissible: false });
  });
}

/** 执行渡劫并结算 */
export async function doTribulation(game, realmIndex) {
  const state = game.state;
  const ok = await runTribulation(game, realmIndex);
  if (state.buffs) state.buffs.tribResist = 0;
  const realmName = (REALMS[realmIndex] || REALMS[REALMS.length - 1]).name;
  if (ok) {
    state.realm = realmIndex;
    state.stage = 0;
    state.exp = 0;
    state.pendingRealm = null;
    game.recompute();
    state.hp = game.stats.maxHp;
    game.log(`雷劫已过，${realmName}期！`, 'l-good');
    game.fx.addFlash('255,240,190', 0.7);
    game.fx.addShake(8);
    audio.fanfare();
    toast(`渡劫成功 · ${realmName}期`, '#e8c46a');
  } else {
    // 失败：损失一半修为，稍后再来
    state.exp = Math.floor(state.exp * 0.5);
    state.pendingRealm = null;
    game.recompute();
    state.hp = game.stats.maxHp;
    game.log(`渡劫失败，修为散去一半。${realmName}期需要战力 ${tribulationPower(realmIndex)}，再刷刷装备。`, 'l-bad');
  }
  game.markPanels('both');
  game.save();
}
