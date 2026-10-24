// 侧边面板：装备栏、属性、背包
import { SLOTS, RARITIES, STAT_LABEL } from '../data/config.js';
import { realmLabel, expNeed, nextRealmFloor, levelIndex, originOf } from '../game/state.js';
import { rarityIndex, isBetter } from '../game/loot.js';
import { showTooltip, moveTooltip, hideTooltip, toast } from './modal.js';
import { renderCave } from './cave.js';
import { renderSect } from './sect.js';
import { renderFate } from './fate.js';
import { renderDungeon } from './dungeon.js';
import { renderAscend } from './ascend.js';
import { bagSize } from '../game/ascend.js';
import { openItemSheet } from './sheet.js';
import { fateSprite, FATE_TYPES, FATE_TIERS } from '../game/fate.js';
import { renderRootBlock, rootCardsHtml } from './roots.js';
import { icon, pageHead, cardHead, playerPortrait } from './theme.js';

const SLOT_GLYPH = { weapon: '兵', helmet: '冠', robe: '袍', boots: '靴', pendant: '佩', ring: '戒' };
const SLOT_ICON = {
  weapon: 'weapon',
  helmet: 'helmet',
  robe: 'robe',
  boots: 'boots',
  pendant: 'pendant',
  ring: 'ring',
};
const MAT_NAME = {
  iron: '玄铁', bone: '妖骨', jade: '寒玉', wood: '灵木', core: '妖丹', herb: '灵草', wine: '酒',
};

let game = null;
let leftPanel, rightPanel;
let rightTab = 'gear';
const dirty = { left: false, right: false };
const LIVE_TABS = new Set(['cave', 'sect', 'fate', 'dungeon', 'ascend']);
let panelsMounted = true;
let dirtyHook = null;

/** 是否触屏设备（没有 hover） */
export function isTouch() {
  return window.matchMedia && window.matchMedia('(hover: none)').matches;
}

export function setPanelDirtyHook(fn) {
  dirtyHook = fn;
}

export function setPanelsMounted(mounted) {
  panelsMounted = !!mounted;
  if (!panelsMounted) {
    if (leftPanel) leftPanel.innerHTML = '';
    if (rightPanel) rightPanel.innerHTML = '';
  }
}

export function buildPanels(g) {
  game = g;
  leftPanel = document.getElementById('leftPanel');
  rightPanel = document.getElementById('rightPanel');
  panelsMounted = true;
  dirty.left = dirty.right = false;
  renderLeft();
  renderRight();
}

export function refreshPanels() {
  if (!game || !panelsMounted) return;
  dirty.left = dirty.right = false;
  renderLeft();
  renderRight();
}

/** 标记面板需要重绘，由主循环合并刷新 */
export function markPanelsDirty(which = 'both') {
  if (which === 'left' || which === 'both') dirty.left = true;
  if (which === 'right' || which === 'both') dirty.right = true;
  if (dirtyHook) dirtyHook(which);
}

/** 合并刷新的入口：每个周期最多重建一次 DOM */
export function flushPanels() {
  if (!game || !panelsMounted) return;
  if (dirty.left) { dirty.left = false; renderLeft(); }
  if (dirty.right) {
    dirty.right = false;
    // 背包内容只在背包页完整重建；其它页只更新页签计数，
    // 避免挂机掉落时反复重建洞府/宗门面板。
    if (rightTab === 'gear') renderRight();
    else updateBagTab();
  }
}

function updateBagTab() {
  if (!rightPanel) return;
  const tab = rightPanel.querySelector('.tab[data-tab="gear"]');
  if (tab) tab.textContent = `背包 ${game.state.bag.length}/${bagSize(game.state)}`;
}

/**
 * 定时刷新右栏实时数据（炼丹倒计时、灵田成熟）。
 * 只重建内容区并保留滚动位置，避免打断阅读和误触。
 */
export function refreshLivePanel() {
  if (!game || !panelsMounted || !rightPanel || !LIVE_TABS.has(rightTab)) return;
  if (!rightPanel.offsetWidth) return;
  const modal = document.getElementById('modalRoot');
  if (modal && !modal.hidden) return;
  const active = document.activeElement;
  if (active && rightPanel.contains(active) && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)) return;
  const body = rightPanel.querySelector('#rightBody');
  if (!body) return;
  const scroll = rightPanel.scrollTop;
  renderRightBody(body);
  rightPanel.scrollTop = scroll;
}

/** 切换右侧标签页（并立即重绘） */
export function setRightTab(tab) {
  rightTab = tab;
  if (game) {
    renderRight();
    rightPanel.scrollTop = 0;
  }
}

/** 当前右侧标签页 */
export function currentTab() {
  return rightTab;
}

/* ---------------- 左：装备与属性 ---------------- */
export function renderCharacter(g, root, opts = {}) {
  renderLeftInto(g, root, { ...opts, full: true, showRoots: true });
}

function slotIconMarkup(item, slot) {
  if (!item) return icon(SLOT_ICON[slot.key]);
  return iconHtml(item, slot);
}

function renderLeftInto(g, root, opts = {}) {
  const s = g.state;
  const stats = g.stats;
  const scroll = root.scrollTop;
  const rerender = opts.rerender || refreshPanels;

  const need = expNeed(s);
  const gate = nextRealmFloor(s);
  const fate = s.fate || {};
  const origin = originOf(s);

  const slotCards = SLOTS.map((slot) => {
    const item = s.equip[slot.key];
    const rarity = item ? RARITIES[rarityIndex(item.rarity)] : null;
    const color = rarity ? rarity.color : 'var(--ink-3)';
    return `<div class="equip-card${item ? '' : ' equip-empty'}" data-slot="${slot.key}">
      <div class="equip-icon"${item ? ` style="border-color:${color}"` : ''}>${slotIconMarkup(item, slot)}</div>
      <div class="equip-main">
        <div class="equip-name"${item ? ` style="color:${color}"` : ''}>${item ? item.name : slot.name}</div>
        <div class="equip-sub">${item ? `${rarity.name} · ${item.ilvl}阶 · 战力 ${item.power}` : '未装备'}</div>
      </div>
    </div>`;
  }).join('');

  const fateCard = fate.unlocked
    ? `<div class="equip-card" id="fateSlot">
        <div class="equip-icon" style="border-color:var(--gold-soft);color:var(--gold-deep)">
          ${fateSprite(fate.type, fate.tier) ? `<img src="${fateSprite(fate.type, fate.tier)}" alt="">` : icon('fate')}
        </div>
        <div class="equip-main">
          <div class="equip-name" style="color:var(--gold-deep)">${FATE_TYPES[fate.type].name}</div>
          <div class="equip-sub">${FATE_TIERS[fate.tier - 1].name} · 器灵 Lv.${fate.level}</div>
        </div>
      </div>`
    : `<div class="equip-card equip-empty" id="fateSlot">
        <div class="equip-icon">${icon('fate')}</div>
        <div class="equip-main">
          <div class="equip-name">本命法宝</div>
          <div class="equip-sub">${s.realm >= 2 ? '点击觉醒' : '金丹期可觉醒'}</div>
        </div>
      </div>`;

  const slotRows = SLOTS.map((slot) => {
    const item = s.equip[slot.key];
    const rarity = item ? RARITIES[rarityIndex(item.rarity)] : null;
    const color = rarity ? rarity.color : 'var(--ink-3)';
    return `<div class="slot" data-slot="${slot.key}">
      <div class="slot-icon" style="${item ? `border-color:${color}` : ''}">${slotIconMarkup(item, slot)}</div>
      <div class="slot-info">
        <div class="slot-name" style="color:${color}">${item ? item.name : slot.name}</div>
        <div class="slot-sub">${item ? `${rarity.name} · ${item.ilvl}阶 · 战力 ${item.power}` : '未装备'}</div>
      </div>
    </div>`;
  }).join('');

  const fateRow = fate.unlocked
    ? `<div class="slot" id="fateSlot">
        <div class="slot-icon" style="border-color:var(--gold-soft);color:var(--gold-deep)">
          ${fateSprite(fate.type, fate.tier) ? `<img src="${fateSprite(fate.type, fate.tier)}" alt="">` : icon('fate')}
        </div>
        <div class="slot-info">
          <div class="slot-name" style="color:var(--gold-deep)">${FATE_TYPES[fate.type].name}</div>
          <div class="slot-sub">${FATE_TIERS[fate.tier - 1].name} · 器灵 Lv.${fate.level}</div>
        </div>
      </div>`
    : `<div class="slot" id="fateSlot">
        <div class="slot-icon">${icon('fate')}</div>
        <div class="slot-info">
          <div class="slot-name">本命法宝</div>
          <div class="slot-sub">${s.realm >= 2 ? '点击觉醒' : '金丹期可觉醒'}</div>
        </div>
      </div>`;

  const statsHtml = `
    <div class="stat-list">
      <div><span class="k">攻击</span><span>${stats.atk}</span></div>
      <div><span class="k">气血</span><span>${stats.maxHp}</span></div>
      <div><span class="k">防御</span><span>${stats.def}</span></div>
      <div><span class="k">暴击</span><span>${stats.crit.toFixed(1)}%</span></div>
      <div><span class="k">暴伤</span><span>${stats.critDmg.toFixed(0)}%</span></div>
      <div><span class="k">攻速</span><span>${stats.aspd.toFixed(2)}/秒</span></div>
      <div><span class="k">吸血</span><span>${stats.lifesteal.toFixed(1)}%</span></div>
      <div><span class="k">幸运</span><span>${stats.luck.toFixed(0)}</span></div>
      <div><span class="k">元素伤害</span><span>${stats.elem.toFixed(1)}%</span></div>
    </div>`;

  const progressHtml = `
    <div class="stat-list">
      <div><span class="k">境界</span><span>${realmLabel(s)}</span></div>
      <div><span class="k">修为</span><span>${Math.floor(s.exp)}/${need}</span></div>
      ${gate !== null && s.bestFloor < gate ? `<div><span class="k">境界瓶颈</span><span class="red">需通关第 ${gate} 层</span></div>` : ''}
      <div><span class="k">击杀</span><span>${s.stats.kills}</span></div>
      <div><span class="k">掉落</span><span>${s.stats.drops}</span></div>
      <div><span class="k">分解</span><span>${s.stats.salvaged}</span></div>
      <div><span class="k">死亡</span><span>${s.stats.deaths}</span></div>
    </div>`;

  if (opts.full) {
    const statBlocks = [
      ['攻击', stats.atk], ['气血', stats.maxHp], ['防御', stats.def],
      ['暴击', stats.crit.toFixed(1), '%'], ['暴伤', stats.critDmg.toFixed(0), '%'], ['攻速', stats.aspd.toFixed(2), '/秒'],
      ['吸血', stats.lifesteal.toFixed(1), '%'], ['幸运', stats.luck.toFixed(0)], ['元素伤害', stats.elem.toFixed(1), '%'],
    ].map(([k, v, unit]) => `<div class="stat-block">
      <div class="stat-k">${k}</div>
      <div class="stat-v">${v}${unit ? `<small>${unit}</small>` : ''}</div>
    </div>`).join('');

    root.innerHTML = `
      ${pageHead({
        kicker: 'CHARACTER · 道途',
        title: '角色',
        desc: '一身道行、六件器物，与五行灵根共同写就的修行履历。',
      })}
      <div class="char-grid">
        <section class="card identity-card">
          <div class="identity-main">
            <div class="portrait-seal"><img src="${playerPortrait(s.appearance)}" alt=""></div>
            <div>
              <div class="identity-name">${s.name}</div>
              <div class="identity-meta">${realmLabel(s)} · Lv.${levelIndex(s)} · 战力 ${stats.power}</div>
              <div class="identity-tags">
                <span class="tag jade">${origin.name}</span>
                ${s.title ? `<span class="tag gold">${s.title}</span>` : ''}
                ${s.spiritRoots ? `<span class="tag">${s.spiritRoots.heavenly ? '天灵根' : '五行灵根'}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="identity-progress">
            <div class="bar bar-xp">
              <span class="bar-label">修为</span>
              <div class="bar-track"><i style="width:${Math.min(100, (s.exp / need) * 100)}%"></i></div>
              <span class="bar-text">${Math.floor(s.exp)}/${need}</span>
            </div>
            ${gate !== null && s.bestFloor < gate ? `<div class="small red" style="margin-top:6px">境界瓶颈：需通关第 ${gate} 层</div>` : ''}
          </div>
        </section>
        <section class="card">
          ${cardHead('属性', '由境界、装备与灵根共同结算', 'power')}
          <div class="stat-grid">${statBlocks}</div>
        </section>
      </div>
      <div class="char-grid">
        <section class="card">
          ${cardHead('修行灵根', s.spiritRoots ? '五行相济' : '筑基后开启', 'spark')}
          ${rootCardsHtml(s.spiritRoots, s.realm)}
        </section>
        <section class="card">
          ${cardHead('修为历程', '', 'scroll')}
          ${progressHtml}
        </section>
      </div>
      <section class="card">
        ${cardHead('随身装备', '点击卸下', 'robe')}
        <div class="equip-grid">${slotCards}${fateCard}</div>
      </section>`;
  } else {
    root.innerHTML = `
      <div class="panel-title">装备</div>
      <div class="paperdoll">
        <div class="pd-mid"><div class="pd-body"><img src="${playerPortrait(s.appearance, true)}" alt=""></div></div>
        <div>${slotRows}${fateRow}</div>
      </div>
      <div class="sub-title">属性</div>${statsHtml}
      <div class="sub-title">修为</div>${progressHtml}`;
  }

  root.scrollTop = scroll;

  root.querySelectorAll('[data-slot]').forEach((el) => {
    el.onclick = () => {
      const key = el.dataset.slot;
      const item = g.state.equip[key];
      if (!item) return;
      if (g.state.bag.length >= bagSize(g.state)) { toast('背包满了'); return; }
      g.state.equip[key] = null;
      g.state.bag.push(item);
      g.recompute();
      g.save();
      rerender();
    };
  });

  const fateSlot = root.querySelector('#fateSlot');
  if (fateSlot) {
    fateSlot.onclick = () => {
      if (opts.onOpenFate) { opts.onOpenFate(); return; }
      setRightTab('fate');
      rerender();
    };
  }
}

function renderLeft() {
  renderLeftInto(game, leftPanel, { rerender: refreshPanels, full: false, showRoots: false });
}

/* ---------------- 右：背包 / 洞府 / 宗门 ---------------- */
function renderRight() {
  const s = game.state;
  const scroll = rightPanel.scrollTop;
  rightPanel.innerHTML = `
    <div class="tabs">
      <div class="tab ${rightTab === 'gear' ? 'on' : ''}" data-tab="gear">背包 ${s.bag.length}/${bagSize(s)}</div>
      <div class="tab ${rightTab === 'cave' ? 'on' : ''}" data-tab="cave">洞府</div>
      <div class="tab ${rightTab === 'sect' ? 'on' : ''}" data-tab="sect">宗门</div>
      <div class="tab ${rightTab === 'fate' ? 'on' : ''}" data-tab="fate">法宝</div>
      <div class="tab ${rightTab === 'dungeon' ? 'on' : ''}" data-tab="dungeon">秘境</div>
      <div class="tab ${rightTab === 'ascend' ? 'on' : ''}" data-tab="ascend">仙缘</div>
    </div>
    <div id="rightBody"></div>`;

  renderRightBody(rightPanel.querySelector('#rightBody'));
  rightPanel.scrollTop = scroll;

  rightPanel.querySelectorAll('.tab').forEach((el) => {
    el.onclick = () => {
      rightTab = el.dataset.tab;
      renderRight();
      rightPanel.scrollTop = 0;
    };
  });
}

function renderRightBody(body) {
  if (!body) return;
  if (rightTab === 'cave') renderCave(game, body);
  else if (rightTab === 'sect') renderSect(game, body);
  else if (rightTab === 'fate') renderFate(game, body);
  else if (rightTab === 'dungeon') renderDungeon(game, body);
  else if (rightTab === 'ascend') renderAscend(game, body);
  else renderBagInto(game, body);
}

export function renderBagInto(g, body, opts = {}) {
  const s = g.state;
  const rerender = opts.rerender || refreshPanels;
  const cells = [];
  for (let i = 0; i < bagSize(s); i++) {
    const item = s.bag[i];
    if (!item) {
      cells.push('<div class="cell"></div>');
      continue;
    }
    const rarity = RARITIES[rarityIndex(item.rarity)];
    const eq = s.equip[item.slot];
    const better = isBetter(item, eq, 1.0);
    const slot = SLOTS.find((x) => x.key === item.slot);
    cells.push(`<div class="cell has" data-id="${item.id}" style="border-color:${rarity.color}">
      ${iconHtml(item, slot)}
      ${better ? '<span class="up">▲</span>' : ''}
    </div>`);
  }

  const mats = Object.entries(s.mats).filter(([, v]) => v > 0).map(([k, v]) =>
    `<div class="mat-card"><span>${MAT_NAME[k] || k}</span><b>${v}</b></div>`).join('')
    || '<div class="empty-state">暂无材料。</div>';

  const controls = `
    <div class="bag-toolbar mb8">
      <div class="bag-toolbar-group">
        <button class="btn btn-sm btn-jade" id="btnBest">一键最优</button>
        <button class="btn btn-sm" id="btnSalvageLow">分解低阶</button>
        <button class="btn btn-sm" id="btnSalvageAll">全部分解</button>
      </div>
      <div class="bag-toolbar-group">
        <label class="tgl"><input type="checkbox" id="chkAutoSalvage" ${s.settings.autoSalvage ? 'checked' : ''}><span>自动分解</span></label>
        <select id="selSalvageLevel" class="btn btn-sm" style="width:auto;height:28px;padding:0 8px">
          ${RARITIES.map((r) => `<option value="${r.key}" ${s.settings.autoSalvageBelow === r.key ? 'selected' : ''}>${r.name}以下</option>`).join('')}
        </select>
      </div>
    </div>`;

  body.innerHTML = `
    ${opts.full ? pageHead({
      kicker: 'INVENTORY · 行囊',
      title: '背包',
      desc: `随身器物与天材地宝。${s.bag.length}/${bagSize(s)} 格已用。`,
    }) : ''}
    <section class="card">
      ${opts.full ? cardHead('行囊', `${s.bag.length}/${bagSize(s)}`, 'bag') : ''}
      ${controls}
      <div class="bag-grid">${cells.join('')}</div>
    </section>
    <section class="card" style="margin-top:12px">
      ${cardHead('材料', '炼丹、炼器与赠礼所需', 'herb')}
      <div class="mat-grid">${mats}</div>
    </section>`;

  const chk = body.querySelector('#chkAutoSalvage');
  if (chk) {
    chk.onchange = () => {
      g.state.settings.autoSalvage = chk.checked;
      const foot = document.getElementById('tglAutoSalvage');
      if (foot) foot.checked = chk.checked;
      g.save();
    };
  }
  const sel = body.querySelector('#selSalvageLevel');
  if (sel) sel.onchange = () => { g.state.settings.autoSalvageBelow = sel.value; g.save(); };

  const best = body.querySelector('#btnBest');
  if (best) best.onclick = () => { g.equipBest(); rerender(); };
  const sl = body.querySelector('#btnSalvageLow');
  if (sl) sl.onclick = () => { g.salvageBelow(); rerender(); };
  const sa = body.querySelector('#btnSalvageAll');
  if (sa) {
    sa.onclick = () => {
      if (!g.state.bag.length) { toast('背包是空的'); return; }
      if (!confirm(`确定分解背包里的 ${g.state.bag.length} 件装备吗？`)) return;
      g.salvageAll();
      rerender();
    };
  }

  body.querySelectorAll('.cell.has').forEach((el) => {
    const item = g.state.bag.find((x) => x.id === Number(el.dataset.id));
    if (!item) return;
    el.onmouseenter = (e) => showTooltip(itemTooltip(item, g.state), e.clientX, e.clientY);
    el.onmousemove = (e) => moveTooltip(e.clientX, e.clientY);
    el.onmouseleave = hideTooltip;
    el.onclick = () => {
      if (isTouch()) {
        openItemSheet(item, {
          onEquip: (it) => { g.equipItem(it.id); rerender(); },
          onSalvage: (it) => { g.salvageItem(it.id); rerender(); },
        });
        return;
      }
      g.equipItem(item.id);
      rerender();
    };
    el.oncontextmenu = (e) => { e.preventDefault(); g.salvageItem(item.id); rerender(); };
  });
}

/* ---------------- 物品展示 ---------------- */
function iconHtml(item, slotDef) {
  if (item.slot === 'weapon' && item.icon) {
    return `<img src="${item.icon}" alt="">`;
  }
  const rarity = RARITIES[rarityIndex(item.rarity)];
  const iconName = SLOT_ICON[item.slot];
  return iconName
    ? icon(iconName)
    : `<span style="color:${rarity.color};font-size:15px">${SLOT_GLYPH[item.slot] || '器'}</span>`;
}

export function itemTooltip(item, state = game && game.state) {
  const s = state;
  if (!s) return '';
  const rarity = RARITIES[rarityIndex(item.rarity)];
  const eq = s.equip[item.slot];
  const lines = [];
  lines.push(`<div class="tt-name" style="color:${rarity.color}">${item.name}</div>`);
  lines.push(`<div class="tt-line">${rarity.name} · ${item.ilvl}阶 · 战力 ${item.power}</div>`);
  for (const [k, v] of Object.entries(item.base)) {
    lines.push(`<div class="tt-line">${STAT_LABEL[k] || k} +${fmtStat(k, v)}</div>`);
  }
  for (const [k, v] of Object.entries(item.affixes)) {
    const cmp = eq && eq.affixes && eq.affixes[k] !== undefined ? v - eq.affixes[k] : null;
    const cls = cmp === null ? '' : (cmp >= 0 ? 'tt-up' : 'tt-down');
    const mark = cmp === null ? '' : (cmp >= 0 ? ' ▲' : ' ▼');
    lines.push(`<div class="tt-affix ${cls}">${STAT_LABEL[k] || k} +${fmtStat(k, v)}${mark}</div>`);
  }
  if (eq) {
    const diff = item.power - eq.power;
    const cls = diff >= 0 ? 'tt-up' : 'tt-down';
    lines.push(`<div class="tt-line ${cls}" style="margin-top:4px">对比 ${eq.name}：${diff >= 0 ? '+' : ''}${diff} 战力</div>`);
  } else if (!isTouch()) {
    lines.push('<div class="tt-line" style="margin-top:4px">点击装备</div>');
  }
  if (!isTouch()) {
    lines.push('<div class="tt-line" style="margin-top:4px">右键分解</div>');
  }
  return lines.join('');
}

function fmtStat(key, v) {
  const pct = ['crit', 'critDmg', 'aspd', 'lifesteal', 'coin', 'spirit', 'elem'].includes(key);
  return pct ? v.toFixed(1) + '%' : Math.round(v);
}
