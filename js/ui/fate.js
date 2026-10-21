// 法宝面板：觉醒、进化、培养、词条吸收
import { FATE_TYPES, FATE_TIERS, FATE_SLOTS, fateSprite, fateMeta, fateLevelFromExp, tierFromLevel, addFateExp, absorbAffix, fateBonusText, canAwaken, spiritName, SPIRIT_NAMES } from '../game/fate.js';
import { STAT_LABEL } from '../data/config.js';
import { rarityIndex } from '../game/loot.js';
import { toast } from './modal.js';
import { FATE_STORIES } from '../data/fate_stories.js';
import { showFateStory } from './fate_story.js';

export function renderFate(game, el) {
  const s = game.state;
  const fate = s.fate || (s.fate = { unlocked: false, type: null, tier: 1, level: 1, exp: 0, affixes: {} });

  if (!fate.unlocked) {
    const ok = canAwaken(s);
    el.innerHTML = `
      <div class="panel-title">本命法宝</div>
      <div class="muted mb8">金丹期方可觉醒本命法宝。器灵会随你杀敌而成长，最终成为人器合一的 partner。</div>
      ${ok ? '' : `<div class="kv"><span>当前境界</span><span>${['炼气', '筑基', '金丹'][Math.min(2, s.realm)]}期</span></div>`}
      <div class="row mt8"><button class="btn btn-gold" id="fateAwaken" ${ok ? '' : 'disabled'}>觉醒法宝</button></div>`;
    const btn = el.querySelector('#fateAwaken');
    if (btn) btn.onclick = () => renderTypePicker(game, el);
    return;
  }

  const type = FATE_TYPES[fate.type] || FATE_TYPES.jian;
  const tier = FATE_TIERS[fate.tier - 1];
  const lv = fateLevelFromExp(fate.exp);
  const sprite = fateSprite(fate.type, fate.tier);
  const meta = fateMeta(fate.type, fate.tier);

  const slotHtml = Array.from({ length: FATE_SLOTS }, (_, i) => {
    const entries = Object.entries(fate.affixes || {});
    const e = entries[i];
    if (!e) return `<div class="kv"><span>词条槽 ${i + 1}</span><span class="muted">空</span></div>`;
    const pct = ['crit', 'critDmg', 'aspd', 'lifesteal', 'elem'].includes(e[0]);
    return `<div class="kv"><span>${STAT_LABEL[e[0]] || e[0]}</span><span class="jade">+${pct ? e[1].toFixed(1) + '%' : Math.round(e[1])}</span></div>`;
  }).join('');

  // 可吸收的词缀（来自背包）
  const candidates = s.bag
    .map((it) => ({ it, affixes: Object.entries(it.affixes || {}) }))
    .filter((x) => x.affixes.length)
    .slice(0, 12);
  const candHtml = candidates.length ? candidates.map(({ it, affixes }) => {    const rarity = rarityIndex(it.rarity);
    return `<div class="kv" style="align-items:center">
      <span>${it.name}<br><span class="muted" style="font-size:10px">${affixes.map(([k, v]) => `${STAT_LABEL[k] || k}+${v}`).join('、')}</span></span>
      <span>${affixes.map(([k, v]) => `<button class="btn btn-sm" data-absorb="${k}" data-val="${v}" data-name="${it.name}">吸收</button>`).join(' ')}</span>
    </div>`;
  }).join('') : '<div class="muted">背包里没有带词缀的装备。</div>';

  // 器灵手记
  const seen = s.fateStories || {};
  const storyHtml = FATE_STORIES.map((st) => {
    const got = !!seen[st.id];
    return `<div class="kv" style="align-items:center;${got ? '' : 'opacity:.4'}">
      <span>${got ? st.title : '？？？'}</span>
      <span>${got ? `<button class="btn btn-sm" data-story="${st.id}">重读</button>` : ''}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="panel-title">本命法宝</div>
    <div style="text-align:center;background:#0a0e15;border:1px solid var(--line);border-radius:3px;padding:8px;margin-bottom:8px">
      ${sprite ? `<img src="${sprite}" style="max-width:100%;max-height:74px;image-rendering:pixelated">` : ''}
      <div class="gold" style="font-size:14px;margin-top:4px">${type.name} · ${tier.name}</div>
      <div class="muted" style="font-size:11px">器灵「${spiritName(s)}」</div>
      <div class="muted" style="font-size:11px">${tier.desc}</div>
    </div>
    <div class="row mb8">
      <input type="text" id="inpSpiritName" value="${spiritName(s)}" maxlength="6" placeholder="给器灵起个名" style="flex:1;background:#0a0e15;color:var(--text);border:1px solid var(--line);padding:4px 6px;font-family:inherit;font-size:12px">
      <button class="btn btn-sm" id="btnRename">改名</button>
    </div>
    <div class="kv"><span>器灵等级</span><span>Lv.${fate.level}</span></div>
    <div class="bar bar-xp" style="margin:4px 0 8px"><div class="bar-track"><i style="width:${Math.min(100, (lv.rest / lv.need) * 100)}%"></i></div></div>
    <div class="sub-title">器灵加成</div>
    <div class="stat-list">
      ${fateBonusText(s).map((b) => `<div><span class="k">${b}</span><span>·</span></div>`).join('') || '<div class="k">尚无</div>'}
    </div>
    <div class="sub-title">器灵词条</div>
    ${slotHtml}
    <div class="row mt8">
      <button class="btn btn-sm btn-jade" id="fateFeed">培养（妖丹 1 · 玄铁 2）</button>
    </div>
    <div class="sub-title">吸收词缀</div>
    ${candHtml}
    <div class="sub-title">器灵手记</div>
    ${storyHtml}`;

  const rename = el.querySelector('#btnRename');
  if (rename) {
    rename.onclick = () => {
      const inp = el.querySelector('#inpSpiritName');
      const v = (inp.value || '').trim();
      if (!v) { toast('总得有个名字'); return; }
      if (v.length > 6) { toast('名字太长，器灵记不住'); return; }
      const old = spiritName(s);
      s.fate.name = v;
      game.log(`器灵改名：「${old}」→「${v}」。它似乎不太满意。`, 'l-good');
      game.save();
      renderFate(game, el);
    };
  }

  const feed = el.querySelector('#fateFeed');  if (feed) feed.onclick = () => {
    if ((s.mats.core || 0) < 1 || (s.mats.iron || 0) < 2) { toast('材料不足（妖丹 1 · 玄铁 2）'); return; }
    s.mats.core -= 1;
    s.mats.iron -= 2;
    const r = addFateExp(s, 45);
    game.log(`培养本命法宝，器灵修为 +45${r && r.tierUp ? '，法宝进化了！' : ''}`, 'l-good');
    game.recompute();
    game.save();
    renderFate(game, el);
  };

  el.querySelectorAll('[data-story]').forEach((b) => {
    b.onclick = () => {
      const st = FATE_STORIES.find((x) => x.id === b.dataset.story);
      if (st) showFateStory(game, st);
    };
  });

  el.querySelectorAll('[data-absorb]').forEach((b) => {
    b.onclick = () => {
      const key = b.dataset.absorb;
      const val = Number(b.dataset.val);
      if (absorbAffix(s, key, val)) {
        game.log(`器灵吸收了「${STAT_LABEL[key] || key}」，还剩 ${FATE_SLOTS - Object.keys(s.fate.affixes).length} 个空槽。`, 'l-loot');
        game.recompute();
        game.save();
        renderFate(game, el);
      } else {
        toast('词条槽已满或已有该词条');
      }
    };
  });
}

function renderTypePicker(game, el) {
  el.innerHTML = `
    <div class="panel-title">选择本命法宝</div>
    <div class="muted mb8">一旦觉醒不可更换（除非飞升转生）。器灵性格随法宝而定。</div>
    <div class="field">
      <label>给器灵起个名字（最多 6 字）</label>
      <input type="text" id="inpNewName" maxlength="6" value="${SPIRIT_NAMES[Math.floor(Math.random() * SPIRIT_NAMES.length)]}" />
      <div class="chips" id="nameChips">
        ${SPIRIT_NAMES.map((n) => `<span class="chip" data-name="${n}">${n}</span>`).join('')}
      </div>
    </div>
    <div class="origins">
      ${Object.values(FATE_TYPES).map((t) => {
        const src = fateSprite(t.key, 1);
        return `<div class="origin" data-type="${t.key}">
          <b>${t.name}</b>
          <span>主属性：${t.bonus}</span>
          <div style="margin-top:4px">${src ? `<img src="${src}" style="max-width:100%;max-height:34px;image-rendering:pixelated">` : ''}</div>
        </div>`;
      }).join('')}
    </div>`;

  el.querySelectorAll('[data-name]').forEach((c) => {
    c.onclick = () => { el.querySelector('#inpNewName').value = c.dataset.name; };
  });

  el.querySelectorAll('[data-type]').forEach((node) => {
    node.onclick = () => {
      const s = game.state;
      const nm = (el.querySelector('#inpNewName').value || '').trim() || '二狗';
      s.fate.unlocked = true;
      s.fate.type = node.dataset.type;
      s.fate.name = nm.slice(0, 6);
      s.fate.tier = 1;
      s.fate.level = 1;
      s.fate.exp = 0;
      s.fate.affixes = {};
      const name = FATE_TYPES[s.fate.type].name;
      game.log(`器灵苏醒：${name}。它自称「${s.fate.name}」。`, 'l-good');
      game.recompute();
      game.save();
      renderFate(game, el);
    };
  });
}
