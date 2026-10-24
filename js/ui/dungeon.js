// 秘境面板：选层、刷层设置
import { CHAPTERS, MOBS, BOSSES, BALANCE } from '../data/config.js';
import { icon, isFullPage, pageHead, cardHead } from './theme.js';

function chapterOf(floor) {
  return CHAPTERS[Math.floor((floor - 1) / 10) % CHAPTERS.length];
}

export function renderDungeon(game, el) {
  const s = game.state;
  const fullPage = isFullPage(el);
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
    rows.push(`<div class="floor-item${f === cur ? ' current' : ''}${isBoss ? ' boss' : ''}">
      <span class="floor-node">${f}</span>
      <div class="floor-main">
        <div class="floor-title"><b>${ch.name}</b>${isBoss ? ' · 守关' : ''}</div>
        <div class="floor-sub-line">${isBoss ? boss.name : mobs}</div>
      </div>
      <button class="btn btn-sm ${f === cur ? 'btn-jade' : ''}" data-floor="${f}" ${f === cur ? 'disabled' : ''}>${f === cur ? '所在' : '前往'}</button>
    </div>`);
  }

  const hero = `<div class="floor-hero">
    <div>
      <div class="floor-kicker">当前所在</div>
      <div class="floor-big">第 ${cur} 层 · ${chap.name}</div>
      <div class="floor-sub">守关者：${cur % BALANCE.bossEvery === 0 ? BOSSES[chap.boss].name : `每 ${BALANCE.bossEvery} 层一遇`}</div>
    </div>
    <div>
      <div class="floor-kicker">最高通关</div>
      <div class="floor-big">${best}</div>
      <div class="floor-sub">层</div>
    </div>
    <div>
      <div class="floor-kicker">下一层</div>
      <div class="floor-big">${maxFloor}</div>
      <div class="floor-sub">${maxFloor % BALANCE.bossEvery === 0 ? '守关层' : '可挑战'}</div>
    </div>
  </div>`;

  const controls = `<div class="row mb8">
      <label class="tgl"><input type="checkbox" id="chkAutoAdvance" ${s.settings.autoAdvance ? 'checked' : ''}><span>自动推进</span></label>
      <span class="muted small">关后自动下一层</span>
      <span style="flex:1"></span>
      <input type="number" id="inpFloor" value="${cur}" min="1" max="${maxFloor}" style="width:86px">
      <button class="btn btn-sm" id="btnGoFloor">跳层</button>
    </div>`;

  const list = `<div class="floor-list">${rows.join('')}</div>`;

  if (fullPage) {
    el.innerHTML = `
      ${pageHead({
        kicker: 'DUNGEON · 秘境',
        title: '秘境',
        desc: '山门之外，云深不知处。越往深处走，宝物越好，也越容易把命留下。',
      })}
      ${hero}
      <section class="card">
        ${cardHead('层数选择', `可选 ${start}–${maxFloor} 层`, 'dungeon')}
        ${controls}
        ${list}
      </section>
      <section class="card" style="margin-top:12px">
        <div class="muted small">${icon('spark')} 越深的层掉落越好，但打不过就是白给。卡关时回来刷浅层攒装备更划算。</div>
      </section>`;
  } else {
    el.innerHTML = `
      <div class="panel-title">秘境</div>
      ${hero}
      ${controls}
      <div class="sub-title">可选层数</div>
      ${list}
      <div class="muted small mt8">小提示：越深的层掉落越好，但打不过就是白给。卡关时回来刷浅层攒装备更划算。</div>`;
  }

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
