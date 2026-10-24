// 灵根展示与测灵根弹窗
import {
  ELEMENTS,
  ELEMENT_META,
  GRADES,
  rootBonusText,
  spiritRootSummary,
} from '../game/spirit_root.js';
import { openModal } from './modal.js';

export function rootCardsHtml(roots, realm = 0) {
  if (!roots) {
    return `<div class="root-lock">${realm >= 1 ? '灵根未测，稍后自动测灵根。' : '灵根未测，筑基后开启。'}</div>`;
  }
  const cards = roots.roots.map((root) => {
    const meta = ELEMENT_META[root.elem];
    return `<div class="root-card" style="--root-color:${meta.color}">
      <div class="root-elem">${meta.name}</div>
      <div class="root-grade">${GRADES[root.grade]}</div>
      <div class="root-effect">${meta.effect}：${meta.desc}</div>
    </div>`;
  }).join('');
  const bonus = rootBonusText(roots);
  return `<div class="roots ${roots.heavenly ? 'heavenly' : ''}">
    ${roots.heavenly ? '<div class="root-title">天灵根</div>' : ''}
    <div class="root-cards">${cards}</div>
    <div class="root-bonus">${bonus.join(' · ') || '无额外属性'}</div>
  </div>`;
}

export function renderRootBlock(game) {
  const roots = game.state.spiritRoots;
  return `<div class="sub-title">灵根</div>${rootCardsHtml(roots, game.state.realm)}`;
}

/**
 * 结果必须已经写入 state 并保存，本弹窗只负责展示。
 */
export function openRootTest(game, roots, opts = {}) {
  openModal((box, close) => {
    box.innerHTML = `
      <h2>${opts.retest ? '重测灵根' : '测灵根'}</h2>
      <p class="muted">${roots.heavenly ? '五色灵光冲天而起。' : '灵石映出你体内的灵根。'}</p>
      <div class="root-stage ${roots.heavenly ? 'heavenly' : ''}" id="rootStage">
        <div class="root-orbs">
          ${ELEMENTS.map((elem, i) => `
            <span class="root-orb" style="--root-color:${ELEMENT_META[elem].color};--i:${i}">
              ${ELEMENT_META[elem].name}
            </span>`).join('')}
        </div>
        <div class="root-result">${rootCardsHtml(roots, 1)}</div>
      </div>
      <p class="muted mt8">${spiritRootSummary(roots)}</p>
      <div class="row end mt8"><button class="btn btn-gold" id="rootOk">确认</button></div>`;

    box.querySelector('#rootOk').onclick = () => {
      close();
      if (opts.onDone) opts.onDone();
    };

    setTimeout(() => {
      const stage = box.querySelector('#rootStage');
      if (stage) stage.classList.add('reveal');
    }, 1200);
  }, { width: '520px', dismissible: false });
}
