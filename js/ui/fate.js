// 法宝面板：觉醒、进化、培养、词条吸收
import { FATE_TYPES, FATE_TIERS, FATE_SLOTS, fateSprite, fateLevelFromExp, addFateExp, absorbAffix, fateBonusText, canAwaken, spiritName, SPIRIT_NAMES } from '../game/fate.js';
import { STAT_LABEL } from '../data/config.js';
import { toast } from './modal.js';
import { FATE_STORIES } from '../data/fate_stories.js';
import { showFateStory } from './fate_story.js';
import { icon, isFullPage, pageHead, cardHead, barHtml } from './theme.js';

const PCT_AFFIX = new Set(['crit', 'critDmg', 'aspd', 'lifesteal', 'elem', 'coin', 'spirit']);

function fmtAffixValue(key, value) {
  const n = Number(value) || 0;
  if (PCT_AFFIX.has(key)) return n.toFixed(1).replace(/\.0$/, '') + '%';
  return String(Math.round(n));
}

export function renderFate(game, el) {
  const s = game.state;
  const fullPage = isFullPage(el);
  const fate = s.fate || (s.fate = { unlocked: false, type: null, tier: 1, level: 1, exp: 0, affixes: {} });

  if (!fate.unlocked) {
    const ok = canAwaken(s);
    el.innerHTML = `
      ${fullPage ? pageHead({
        kicker: 'ARTIFACT · 法宝',
        title: '本命法宝',
        desc: '金丹之后，可唤醒一件与本命相连的法宝。器灵会随你杀敌成长，最终人器合一。',
      }) : '<div class="panel-title">本命法宝</div>'}
      <section class="card">
        <div class="empty-state" style="padding:40px 20px">
          ${icon('fate')}
          <div style="font-family:var(--font-serif);font-size:16px;color:var(--ink-0);margin-bottom:6px">尚无法宝</div>
          <div>当前境界：${['炼气', '筑基', '金丹'][Math.min(2, s.realm)]}期。${ok ? '灵台已清，可以觉醒。' : '金丹期方可觉醒。'}</div>
          <div class="row" style="justify-content:center;margin-top:16px">
            <button class="btn btn-gold" id="fateAwaken" ${ok ? '' : 'disabled'}>${ok ? '觉醒法宝' : '境界未至'}</button>
          </div>
        </div>
      </section>`;
    const btn = el.querySelector('#fateAwaken');
    if (btn) btn.onclick = () => renderTypePicker(game, el);
    return;
  }

  const type = FATE_TYPES[fate.type] || FATE_TYPES.jian;
  const tier = FATE_TIERS[fate.tier - 1];
  const lv = fateLevelFromExp(fate.exp);
  const sprite = fateSprite(fate.type, fate.tier);

  const slotHtml = Array.from({ length: FATE_SLOTS }, (_, i) => {
    const entries = Object.entries(fate.affixes || {});
    const e = entries[i];
    if (!e) return `<div class="kv"><span>词条槽 ${i + 1}</span><span class="muted">空置</span></div>`;
    return `<div class="kv"><span>${STAT_LABEL[e[0]] || e[0]}</span><span class="jade">+${fmtAffixValue(e[0], e[1])}</span></div>`;
  }).join('');

  const candidates = s.bag
    .map((it) => ({ it, affixes: Object.entries(it.affixes || {}) }))
    .filter((x) => x.affixes.length)
    .slice(0, 12);
  const candHtml = candidates.length ? candidates.map(({ it, affixes }) =>
    `<div class="talent-item">
      <div class="talent-main">
        <div class="talent-name">${it.name}</div>
        <div class="talent-desc">${affixes.map(([k, v]) => `${STAT_LABEL[k] || k} +${fmtAffixValue(k, v)}`).join('，')}</div>
      </div>
      <span class="plot-actions fate-actions">${affixes.map(([k, v]) => `<button class="btn btn-sm" data-absorb="${k}" data-val="${v}" data-name="${it.name}">取「${STAT_LABEL[k] || k}」</button>`).join(' ')}</span>
    </div>`).join('') : '<div class="empty-state">背包里没有带词缀的装备。</div>';

  const seen = s.fateStories || {};
  const storyHtml = FATE_STORIES.map((st) => {
    const got = !!seen[st.id];
    return `<div class="talent-item" style="${got ? '' : 'opacity:.4'}">
      <div class="talent-main">
        <div class="talent-name">${got ? st.title : '？？？'}</div>
        <div class="talent-desc">${got ? '已收录' : '尚未发生'}</div>
      </div>
      <span>${got ? `<button class="btn btn-sm" data-story="${st.id}">重读</button>` : ''}</span>
    </div>`;
  }).join('');

  const hero = `<div class="fate-hero">
    <div class="fate-medallion">${sprite ? `<img src="${sprite}" alt="">` : icon('fate')}</div>
    <div class="fate-hero-main">
      <div class="fate-name">${type.name}</div>
      <div class="fate-tier">${tier.name} · 器灵「${spiritName(s)}」</div>
      <div class="muted small" style="margin-top:4px">${tier.desc}</div>
      <div class="fate-rename">
        <input type="text" id="inpSpiritName" value="${spiritName(s)}" maxlength="6" placeholder="给器灵起个名">
        <button class="btn btn-sm" id="btnRename">改名</button>
      </div>
    </div>
  </div>`;

  const levelBlock = `<div class="kv"><span>器灵等级</span><span>Lv.${fate.level}</span></div>
    ${barHtml(Math.min(100, (lv.rest / lv.need) * 100))}`;

  const statusCard = `<section class="card">
    ${cardHead('器灵状态', `${type.name} · ${tier.name}`, 'fate')}
    ${levelBlock}
    <div class="sub-title">器灵加成</div>
    <div class="fate-bonus">
      ${fateBonusText(s).map((b) => `<span>${b}</span>`).join('') || '<span class="muted">尚无</span>'}
    </div>
    <div class="sub-title">器灵词条</div>
    ${slotHtml}
    <div class="row mt8">
      <button class="btn btn-sm btn-jade" id="fateFeed">${icon('spark')}<span>培养（妖丹 1 · 玄铁 2）</span></button>
    </div>
  </section>`;

  const absorbCard = `<section class="card">
    ${cardHead('吸收词缀', `${FATE_SLOTS - Object.keys(fate.affixes || {}).length} 个空槽`, 'spark')}
    <div class="talent-list">${candHtml}</div>
  </section>`;

  const storyCard = `<section class="card">
    ${cardHead('器灵手记', '', 'scroll')}
    <div class="talent-list">${storyHtml}</div>
  </section>`;

  el.innerHTML = `
    ${fullPage ? pageHead({
      kicker: 'ARTIFACT · 法宝',
      title: '本命法宝',
      desc: '器灵与修士同呼吸。喂它妖丹与玄铁，也喂它一些值得记住的事。',
    }) : '<div class="panel-title">本命法宝</div>'}
    ${hero}
    ${fullPage
      ? `<div class="split-grid">${statusCard}${absorbCard}</div>
         <div style="margin-top:12px">${storyCard}</div>`
      : `${statusCard}${absorbCard}${storyCard}`}`;

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

  const feed = el.querySelector('#fateFeed');
  if (feed) feed.onclick = () => {
    if ((s.mats.core || 0) < 1 || (s.mats.iron || 0) < 2) { toast('材料不足（妖丹 1 · 玄铁 2）'); return; }
    s.mats.core -= 1;
    s.mats.iron -= 2;
    const r = addFateExp(s, 45);
    game.log(`培养本命法宝，器灵修为 +45${r && r.tierUp ? '，法宝进化了！' : ''}`, 'l-good');
    game.recompute();
    game.markPanels('left');
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
        game.markPanels('left');
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
          <div style="margin-top:4px">${src ? `<img src="${src}" alt="" style="max-width:100%;max-height:34px">` : ''}</div>
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
      game.markPanels('both');
      game.save();
      renderFate(game, el);
    };
  });
}
