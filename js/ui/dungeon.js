// 秘境面板：选层、刷层设置
import { CHAPTERS, MOBS, BOSSES, BALANCE } from '../data/config.js';

function chapterOf(floor) {
  return CHAPTERS[Math.floor((floor - 1) / 10) % CHAPTERS.length];
}

export function renderDungeon(game, el) {
  const s = game.state;
  const cur = s.floor;
  const chap = chapterOf(cur);
  const best = s.bestFloor || 0;
  const maxFloor = best + 1;

  // 可选层：最高通关层附近 + 所有 Boss 层
  const start = Math.max(1, best - 12);
  const rows = [];
  for (let f = start; f <= maxFloor; f++) {
    const ch = chapterOf(f);
    const isBoss = f % BALANCE.bossEvery === 0;
    const boss = isBoss ? BOSSES[ch.boss] : null;
    const mobs = ch.mobs.map((m) => MOBS[m].name).join('、');
    rows.push(`<div class="kv ${f === cur ? 'on' : ''}" style="align-items:center;${f === cur ? 'color:#e8c46a' : ''}">
      <span>第 ${f} 层 · ${ch.name}<br><span class="muted" style="font-size:10px">${isBoss ? '守关：' + boss.name : mobs}</span></span>
      <span><button class="btn btn-sm ${f === cur ? 'btn-jade' : ''}" data-floor="${f}" ${f === cur ? 'disabled' : ''}>前往</button></span>
    </div>`);
  }

  el.innerHTML = `
    <div class="panel-title">秘境</div>
    <div class="kv"><span>当前</span><span class="gold">第 ${cur} 层 · ${chap.name}</span></div>
    <div class="kv"><span>最高通关</span><span>第 ${best} 层</span></div>
    <div class="kv"><span>守关者</span><span>${cur % BALANCE.bossEvery === 0 ? BOSSES[chap.boss].name : '每 10 层一遇'}</span></div>
    <div class="row mb8">
      <label class="tgl"><input type="checkbox" id="chkAutoAdvance" ${s.settings.autoAdvance ? 'checked' : ''}><span>自动推进</span></label>
      <span class="muted" style="font-size:10px">关后自动下一层</span>
    </div>
    <div class="row mb8">
      <input type="number" id="inpFloor" value="${cur}" min="1" max="${maxFloor}" style="width:80px;background:#0a0e15;color:var(--text);border:1px solid var(--line);padding:3px 6px;font-family:inherit">
      <button class="btn btn-sm" id="btnGoFloor">跳层</button>
    </div>
    <div class="sub-title">可选层数</div>
    ${rows.join('')}
    <div class="muted mt8">小提示：越深的层掉落越好，但打不过就是白给。卡关时回来刷浅层攒装备更划算。</div>`;

  const chk = el.querySelector('#chkAutoAdvance');
  if (chk) chk.onchange = () => { s.settings.autoAdvance = chk.checked; game.save(); };

  const jump = () => {
    const v = Math.max(1, Math.min(maxFloor, Number(el.querySelector('#inpFloor').value) || 1));
    game.setFloor(v);
  };
  const go = el.querySelector('#btnGoFloor');
  if (go) go.onclick = jump;
  const inp = el.querySelector('#inpFloor');
  if (inp) inp.onkeydown = (e) => { if (e.key === 'Enter') jump(); };

  el.querySelectorAll('[data-floor]').forEach((b) => {
    b.onclick = () => game.setFloor(Number(b.dataset.floor));
  });
}
