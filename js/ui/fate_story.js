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
      <div style="text-align:center;background:#0a0e15;border:1px solid var(--line);border-radius:3px;padding:10px;margin:10px 0">
        ${sprite ? `<img src="${sprite}" style="max-width:80%;max-height:80px;image-rendering:pixelated">` : ''}
        <div class="muted" style="font-size:11px;margin-top:4px">${name} · ${tier} · 器灵「${who}」</div>
      </div>
      <div style="white-space:pre-wrap;line-height:1.9">${story.text.replace(/器灵/g, who)}</div>
      <div class="row end mt8"><button class="btn btn-gold" id="fsOk">记下</button></div>`;
    box.querySelector('#fsOk').onclick = closeModal;
  }, { width: '460px' });
}
