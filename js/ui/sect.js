// 宗门：NPC 好感、对话、赠礼、道侣
import { NPCS, npcLine, affinityStage, AFFINITY_STAGES } from '../data/npcs.js';
import { SPRITES } from '../data/sprites.js';
import { openModal, closeModal, toast } from './modal.js';
import { showTooltip, hideTooltip } from './modal.js';
import { ensureQuests, questProgress, claimQuest, sweepQuest } from '../game/quests.js';
import { routeState, completeRouteStep, canBindPartner } from '../game/route.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { refreshHud } from './hud.js';

const MAT_NAME = { iron: '玄铁', bone: '妖骨', jade: '寒玉', wood: '灵木', core: '妖丹', herb: '灵草', wine: '酒' };

const GIFT_ITEMS = [
  { key: 'coin', name: '灵石', cost: 120, affinity: 3, icon: 'ui/ui_xianxia_item_spirit_stone' },
  { key: 'herb', name: '灵草', cost: 0, affinity: 5, icon: 'ui/ui_xianxia_item_lingzhi' },
  { key: 'core', name: '妖丹', cost: 0, affinity: 8, icon: 'ui/ui_xianxia_item_pill_bottle' },
  { key: 'iron', name: '玄铁', cost: 0, affinity: 4, icon: 'ui/ui_xianxia_item_coin_string' },
  { key: 'wine', name: '酒壶', cost: 60, affinity: 6, icon: 'ui/ui_xianxia_item_gourd' },
];

function faceKey(npc, mood) {
  const prefix = 'npc/' + npc.portrait + '_';
  const keys = Object.keys(SPRITES.images).filter((k) => k.startsWith(prefix));
  if (!keys.length) return null;
  const want = mood === 'happy'
    ? ['happy', 'surprised', 'calm', 'neutral']
    : ['neutral', 'calm', 'happy', 'surprised'];
  for (const w of want) {
    const k = prefix + w;
    if (keys.includes(k)) return k;
  }
  return keys[0];
}

function affinityOf(state, key) {
  state.npcAffinity = state.npcAffinity || {};
  return state.npcAffinity[key] || 0;
}

function addAffinity(state, key, value) {
  state.npcAffinity = state.npcAffinity || {};
  state.npcAffinity[key] = Math.max(0, Math.min(120, (state.npcAffinity[key] || 0) + value));
}

export function renderSect(game, el) {
  const s = game.state;
  s.npcAffinity = s.npcAffinity || {};

  const list = NPCS.map((npc) => {
    const aff = affinityOf(s, npc.key);
    const stage = affinityStage(aff);
    const key = faceKey(npc, stage >= 3 ? 'happy' : 'neutral');
    const src = key ? SPRITES.images[key].src : '';
    const rs = routeState(s, npc.key);
    const mark = rs ? (rs.status === 'ready' ? ' · <span class="gold">★ 可推进</span>'
      : (rs.rec.done ? ' · <span class="jade">✦ 心事已了</span>' : '')) : '';
    return `<div class="slot" data-npc="${npc.key}" style="margin-bottom:4px">
      <div class="slot-icon" style="width:38px;height:38px">
        ${src ? `<img src="${src}" style="object-fit:cover;object-position:top">` : ''}
      </div>
      <div class="slot-info">
        <div class="slot-name">${npc.name} <span class="muted" style="font-size:10px">${npc.title}</span></div>
        <div class="slot-sub">${AFFINITY_STAGES[stage]} · 好感 ${aff}${npc.romance ? ' · 可结缘' : ''}${mark}</div>
        <div class="bar bar-xp" style="height:6px;margin-top:2px"><div class="bar-track"><i style="width:${Math.min(100, aff)}%"></i></div></div>
      </div>
    </div>`;
  }).join('');

  const questHtml = (qs, sweepable) => (qs || []).map((q) => {
    const p = questProgress(s, q);
    const finished = p >= q.target;
    const sweepCost = Math.max(100, Math.round((q.reward.coin || 0) * 0.6));
    return `<div class="kv" style="align-items:center">
      <span>${q.name}<br><span class="muted" style="font-size:10px">${q.desc}（${Math.min(p, q.target)}/${q.target}）</span></span>
      <span>${q.claimed ? '<span class="muted">已领取</span>'
        : (finished
          ? `<button class="btn btn-sm btn-jade" data-quest="${q.key}">领取</button>`
          : (sweepable ? `<button class="btn btn-sm" data-sweep="${q.key}">扫荡 ${sweepCost}</button>` : ''))}</span>
    </div>`;
  }).join('');

  // 成就 / 称号
  const unlocked = s.achievements || {};
  const achHtml = ACHIEVEMENTS.map((a) => {
    const got = !!unlocked[a.key];
    return `<div class="kv" style="align-items:center;${got ? '' : 'opacity:.45'}">
      <span>${got ? a.name : '？？？'}<br><span class="muted" style="font-size:10px">${got ? a.desc : '未达成'}</span></span>
      <span>${got ? `<button class="btn btn-sm ${s.title === a.title ? 'btn-jade' : ''}" data-title="${a.title}">${s.title === a.title ? '佩戴中' : a.title}</button>` : ''}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="panel-title">宗门</div>
    <div class="sub-title">今日任务（每日重置）</div>
    ${questHtml(s.daily, true)}
    <div class="sub-title">宗门悬赏</div>
    ${questHtml(s.sect, false)}
    <div class="sub-title">同门名录</div>
    ${list}
    <div class="sub-title">道侣</div>
    <div class="muted">${s.partner ? `已结契：${s.partner}` : '尚未结契。好感满 100 且完成专属任务即可结缘。'}</div>
    <div class="sub-title">称号与成就</div>
    <div class="muted mb8">当前称号：<span class="gold">${s.title || '（无）'}</span></div>
    ${achHtml}`;

  el.querySelectorAll('[data-title]').forEach((node) => {
    node.onclick = () => {
      s.title = node.dataset.title;
      game.save();
      game.log(`换上了称号：${s.title}`, 'l-good');
      renderSect(game, el);
      refreshHud();
    };
  });

  el.querySelectorAll('[data-npc]').forEach((node) => {
    node.onclick = () => openNpcDialog(game, node.dataset.npc);
  });

  el.querySelectorAll('[data-sweep]').forEach((b) => {
    b.onclick = () => {
      const all = [...(s.daily || []), ...(s.sect || [])];
      const q = all.find((x) => x.key === b.dataset.sweep);
      if (!q) return;
      const r = sweepQuest(s, q);
      if (r.error) { toast(r.error); return; }
      game.log(`扫荡完成【${q.name}】，花费 ${r.cost} 灵石`, 'l-loot');
      toast('扫荡完成', '#e8c46a');
      game.save();
      renderSect(game, el);
    };
  });

  el.querySelectorAll('[data-quest]').forEach((b) => {
    b.onclick = () => {
      const all = [...(s.daily || []), ...(s.sect || [])];
      const q = all.find((x) => x.key === b.dataset.quest);
      if (!q) return;
      const r = claimQuest(s, q);
      if (r) {
        const parts = [];
        if (r.coin) parts.push(`灵石 +${r.coin}`);
        if (r.exp) parts.push(`修为 +${r.exp}`);
        for (const [k, v] of Object.entries(r.mats || {})) parts.push(`${MAT_NAME[k] || k} +${v}`);
        game.log(`任务完成【${q.name}】：${parts.join('、')}`, 'l-loot');
        toast('任务奖励已领取', '#e8c46a');
        game.save();
        renderSect(game, el);
      }
    };
  });
}

/** 与 NPC 对话 */
export function openNpcDialog(game, npcKey) {
  const s = game.state;
  const npc = NPCS.find((n) => n.key === npcKey);
  if (!npc) return;
  const aff = affinityOf(s, npc.key);
  const stage = affinityStage(aff);
  const key = faceKey(npc, stage >= 3 ? 'happy' : 'neutral');
  const src = key ? SPRITES.images[key].src : '';
  const min = Math.floor(s.stats.playtime / 60);

  openModal((box) => {
    box.innerHTML = `
      <h2>${npc.name} <span class="muted" style="font-size:12px">${npc.title}</span></h2>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="width:96px;height:120px;background:#0a0e15;border:1px solid var(--line);border-radius:3px;overflow:hidden;flex:none">
          ${src ? `<img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:top;image-rendering:pixelated">` : ''}
        </div>
        <div style="flex:1">
          <div class="muted" id="npcLine">${npcLine(npc, aff, s.name, min)}</div>
          <div class="kv"><span>好感</span><span>${AFFINITY_STAGES[stage]}（${aff}）</span></div>
          <div class="bar bar-xp" style="margin:4px 0 10px"><div class="bar-track"><i style="width:${Math.min(100, aff)}%"></i></div></div>
          <div class="muted" style="font-size:11px">${npc.desc}</div>
        </div>
      </div>
      <div class="divider"></div>
      <div id="routeBox"></div>
      <div class="sub-title">赠礼</div>
      <div class="row" id="giftRow"></div>
      <div class="row end mt8">
        <button class="btn btn-ghost" id="npcClose">告辞</button>
      </div>`;

    // 专属任务链
    const routeBox = box.querySelector('#routeBox');
    const rs0 = routeState(s, npc.key);
    if (rs0) {
      const step = rs0.step;
      const done = rs0.rec.done;
      const locked = rs0.status === 'locked';
      const ready = rs0.status === 'ready';
      const pct = step ? Math.min(100, (rs0.progress / step.goal.target) * 100) : 100;
      routeBox.innerHTML = `
        <div class="sub-title">专属任务 · ${rs0.route.title}</div>
        ${done
          ? `<div class="muted">三段心事已了。你们之间，只剩一句「好」。</div>`
          : `<div class="kv"><span>${step.name}</span><span>${Math.min(rs0.progress, step.goal.target)}/${step.goal.target}</span></div>
             <div class="bar bar-xp" style="margin:4px 0 6px"><div class="bar-track"><i style="width:${pct}%"></i></div></div>
             <div class="muted" style="font-size:11px">${step.desc}</div>
             ${locked ? '<div class="muted" style="font-size:11px;color:#e0574f">条件不足：再熟络些。</div>' : ''}
             <div class="row mt8"><button class="btn btn-sm ${ready ? 'btn-jade' : ''}" id="routeDo" ${ready ? '' : 'disabled'}>${ready ? '了结此事' : '进行中'}</button></div>`}
        <div id="routeLine"></div>`;
      const doBtn = routeBox.querySelector('#routeDo');
      if (doBtn) {
        doBtn.onclick = () => {
          const r = completeRouteStep(s, npc.key);
          if (!r) return;
          game.log(`${npc.name}：${r.line}`, 'l-good');
          game.save();
          openNpcDialog(game, npcKey);
        };
      }
    }

    const giftRow = box.querySelector('#giftRow');
    GIFT_ITEMS.forEach((g) => {
      const b = document.createElement('button');
      b.className = 'btn btn-sm';
      b.textContent = `${g.name} +${g.affinity}`;
      b.onclick = () => {
        if (g.cost) {
          if (s.coin < g.cost) { toast('灵石不够'); return; }
          s.coin -= g.cost;
        } else {
          if ((s.mats[g.key] || 0) < 1) { toast('没有这种材料'); return; }
          s.mats[g.key] -= 1;
        }
        addAffinity(s, npc.key, g.affinity);
        game.log(`${npc.name}收下了你的心意。`, 'l-good');
        game.save();
        openNpcDialog(game, npcKey);   // 刷新
      };
      giftRow.appendChild(b);
    });

    // 聊天
    const talk = document.createElement('button');
    talk.className = 'btn btn-sm btn-jade';
    talk.textContent = '闲聊';
    talk.onclick = () => {
      addAffinity(s, npc.key, 2);
      game.countQuest('talk');
      s.npcTalk = s.npcTalk || {};
      s.npcTalk[npc.key] = (s.npcTalk[npc.key] || 0) + 1;
      game.save();
      openNpcDialog(game, npcKey);
    };
    giftRow.appendChild(talk);

    // 结缘
    const rs = routeState(s, npc.key);
    if (npc.romance && rs && canBindPartner(s, npc.key) && s.partner !== npc.name) {
      const bind = document.createElement('button');
      bind.className = 'btn btn-sm btn-gold';
      bind.textContent = s.partner ? '改结道侣' : '结为道侣';
      bind.onclick = () => {
        s.partner = npc.name;
        s.partnerKey = npc.key;
        addAffinity(s, npc.key, 10);
        game.log(`你与${npc.name}结为道侣。`, 'l-good');
        toast(`与 ${npc.name} 结为道侣`, '#e8c46a');
        game.save();
        closeModal();
      };
      giftRow.appendChild(bind);
    }
    if (s.partner) {
      const dual = document.createElement('button');
      dual.className = 'btn btn-sm';
      dual.textContent = '双修';
      dual.onclick = () => {
        const cd = s.dualCd || 0;
        if (Date.now() < cd) {
          toast('还在调息，' + Math.ceil((cd - Date.now()) / 60000) + ' 分钟后再来。');
          return;
        }
        s.dualCd = Date.now() + 4 * 3600 * 1000;
        const exp = Math.floor((200 + s.floor * 60) * (1 + s.realm * 0.5));
        s.exp += exp;
        game.log(`与${s.partner}双修，修为 +${exp}。`, 'l-good');
        toast(`双修完成，修为 +${exp}`, '#c08cff');
        game.recompute();
        game.save();
        closeModal();
      };
      giftRow.appendChild(dual);
    }

    box.querySelector('#npcClose').onclick = closeModal;
  }, { width: '560px' });
}
