// 技能栏：显示冷却、解锁状态与战斗速度
import { SKILLS, isUnlocked } from '../game/skills.js';
import { maxSpeed } from '../game/state.js';
import { toast } from './modal.js';

let game = null;
let el = null;

export function buildSkillBar(g) {
  game = g;
  el = document.getElementById('skillBar');
  el.innerHTML = `
    <button class="speed-btn" id="speedBtn" aria-label="战斗速度 1 倍" title="战斗速度 1 倍">×1</button>
    ${SKILLS.map((s, i) => `
      <div class="skill" data-i="${i}" title="${s.desc}">
        <span class="glyph" style="color:${s.color}">${s.glyph}</span>
        <div class="cd" style="display:none"></div>
      </div>`).join('')}
    <span class="muted" id="skillHint" style="font-size:11px"></span>`;

  el.querySelectorAll('.skill').forEach((node) => {
    node.onclick = () => {
      const s = SKILLS[Number(node.dataset.i)];
      toast(`【${s.name}】${s.desc}`);
    };
  });
  const speedBtn = el.querySelector('#speedBtn');
  if (speedBtn) speedBtn.onclick = () => game.cycleSpeed();
  refreshSkillBar();
}

export function refreshSkillBar() {
  if (!game || !el) return;
  const state = game.state;
  const cds = game.combat ? game.combat.skillCds : [];
  const speedBtn = el.querySelector('#speedBtn');
  if (speedBtn) {
    const cur = state.settings.speed || 1;
    const max = maxSpeed(state);
    const title = `战斗速度 ${cur} 倍，点击切换（最高 ×${max}）`;
    speedBtn.textContent = '×' + cur;
    speedBtn.title = title;
    speedBtn.setAttribute('aria-label', title);
    speedBtn.classList.toggle('locked', max === 1);
  }
  SKILLS.forEach((s, i) => {
    const node = el.querySelector(`.skill[data-i="${i}"]`);
    if (!node) return;
    const unlocked = isUnlocked(s, state);
    const cd = cds[i] || 0;
    node.classList.toggle('ready', unlocked && cd <= 0);
    const cdEl = node.querySelector('.cd');
    if (!unlocked) {
      cdEl.style.display = 'grid';
      cdEl.textContent = s.unlockRealm !== undefined
        ? ['炼气', '筑基', '金丹', '元婴'][s.unlockRealm]
        : 'Lv' + s.unlockLevel;
      cdEl.style.fontSize = '11px';
    } else if (cd > 0) {
      cdEl.style.display = 'grid';
      cdEl.textContent = cd.toFixed(1);
    } else {
      cdEl.style.display = 'none';
    }
  });
  const hint = el.querySelector('#skillHint');
  if (hint) {
    const need = SKILLS.filter((s) => !isUnlocked(s, state))
      .map((s) => (s.unlockRealm !== undefined ? `${['炼气', '筑基', '金丹', '元婴'][s.unlockRealm]}期` : `Lv.${s.unlockLevel}`))
      .join('、');
    hint.textContent = need ? `解锁中：${need}` : '技能已全开';
  }
}
