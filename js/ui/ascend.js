// 仙缘面板：飞升 + 天赋
import { TALENTS } from '../data/talents.js';
import { canAscend, ascendRequirement, ascendReward, ascend, talentRows, buyTalent } from '../game/ascend.js';
import { openModal, closeModal, toast } from './modal.js';
import { buildShareImage, downloadDataURL } from './share.js';
import { exportSave } from '../game/save.js';
import { realmLabel } from '../game/state.js';

export function renderAscend(game, el) {
  const s = game.state;
  const asc = s.ascend = s.ascend || { count: 0, points: 0, talents: {}, choice: null };
  const ready = canAscend(s);
  const req = ascendRequirement(s);
  const gain = ascendReward(s);

  const rows = talentRows(s).map((r) => `
    <div class="kv" style="align-items:center">
      <span>${r.talent.name} <span class="muted">${r.level}/${r.talent.max}</span><br>
        <span class="muted" style="font-size:10px">${r.talent.desc}</span></span>
      <span>${!r.available ? '<span class="muted">未解锁</span>'
        : (r.level >= r.talent.max ? '<span class="jade">已满</span>'
        : `<button class="btn btn-sm ${r.can ? 'btn-jade' : ''}" data-talent="${r.talent.key}" ${r.can ? '' : 'disabled'}>${r.cost} 仙缘</button>`)}</span>
    </div>`).join('');

  // 飞升榜（本地记录历代轮回）
  const board = s.board = s.board || [];
  const boardHtml = board.length
    ? board.map((b, i) => `<div class="kv"><span>第 ${i + 1} 世 · ${b.name}</span>
        <span>${b.realm} · ${b.power} 战力 · ${b.floor} 层</span></div>`).join('')
    : '<div class="muted">还没有飞升记录。</div>';

  el.innerHTML = `
    <div class="panel-title">仙缘</div>
    <div class="kv"><span>飞升次数</span><span>${asc.count}</span></div>
    <div class="kv"><span>可用仙缘</span><span class="gold">${asc.points}</span></div>
    <div class="kv"><span>本次飞升可得</span><span>${gain} 仙缘</span></div>
    ${ready ? '' : `<div class="kv"><span>飞升条件</span><span class="red">通关第 ${req.need} 层（当前 ${req.have}）</span></div>`}
    <div class="row mt8">
      <button class="btn btn-gold" id="btnAscend" ${ready ? '' : 'disabled'}>${ready ? '飞升转生' : '尚未飞升'}</button>
    </div>
    <div class="sub-title">仙缘天赋</div>
    ${rows}
    <div class="sub-title">飞升榜</div>
    ${boardHtml}
    <div class="row mt8">
      <button class="btn btn-sm btn-jade" id="btnShare">生成分享图</button>
      <button class="btn btn-sm" id="btnCopy">复制存档码</button>
    </div>
    <div class="muted mt8">转生会清空境界、层数与修为，装备与材料保留，仙缘永久生效。</div>`;

  const btn = el.querySelector('#btnAscend');
  if (btn) btn.onclick = () => openAscendModal(game);

  el.querySelectorAll('[data-talent]').forEach((b) => {
    b.onclick = () => {
      if (buyTalent(s, b.dataset.talent)) {
        game.log(`仙缘天赋已点亮：${TALENTS.find((t) => t.key === b.dataset.talent).name}`, 'l-loot');
        game.recompute();
        game.save();
        renderAscend(game, el);
      }
    };
  });

  const share = el.querySelector('#btnShare');
  if (share) {
    share.onclick = async () => {
      share.disabled = true;
      share.textContent = '生成中…';
      try {
        const url = await buildShareImage(game, exportSave(s));
        downloadDataURL(url, `${s.name || '修士'}-修仙记录.png`);
        toast('分享图已下载', '#6fd6b0');
      } catch (e) {
        toast('生成失败');
      }
      share.disabled = false;
      share.textContent = '生成分享图';
    };
  }

  const copy = el.querySelector('#btnCopy');
  if (copy) {
    copy.onclick = () => {
      const code = exportSave(s);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => toast('存档码已复制'), () => toast('复制失败，请手动选择'));
      } else {
        toast('当前环境不支持一键复制');
      }
    };
  }
}

function openAscendModal(game) {
  const s = game.state;
  const gain = ascendReward(s);
  const hasPartner = !!s.partner;
  openModal((box) => {
    box.innerHTML = `
      <h2>飞升</h2>
      <p class="muted">九天之上有仙路一条。此去经年，尘世的境界与层数皆要重来——但你的仙缘，会一直跟着你。</p>
      <div class="divider"></div>
      <div class="kv"><span>获得仙缘</span><span class="gold">+${gain}</span></div>
      <div class="kv"><span>道侣</span><span>${s.partner || '尚无'}</span></div>
      <div class="divider"></div>
      <div id="ascChoices"></div>`;
    const wrap = box.querySelector('#ascChoices');

    if (hasPartner) {
      const go = document.createElement('button');
      go.className = 'btn btn-gold';
      go.style.display = 'block';
      go.style.width = '100%';
      go.style.marginBottom = '6px';
      go.textContent = '带她一起飞升（获得「同心」天赋）';
      go.onclick = () => finish(game, 'go');
      wrap.appendChild(go);

      const stay = document.createElement('button');
      stay.className = 'btn';
      stay.style.display = 'block';
      stay.style.width = '100%';
      stay.style.marginBottom = '6px';
      stay.textContent = '留她镇守宗门（获得「镇宗」天赋）';
      stay.onclick = () => finish(game, 'stay');
      wrap.appendChild(stay);
    }

    const alone = document.createElement('button');
    alone.className = 'btn';
    alone.style.display = 'block';
    alone.style.width = '100%';
    alone.textContent = '孑然飞升';
    alone.onclick = () => finish(game, null);
    wrap.appendChild(alone);
  }, { width: '520px', dismissible: false });
}

function finish(game, choice) {
  const s = game.state;
  // 记录这一世的成绩
  s.board = s.board || [];
  s.board.push({
    name: s.name,
    realm: realmLabel(s),
    power: game.stats.power,
    floor: s.bestFloor || 0,
    time: Math.round(s.stats.playtime || 0),
  });
  if (s.board.length > 20) s.board.shift();
  const r = ascend(s, choice);
  closeModal();
  game.recompute();
  game.afterAscend();
  game.save();
  game.log(`飞升！获得 ${r.gain} 仙缘。这是你的第 ${r.count} 次飞升。`, 'l-good');
  if (r.ending) {
    openModal((box) => {
      box.innerHTML = `
        <h2>${s.partner || '道侣'}的结局</h2>
        <p style="line-height:1.9;margin-top:10px">${r.ending}</p>
        <div class="row end mt8"><button class="btn btn-gold" id="ascOk">继续</button></div>`;
      box.querySelector('#ascOk').onclick = closeModal;
    }, { width: '520px' });
  }
  toast(`飞升成功 · +${r.gain} 仙缘`, '#e8c46a');
}
