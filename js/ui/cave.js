// 洞府：炼丹 + 炼器
import { RECIPES, BLUEPRINTS, QUALITY_NAMES, canAfford, pay, queueAlchemy, forge, upgradeCost, upgradeChance, reroll } from '../game/crafting.js';
import { SPRITES } from '../data/sprites.js';
import { Rng } from '../engine/rng.js';
import { showTooltip, hideTooltip, toast } from './modal.js';
import { SLOTS } from '../data/config.js';
import { farmState, plant, harvest, plotInfo, SEEDS, water, clearPest, assignGuard } from '../game/farm.js';
import { spiritName } from '../game/fate.js';

const MAT_NAME = { iron: '玄铁', bone: '妖骨', jade: '寒玉', wood: '灵木', core: '妖丹', herb: '灵草' };

function img(key) {
  const meta = SPRITES.images[key];
  return meta ? meta.src : null;
}

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

  // 灵田
  const farm = farmState(s);
  const plotHtml = farm.plots.map((_, i) => {
    const info = plotInfo(s, i);
    if (info.empty) {
      return `<div class="kv"><span>第 ${i + 1} 块 · 空地</span>
        <span>${SEEDS.map((sd) => `<button class="btn btn-sm" data-seed="${sd.key}">${sd.name} ${sd.cost}</button>`).join(' ')}</span></div>`;
    }
    const guardName = info.guard === 'tool' ? '傀儡看守' : (info.guard === 'spirit' ? '器灵看守' : '无');
    const bug = info.pest ? '<span class="red">有虫害！产量减半</span>' : '';
    return `<div class="kv" style="align-items:center">
      <span>第 ${i + 1} 块 · ${info.seed.name} <span class="muted">${guardName}</span><br>
        <span class="muted" style="font-size:10px">${info.ready ? '已成熟' : '还差 ' + Math.ceil(info.left / 60) + ' 分钟'}</span>
        ${bug ? `<br><span style="font-size:10px">${bug}</span>` : ''}</span>
      <span>
        ${info.pest ? `<button class="btn btn-sm" data-pest="${i}">除虫</button>` : ''}
        ${!info.ready && !info.guard ? `<button class="btn btn-sm" data-water="${i}">浇灌</button>` : ''}
        ${!info.guard ? `<button class="btn btn-sm" data-guard="${i}">派守</button>` : ''}
        ${info.ready ? `<button class="btn btn-sm btn-jade" data-harvest="${i}">收获</button>` : ''}
      </span>
    </div>
    <div class="bar bar-xp" style="margin:2px 0 6px"><div class="bar-track"><i style="width:${info.pct}%"></i></div></div>`;
  }).join('');
  const farmHtml = plotHtml + `<div class="muted" style="font-size:10px">${SEEDS.map((sd) => sd.name + '：' + sd.desc).join('<br>')}
    <br>浇灌 30 灵石：剩余时间减半（每块地最多 2 次）；虫害使产量减半，除虫免费。</div>`;

  el.innerHTML = `
    <div class="panel-title">洞府</div>
    <div class="sub-title">灵田</div>
    ${farmHtml}
    <div class="sub-title">丹炉</div>
    <div class="row mb8">
      <button class="btn btn-sm" data-tab2="pill">丹药 ${s.pills.length}</button>
      <span class="muted">炼丹等级 Lv.${s.alchemyLevel || 1}</span>
    </div>
    ${queue}
    <div class="sub-title">丹方</div>
    ${recipeHtml}
    <div class="sub-title">丹药</div>
    ${pillHtml}
    <div class="sub-title">图纸</div>
    ${blueHtml}
    <div class="sub-title">炼器 · 强化 / 洗练</div>
    ${equipList}`;

  // 事件绑定
  el.querySelectorAll('[data-pest]').forEach((b) => {
    b.onclick = () => {
      const r = clearPest(s, Number(b.dataset.pest));
      if (r.error) { toast(r.error); return; }
      game.log('灵田里的虫被赶走了。', 'l-good');
      game.save();
      renderCave(game, el);
    };
  });

  el.querySelectorAll('[data-water]').forEach((b) => {
    b.onclick = () => {
      const r = water(s, Number(b.dataset.water));
      if (r.error) { toast(r.error); return; }
      game.log('浇了一遍水，苗长快了些。', 'l-good');
      game.save();
      renderCave(game, el);
    };
  });

  el.querySelectorAll('[data-guard]').forEach((b) => {
    b.onclick = () => {
      const idx = Number(b.dataset.guard);
      // 优先派器灵（免费），没有器灵或器灵已占则造傀儡
      const spiritFree = s.fate && s.fate.unlocked
        && !farm.plots.some((p) => p && p.guard === 'spirit');
      const kind = spiritFree ? 'spirit' : 'tool';
      const r = assignGuard(s, idx, kind);
      if (r.error) { toast(r.error); return; }
      game.log(kind === 'spirit'
        ? `${spiritName(s)}自愿去看守灵田了：「交给我。」`
        : '炼了一具傀儡放在田里守着。', 'l-good');
      game.save();
      renderCave(game, el);
    };
  });

  el.querySelectorAll('[data-seed]').forEach((b) => {
    b.onclick = () => {
      const r = plant(s, b.dataset.seed);
      if (r.error) { toast(r.error); return; }
      game.log(`在灵田种下了${r.seed.name}。`, 'l-good');
      game.save();
      renderCave(game, el);
    };
  });

  el.querySelectorAll('[data-harvest]').forEach((b) => {
    b.onclick = () => {
      const r = harvest(s, Number(b.dataset.harvest));
      if (r.error) { toast(r.error); return; }
      const parts = Object.entries(r.yield).map(([k, v]) => `${k === 'herb' ? '灵草' : k === 'core' ? '妖丹' : '寒玉'} +${v}`).join('、');
      game.log(`收获${r.seed.name}：${parts}`, 'l-loot');
      toast(`收获 ${parts}`, '#6fd68a');
      game.save();
      renderCave(game, el);
    };
  });

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
      const i = Number(b.dataset.pill);
      const pill = s.pills[i];
      if (!pill) return;
      s.pills.splice(i, 1);
      game.usePill(pill);
      game.save();
      renderCave(game, el);
    };
  });

  el.querySelectorAll('[data-blue]').forEach((b) => {
    b.onclick = () => {
      const bp = BLUEPRINTS.find((x) => x.key === b.dataset.blue);
      const cost = { iron: bp.iron || 0, bone: bp.bone || 0, jade: bp.jade || 0, wood: bp.wood || 0, coin: bp.coin };
      if (!canAfford(s, cost)) { toast('材料不足'); return; }
      pay(s, cost);
      const item = forge(s, bp, Math.max(1, s.floor), new Rng());
      if (s.bag.length >= 60) { toast('背包满了，先分解点东西'); return; }
      s.bag.push(item);
      game.log(`铁锤真人出品：${item.name}（${item.power} 战力）`, 'l-loot');
      game.recompute();
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
        game.log(`强化成功：${item.name} +${item.plus}`, 'l-good');
        game.countQuest('upgrade');
        game.state.stats.upgrade = (game.state.stats.upgrade || 0) + 1;
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
      if (s.mats.core < 1) { toast('需要一枚妖丹'); return; }
      s.mats.core -= 1;
      if (reroll(item, new Rng())) {
        game.log(`洗练 ${item.name}，词缀有变。`, 'l-loot');
      }
      game.recompute();
      game.save();
      renderCave(game, el);
    };
  });
}
