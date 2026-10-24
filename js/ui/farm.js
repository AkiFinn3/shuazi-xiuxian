// 灵田：种植、浇灌、除虫、看守与收获
import {
  farmState,
  plant,
  harvest,
  plotInfo,
  SEEDS,
  water,
  clearPest,
  assignGuard,
} from '../game/farm.js';
import { spiritName } from '../game/fate.js';
import { toast } from './modal.js';

export function renderFarm(game, el, opts = {}) {
  const s = game.state;
  const rerender = opts.rerender || (() => renderFarm(game, el, opts));
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

  el.innerHTML = `
    <div class="panel-title">灵田</div>
    <div class="row mb8">
      <span class="muted" style="font-size:10px">灵草与妖丹的主要来源。浇灌、除虫与看守都会影响产量。</span>
    </div>
    ${plotHtml}
    <div class="muted" style="font-size:10px">${SEEDS.map((sd) => sd.name + '：' + sd.desc).join('<br>')}
      <br>浇灌 30 灵石：剩余时间减半（每块地最多 2 次）；虫害使产量减半，除虫免费。</div>`;

  el.querySelectorAll('[data-pest]').forEach((b) => {
    b.onclick = () => {
      const r = clearPest(s, Number(b.dataset.pest));
      if (r.error) { toast(r.error); return; }
      game.log('灵田里的虫被赶走了。', 'l-good');
      game.save();
      rerender();
    };
  });

  el.querySelectorAll('[data-water]').forEach((b) => {
    b.onclick = () => {
      const r = water(s, Number(b.dataset.water));
      if (r.error) { toast(r.error); return; }
      game.log('浇了一遍水，苗长快了些。', 'l-good');
      game.save();
      rerender();
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
      rerender();
    };
  });

  el.querySelectorAll('[data-seed]').forEach((b) => {
    b.onclick = () => {
      const r = plant(s, b.dataset.seed);
      if (r.error) { toast(r.error); return; }
      game.log(`在灵田种下了${r.seed.name}。`, 'l-good');
      game.save();
      rerender();
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
      rerender();
    };
  });
}
