// 随机事件弹窗
import { openModal, closeModal } from './modal.js';

export function showEvent(game, event) {
  const wasPaused = game.paused;
  game.paused = true;

  openModal((box) => {
    box.innerHTML = `
      <h2>${event.title}</h2>
      <p class="muted" style="margin-top:6px">${event.text}</p>
      <div class="divider"></div>
      <div id="evChoices"></div>`;

    const wrap = box.querySelector('#evChoices');
    event.choices.forEach((ch) => {
      const b = document.createElement('button');
      b.className = 'btn';
      b.style.display = 'block';
      b.style.width = '100%';
      b.style.marginBottom = '6px';
      b.style.textAlign = 'left';
      b.innerHTML = `${ch.label}<span class="muted" style="float:right">${ch.hint || ''}</span>`;
      b.onclick = () => {
        const r = ch.resolve(game) || {};
        game.log(`${event.title}：${r.text || ''}`, 'l-good');
        closeModal();
        game.paused = wasPaused;
        game.recompute();
        game.save();
      };
      wrap.appendChild(b);
    });
  }, { width: '480px', dismissible: false });
}
