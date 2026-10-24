// 宗门：NPC 好感、对话、赠礼、道侣
import { NPCS, npcLine, affinityStage, AFFINITY_STAGES } from '../data/npcs.js';
import { openModal, closeModal, toast } from './modal.js';
import { questProgress, claimQuest, sweepQuest } from '../game/quests.js';
import { routeState, completeRouteStep, canBindPartner } from '../game/route.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { refreshHud } from './hud.js';
import { icon, isFullPage, pageHead, cardHead, barHtml } from './theme.js';

const MAT_NAME = { iron: '玄铁', bone: '妖骨', jade: '寒玉', wood: '灵木', core: '妖丹', herb: '灵草', wine: '酒' };

const GIFT_ITEMS = [
  { key: 'coin', name: '灵石', cost: 120, affinity: 3, icon: 'gem' },
  { key: 'herb', name: '灵草', cost: 0, affinity: 5, icon: 'herb' },
  { key: 'core', name: '妖丹', cost: 0, affinity: 8, icon: 'pill' },
  { key: 'iron', name: '玄铁', cost: 0, affinity: 4, icon: 'ingot' },
  { key: 'wine', name: '酒壶', cost: 60, affinity: 6, icon: 'gourd' },
];

function portraitSrc(npc, thumb = false) {
  return `assets/hd/portraits/${npc.key}${thumb ? '-thumb' : ''}.webp`;
}

function affinityOf(state, key) {
  state.npcAffinity = state.npcAffinity || {};
  return state.npcAffinity[key] || 0;
}

function addAffinity(state, key, value) {
  state.npcAffinity = state.npcAffinity || {};
  state.npcAffinity[key] = Math.max(0, Math.min(120, (state.npcAffinity[key] || 0) + value));
}

function questHtml(s, qs, sweepable) {
  return (qs || []).map((q) => {
    const p = questProgress(s, q);
    const finished = p >= q.target;
    const sweepCost = Math.max(100, Math.round((q.reward.coin || 0) * 0.6));
    return `<div class="quest-item">
      <div class="quest-main">
        <div class="quest-name">${q.name}</div>
        <div class="quest-desc">${q.desc}（${Math.min(p, q.target)}/${q.target}）</div>
      </div>
      <span>${q.claimed ? '<span class="muted small">已领取</span>'
        : (finished
          ? `<button class="btn btn-sm btn-jade" data-quest="${q.key}">领取</button>`
          : (sweepable ? `<button class="btn btn-sm" data-sweep="${q.key}">扫荡 ${sweepCost}</button>` : ''))}</span>
    </div>`;
  }).join('');
}

function achievementHtml(s) {
  const unlocked = s.achievements || {};
  return ACHIEVEMENTS.map((a) => {
    const got = !!unlocked[a.key];
    return `<div class="talent-item" style="${got ? '' : 'opacity:.45'}">
      <div class="talent-main">
        <div class="talent-name">${got ? a.name : '？？？'}</div>
        <div class="talent-desc">${got ? a.desc : '未达成'}</div>
      </div>
      <span>${got ? `<button class="btn btn-sm ${s.title === a.title ? 'btn-jade' : ''}" data-title="${a.title}">${s.title === a.title ? '佩戴中' : a.title}</button>` : ''}</span>
    </div>`;
  }).join('');
}

function rosterCard(npc, aff, stage, rs, partnerKey) {
  const mark = rs
    ? (rs.status === 'ready' ? '可推进' : (rs.rec.done ? '心事已了' : ''))
    : '';
  const badge = partnerKey === npc.key ? '道侣' : (npc.romance && aff >= 70 ? '可结缘' : npc.role);
  return `<button class="npc-card" data-npc="${npc.key}" type="button">
    <div class="npc-portrait">
      <img src="${portraitSrc(npc, true)}" alt="${npc.name}" loading="lazy">
      <span class="npc-badge${npc.romance ? ' gold' : ''}">${badge}</span>
    </div>
    <div class="npc-body">
      <div class="npc-name">${npc.name}<span class="npc-title">${npc.title}</span></div>
      <div class="npc-meta">${AFFINITY_STAGES[stage]} · 好感 ${aff}${mark ? ` · <span class="npc-mark">${mark}</span>` : ''}</div>
      ${barHtml(aff)}
    </div>
  </button>`;
}

function rosterRow(npc, aff, stage, rs) {
  const mark = rs
    ? (rs.status === 'ready' ? ' · <span class="gold">★ 可推进</span>'
      : (rs.rec.done ? ' · <span class="jade">✦ 心事已了</span>' : ''))
    : '';
  return `<div class="slot" data-npc="${npc.key}" style="margin-bottom:2px">
    <div class="slot-icon" style="width:40px;height:52px;border-radius:7px">
      <img src="${portraitSrc(npc, true)}" alt="" style="object-fit:cover;object-position:top">
    </div>
    <div class="slot-info">
      <div class="slot-name">${npc.name} <span class="muted" style="font-size:10px">${npc.title}</span></div>
      <div class="slot-sub">${AFFINITY_STAGES[stage]} · 好感 ${aff}${npc.romance ? ' · 可结缘' : ''}${mark}</div>
      ${barHtml(aff)}
    </div>
  </div>`;
}

export function renderSect(game, el) {
  const s = game.state;
  const fullPage = isFullPage(el);
  s.npcAffinity = s.npcAffinity || {};

  const roster = NPCS.map((npc) => {
    const aff = affinityOf(s, npc.key);
    const stage = affinityStage(aff);
    const rs = routeState(s, npc.key);
    return fullPage ? rosterCard(npc, aff, stage, rs, s.partnerKey) : rosterRow(npc, aff, stage, rs);
  }).join('');

  const daily = questHtml(s, s.daily, true);
  const bounty = questHtml(s, s.sect, false);
  const partnerNpc = NPCS.find((n) => n.key === s.partnerKey) || NPCS.find((n) => n.name === s.partner);
  const partnerAff = partnerNpc ? affinityOf(s, partnerNpc.key) : 0;
  const partnerText = s.partner
    ? `已结契：<span class="gold">${s.partner}</span>`
    : '尚未结契。好感满 100 且完成专属任务即可结缘。';
  const partnerCard = partnerNpc
    ? `<div class="partner-body">
        <div class="partner-portrait"><img src="${portraitSrc(partnerNpc, true)}" alt="${partnerNpc.name}"></div>
        <div class="partner-main">
          <div class="partner-name">${partnerNpc.name}<span class="muted small">${partnerNpc.title}</span></div>
          <div class="kv"><span>好感</span><span class="gold">${partnerAff}</span></div>
          ${barHtml(partnerAff)}
          <button class="btn btn-sm btn-jade mt8" data-partner-talk="${partnerNpc.key}">${icon('scroll')}叙话</button>
        </div>
      </div>`
    : `<div class="empty-state">尚未结契。好感满 100 且完成专属任务即可结缘。</div>`;

  if (fullPage) {
    el.innerHTML = `
      ${pageHead({
        kicker: 'SECT · 同门',
        title: '宗门',
        desc: '山中日月长。同门名录、每日差遣，与那些尚未说完的心事。',
      })}
      <section class="card">
        ${cardHead('同门名录', `${NPCS.length} 位`, 'sect')}
        <div class="npc-grid">${roster}</div>
      </section>
      <div class="split-grid" style="margin-top:12px">
        <section class="card">
          ${cardHead('今日任务', '每日重置', 'scroll')}
          <div class="quest-list">${daily || '<div class="empty-state">今日无事。</div>'}</div>
        </section>
        <section class="card">
          ${cardHead('宗门悬赏', '', 'spark')}
          <div class="quest-list">${bounty || '<div class="empty-state">暂无悬赏。</div>'}</div>
        </section>
      </div>
      <div class="split-grid" style="margin-top:12px">
        <section class="card">
          ${cardHead('道侣', '', 'fate')}
          ${partnerCard}
        </section>
        <section class="card">
          ${cardHead('称号与成就', `当前：${s.title || '无'}`, 'helmet')}
          <div class="talent-list">${achievementHtml(s)}</div>
        </section>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="panel-title">宗门</div>
      <div class="sub-title">今日任务（每日重置）</div>
      <div class="quest-list">${daily}</div>
      <div class="sub-title">宗门悬赏</div>
      <div class="quest-list">${bounty}</div>
      <div class="sub-title">同门名录</div>
      ${roster}
      <div class="sub-title">道侣</div>
      <div class="muted">${partnerText}</div>
      <div class="sub-title">称号与成就</div>
      <div class="muted mb8">当前称号：<span class="gold">${s.title || '（无）'}</span></div>
      <div class="talent-list">${achievementHtml(s)}</div>`;
  }

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

  el.querySelectorAll('[data-partner-talk]').forEach((node) => {
    node.onclick = () => openNpcDialog(game, node.dataset.partnerTalk);
  });

  el.querySelectorAll('[data-sweep]').forEach((b) => {
    b.onclick = () => {
      const all = [...(s.daily || []), ...(s.sect || [])];
      const q = all.find((x) => x.key === b.dataset.sweep);
      if (!q) return;
      const r = sweepQuest(s, q);
      if (r.error) { toast(r.error); return; }
      game.log(`扫荡完成【${q.name}】，花费 ${r.cost} 灵石`, 'l-loot');
      toast('扫荡完成', '#a8803c');
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
        toast('任务奖励已领取', '#a8803c');
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
  const min = Math.floor(s.stats.playtime / 60);

  openModal((box) => {
    box.innerHTML = `
      <div class="npc-dialog">
        <div class="npc-dialog-portrait">
          <img src="${portraitSrc(npc)}" alt="${npc.name}">
        </div>
        <div class="npc-dialog-body">
          <h2>${npc.name} <span class="muted" style="font-size:12px;letter-spacing:0">${npc.title}</span></h2>
          <div class="npc-line" id="npcLine">${npcLine(npc, aff, s.name, min)}</div>
          <div class="kv"><span>好感</span><span>${AFFINITY_STAGES[stage]}（${aff}）</span></div>
          ${barHtml(aff)}
          <div class="muted small" style="margin-top:10px">${npc.desc}</div>
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
             ${barHtml(pct)}
             <div class="muted small" style="margin-top:8px">${step.desc}</div>
             ${locked ? '<div class="small" style="color:var(--cinnabar);margin-top:6px">条件不足：再熟络些。</div>' : ''}
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
      b.innerHTML = `${icon(g.icon)}<span>${g.name} +${g.affinity}</span>`;
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
        openNpcDialog(game, npcKey);
      };
      giftRow.appendChild(b);
    });

    const talk = document.createElement('button');
    talk.className = 'btn btn-sm btn-jade';
    talk.innerHTML = `<span>闲聊</span>`;
    talk.onclick = () => {
      addAffinity(s, npc.key, 2);
      game.countQuest('talk');
      s.npcTalk = s.npcTalk || {};
      s.npcTalk[npc.key] = (s.npcTalk[npc.key] || 0) + 1;
      game.save();
      openNpcDialog(game, npcKey);
    };
    giftRow.appendChild(talk);

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
        toast(`与 ${npc.name} 结为道侣`, '#a8803c');
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
        toast(`双修完成，修为 +${exp}`, '#7c4e9e');
        game.recompute();
        game.save();
        closeModal();
      };
      giftRow.appendChild(dual);
    }

    box.querySelector('#npcClose').onclick = closeModal;
  }, { width: '660px' });
}
