// 洞府：炼丹 + 炼器
import { RECIPES, BLUEPRINTS, canAfford, pay, queueAlchemy, forge, upgradeCost, upgradeChance, reroll } from '../game/crafting.js';
import { Rng } from '../engine/rng.js';
import { toast } from './modal.js';
import { itemPower } from '../game/state.js';
import { bagSize } from '../game/ascend.js';
import { icon, isFullPage, pageHead, cardHead, barHtml } from './theme.js';

const MAT_NAME = { iron: '玄铁', bone: '妖骨', jade: '寒玉', wood: '灵木', core: '妖丹', herb: '灵草' };
let caveTab = 'alchemy';

function costText(cost) {
  return Object.entries(cost)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k === 'coin' ? '灵石' : MAT_NAME[k] || k} ${v}`)
    .join('、');
}

export function renderCave(game, el) {
  const s = game.state;
  const fullPage = isFullPage(el);
  s.alchemy = s.alchemy || [];
  s.pills = s.pills || [];
  s.mats.herb = s.mats.herb || 0;

  const queue = s.alchemy.map((job) => {
    const r = RECIPES.find((x) => x.key === job.key);
    const pct = Math.max(0, Math.min(100, (1 - job.remain / job.total) * 100));
    return `<div class="queue-item">
      <div class="queue-head"><span>${r ? r.name : job.key}</span><span>${job.done ? '可收取' : Math.ceil(job.remain) + ' 秒'}</span></div>
      ${barHtml(pct)}
    </div>`;
  }).join('') || '<div class="empty-state">丹炉空着。闲得慌。</div>';

  const recipeHtml = RECIPES.map((r) => {
    const cost = { herb: r.herb, core: r.core, coin: r.coin };
    const ok = canAfford(s, cost);
    return `<div class="recipe-card">
      <div class="recipe-icon">${icon('pill')}</div>
      <div class="recipe-main">
        <div class="recipe-name">${r.name}</div>
        <div class="recipe-cost">${costText(cost)} · ${r.time} 秒</div>
      </div>
      <button class="btn btn-sm ${ok ? 'btn-jade' : ''}" data-recipe="${r.key}" ${ok ? '' : 'disabled'}>炼制</button>
    </div>`;
  }).join('');

  const pillHtml = s.pills.length
    ? s.pills.map((p, i) => `<div class="quest-item">
        <div class="quest-main">
          <div class="quest-name">${p.name}</div>
          <div class="quest-desc">${p.quality}${p.exp ? ' · 修为 +' + p.exp : ''}</div>
        </div>
        <button class="btn btn-sm" data-pill="${i}">服用</button>
      </div>`).join('')
    : '<div class="empty-state">没有丹药。丹霞仙子会笑你。</div>';

  const blueHtml = BLUEPRINTS.map((b) => {
    const cost = { iron: b.iron || 0, bone: b.bone || 0, jade: b.jade || 0, wood: b.wood || 0, coin: b.coin };
    const ok = canAfford(s, cost);
    return `<div class="recipe-card">
      <div class="recipe-icon">${icon('hammer')}</div>
      <div class="recipe-main">
        <div class="recipe-name">${b.name}</div>
        <div class="recipe-cost">${costText(cost)}</div>
      </div>
      <button class="btn btn-sm ${ok ? 'btn-jade' : ''}" data-blue="${b.key}" ${ok ? '' : 'disabled'}>打造</button>
    </div>`;
  }).join('');

  const equipList = Object.entries(s.equip).filter(([, v]) => v).map(([slot, item]) => {
    const cost = upgradeCost(item);
    const chance = upgradeChance(item);
    return `<div class="talent-item">
      <div class="talent-main">
        <div class="talent-name">${item.name} <span class="lv">+${item.plus || 0}</span></div>
        <div class="talent-desc">强化 ${Math.round(chance * 100)}% · ${costText(cost)}</div>
      </div>
      <span class="plot-actions">
        <button class="btn btn-sm" data-up="${slot}">强化</button>
        <button class="btn btn-sm" data-rr="${slot}">洗练</button>
      </span>
    </div>`;
  }).join('') || '<div class="empty-state">身上没装备。</div>';

  const tabs = `<div class="segmented cave-tabs">
    <div class="tab ${caveTab === 'alchemy' ? 'on' : ''}" data-cave-tab="alchemy">炼丹</div>
    <div class="tab ${caveTab === 'forge' ? 'on' : ''}" data-cave-tab="forge">炼器</div>
  </div>`;

  const alchemyBody = fullPage
    ? `<div class="cave-grid">
        <section class="card">
          ${cardHead('丹炉', `炼丹等级 Lv.${s.alchemyLevel || 1}`, 'cauldron')}
          <div class="queue-list">${queue}</div>
          <div class="sub-title">丹方</div>
          <div class="recipe-list">${recipeHtml}</div>
        </section>
        <section class="card">
          ${cardHead('丹药', `${s.pills.length} 枚`, 'pill')}
          <div class="quest-list">${pillHtml}</div>
          <div class="divider"></div>
          <div class="muted small">灵草与妖丹可在灵田与秘境中获得。丹药服用后立即生效，洗髓丹可重测灵根。</div>
        </section>
      </div>`
    : `<div class="row mb8"><span class="muted small">炼丹等级 Lv.${s.alchemyLevel || 1}</span></div>
       <div class="queue-list">${queue}</div>
       <div class="sub-title">丹方</div>
       <div class="recipe-list">${recipeHtml}</div>
       <div class="sub-title">丹药</div>
       <div class="quest-list">${pillHtml}</div>`;

  const forgeBody = fullPage
    ? `<div class="cave-grid">
        <section class="card">
          ${cardHead('图纸', '铁锤真人手笔', 'scroll')}
          <div class="recipe-list">${blueHtml}</div>
        </section>
        <section class="card">
          ${cardHead('强化与洗练', '', 'hammer')}
          <div class="talent-list">${equipList}</div>
        </section>
      </div>`
    : `<div class="sub-title">图纸</div>
       <div class="recipe-list">${blueHtml}</div>
       <div class="sub-title">炼器 · 强化 / 洗练</div>
       <div class="talent-list">${equipList}</div>`;

  el.innerHTML = `
    ${fullPage ? pageHead({
      kicker: 'CAVE · 洞府',
      title: '洞府',
      desc: '一炉丹火，一柄旧锤。修行之外，也要把日子过得像样。',
      actions: tabs,
    }) : `<div class="panel-title">洞府</div>${tabs}`}
    ${caveTab === 'alchemy' ? alchemyBody : forgeBody}`;

  el.querySelectorAll('[data-cave-tab]').forEach((tab) => {
    tab.onclick = () => {
      caveTab = tab.dataset.caveTab;
      renderCave(game, el);
    };
  });

  // 事件绑定
  el.querySelectorAll('[data-recipe]').forEach((b) => {
    b.onclick = () => {
      const r = RECIPES.find((x) => x.key === b.dataset.recipe);
      if (queueAlchemy(s, r)) {
        game.log(`丹炉里多了一炉${r.name}。`, 'l-good');
        game.save();
        renderCave(game, el);
      } else toast('材料不足');
    };
  });

  el.querySelectorAll('[data-pill]').forEach((b) => {
    b.onclick = () => {
      const pill = s.pills[Number(b.dataset.pill)];
      if (!pill) return;
      game.usePill(pill, {
        onConsume: () => {
          const idx = s.pills.indexOf(pill);
          if (idx >= 0) s.pills.splice(idx, 1);
          game.save();
          renderCave(game, el);
        },
      });
    };
  });

  el.querySelectorAll('[data-blue]').forEach((b) => {
    b.onclick = () => {
      const bp = BLUEPRINTS.find((x) => x.key === b.dataset.blue);
      const cost = { iron: bp.iron || 0, bone: bp.bone || 0, jade: bp.jade || 0, wood: bp.wood || 0, coin: bp.coin };
      if (s.bag.length >= bagSize(s)) { toast('背包满了，先分解点东西'); return; }
      if (!canAfford(s, cost)) { toast('材料不足'); return; }
      pay(s, cost);
      const item = forge(s, bp, Math.max(1, s.floor), new Rng());
      s.bag.push(item);
      game.log(`铁锤真人出品：${item.name}（${item.power} 战力）`, 'l-loot');
      game.recompute();
      game.markPanels('right');
      game.save();
      renderCave(game, el);
    };
  });

  el.querySelectorAll('[data-up]').forEach((b) => {
    b.onclick = () => {
      const item = s.equip[b.dataset.up];
      if (!item) return;
      const cost = upgradeCost(item);
      if (!canAfford(s, cost)) { toast('材料不足'); return; }
      pay(s, cost);
      if (Math.random() < upgradeChance(item)) {
        item.plus = (item.plus || 0) + 1;
        const mul = 1 + (item.plus || 0) * 0.09;
        for (const k of Object.keys(item.base)) item.base[k] = Math.round(item.base[k] * mul * 10) / 10;
        item.power = itemPower(item);
        game.log(`强化成功：${item.name} +${item.plus}`, 'l-good');
        game.countQuest('upgrade');
        game.state.stats.upgrade = (game.state.stats.upgrade || 0) + 1;
        game.markPanels('left');
      } else {
        game.log(`强化失败，${item.name} 材料白瞎了。`, 'l-bad');
      }
      game.recompute();
      game.save();
      renderCave(game, el);
    };
  });

  el.querySelectorAll('[data-rr]').forEach((b) => {
    b.onclick = () => {
      const item = s.equip[b.dataset.rr];
      if (!item) return;
      if (!item.affixes || !Object.keys(item.affixes).length) { toast('这件装备没有可洗练的词缀'); return; }
      if (s.mats.core < 1) { toast('需要一枚妖丹'); return; }
      s.mats.core -= 1;
      if (reroll(item, new Rng())) {
        game.log(`洗练 ${item.name}，词缀有变。`, 'l-loot');
        game.markPanels('left');
      }
      game.recompute();
      game.save();
      renderCave(game, el);
    };
  });
}
