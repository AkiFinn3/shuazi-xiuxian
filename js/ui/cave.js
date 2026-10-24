// 洞府：炼丹 + 炼器
import { RECIPES, BLUEPRINTS, canAfford, pay, queueAlchemy, forge, upgradeCost, upgradeChance, reroll } from '../game/crafting.js';
import { Rng } from '../engine/rng.js';
import { toast } from './modal.js';
import { itemPower } from '../game/state.js';
import { bagSize } from '../game/ascend.js';

const MAT_NAME = { iron: '玄铁', bone: '妖骨', jade: '寒玉', wood: '灵木', core: '妖丹', herb: '灵草' };
let caveTab = 'alchemy';

function costText(cost) {
  return Object.entries(cost)
    .map(([k, v]) => `${k === 'coin' ? '灵石' : MAT_NAME[k] || k} ${v}`)
    .join('、');
}

export function renderCave(game, el) {
  const s = game.state;
  s.alchemy = s.alchemy || [];
  s.pills = s.pills || [];
  s.mats.herb = s.mats.herb || 0;

  const queue = s.alchemy.map((job) => {
    const r = RECIPES.find((x) => x.key === job.key);
    const pct = Math.max(0, Math.min(100, (1 - job.remain / job.total) * 100));
    return `<div class="kv"><span>${r ? r.name : job.key}</span><span>${job.done ? '可收取' : Math.ceil(job.remain) + 's'}</span></div>
      <div class="bar bar-xp" style="margin:2px 0 8px"><div class="bar-track"><i style="width:${pct}%"></i></div></div>`;
  }).join('') || '<div class="muted">丹炉空着。闲得慌。</div>';

  const recipeHtml = RECIPES.map((r) => {
    const cost = { herb: r.herb, core: r.core, coin: r.coin };
    const ok = canAfford(s, cost);
    return `<div class="kv" style="align-items:center">
      <span>${r.name}<br><span class="muted" style="font-size:10px">${costText(cost)} · ${r.time}s</span></span>
      <span><button class="btn btn-sm ${ok ? 'btn-jade' : ''}" data-recipe="${r.key}" ${ok ? '' : 'disabled'}>炼制</button></span>
    </div>`;
  }).join('');

  const pillHtml = s.pills.length
    ? s.pills.map((p, i) => `<div class="kv"><span>${p.name}<br><span class="muted" style="font-size:10px">${p.quality}${p.exp ? ' · 修为 +' + p.exp : ''}</span></span>
        <span><button class="btn btn-sm" data-pill="${i}">服用</button></span></div>`).join('')
    : '<div class="muted">没有丹药。丹霞仙子会笑你。</div>';

  const blueHtml = BLUEPRINTS.map((b) => {
    const cost = { iron: b.iron || 0, bone: b.bone || 0, jade: b.jade || 0, wood: b.wood || 0, coin: b.coin };
    const ok = canAfford(s, cost);
    return `<div class="kv" style="align-items:center">
      <span>${b.name}<br><span class="muted" style="font-size:10px">${costText(cost)}</span></span>
      <span><button class="btn btn-sm ${ok ? 'btn-jade' : ''}" data-blue="${b.key}" ${ok ? '' : 'disabled'}>打造</button></span>
    </div>`;
  }).join('');

  const equipList = Object.entries(s.equip).filter(([, v]) => v).map(([slot, item]) => {    const cost = upgradeCost(item);
    const chance = upgradeChance(item);
    return `<div class="kv" style="align-items:center">
      <span>${item.name} <span class="muted">+${item.plus || 0}</span><br>
        <span class="muted" style="font-size:10px">强化 ${Math.round(chance * 100)}% · ${costText(cost)}</span></span>
      <span>
        <button class="btn btn-sm" data-up="${slot}">强化</button>
        <button class="btn btn-sm" data-rr="${slot}">洗练</button>
      </span></div>`;
  }).join('') || '<div class="muted">身上没装备。</div>';

  el.innerHTML = `
    <div class="panel-title">洞府</div>
    <div class="tabs cave-tabs">
      <div class="tab ${caveTab === 'alchemy' ? 'on' : ''}" data-cave-tab="alchemy">炼丹</div>
      <div class="tab ${caveTab === 'forge' ? 'on' : ''}" data-cave-tab="forge">炼器</div>
    </div>
    ${caveTab === 'alchemy' ? `
      <div class="row mb8">
        <span class="muted">炼丹等级 Lv.${s.alchemyLevel || 1}</span>
      </div>
      ${queue}
      <div class="sub-title">丹方</div>
      ${recipeHtml}
      <div class="sub-title">丹药</div>
      ${pillHtml}
    ` : `
      <div class="sub-title">图纸</div>
      ${blueHtml}
      <div class="sub-title">炼器 · 强化 / 洗练</div>
      ${equipList}
    `}`;

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
