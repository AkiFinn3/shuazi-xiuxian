// 器灵小故事弹窗
import { openModal, closeModal } from './modal.js';
import { fateSprite, FATE_TYPES, FATE_TIERS, spiritName } from '../game/fate.js';

export function showFateStory(game, story) {
  const s = game.state;
  const sprite = s.fate && s.fate.type ? fateSprite(s.fate.type, s.fate.tier) : null;
  const name = s.fate && s.fate.type ? FATE_TYPES[s.fate.type].name : '本命法宝';
  const tier = s.fate && s.fate.tier ? FATE_TIERS[s.fate.tier - 1].name : '';
  const who = spiritName(s);

  openModal((box) => {
    box.innerHTML = `
      <h2>器灵手记 · ${story.title}</h2>
      <div class="fate-hero" style="justify-content:center;text-align:center;margin:12px 0">
        <div class="fate-medallion">${sprite ? `<img src="${sprite}" alt="">` : ''}</div>
        <div>
          <div class="fate-tier">${name} · ${tier}</div>
          <div class="fate-name" style="font-size:16px">器灵「${who}」</div>
        </div>
      </div>
      <div style="white-space:pre-wrap;line-height:1.95">${story.text.replace(/器灵/g, who)}</div>
      <div class="row end mt8"><button class="btn btn-gold" id="fsOk">记下</button></div>`;
    box.querySelector('#fsOk').onclick = closeModal;
  }, { width: '460px' });
}
