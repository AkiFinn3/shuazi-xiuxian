// 主界面导航：桌面侧栏；Task 5 追加移动底栏与更多弹层
export const NAV_ITEMS = [
  { key: 'battle', label: '战斗', glyph: '战' },
  { key: 'character', label: '角色', glyph: '角' },
  { key: 'bag', label: '背包', glyph: '包' },
  { key: 'cave', label: '洞府', glyph: '府' },
  { key: 'sect', label: '宗门', glyph: '宗' },
  { key: 'farm', label: '灵田', glyph: '田' },
  { key: 'dungeon', label: '秘境', glyph: '秘' },
  { key: 'fate', label: '法宝', glyph: '宝' },
  { key: 'ascend', label: '仙缘', glyph: '缘' },
];

let gameRef = null;
let selectHandler = () => {};
let activeKey = 'battle';

export function initNav(game, onSelect) {
  gameRef = game;
  selectHandler = onSelect;
  const rail = document.getElementById('navRail');
  if (!rail) return;
  rail.innerHTML = NAV_ITEMS.map((item) => `
    <button data-nav="${item.key}" title="${item.label}" aria-label="${item.label}">
      <span class="ni">${item.glyph}</span>
      <span class="nl">${item.label}</span>
    </button>`).join('');
  rail.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.onclick = () => selectHandler(btn.dataset.nav);
  });
  setNavActive('battle');
}

export function setNavActive(key) {
  activeKey = key;
  const rail = document.getElementById('navRail');
  if (rail) {
    rail.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.nav === key);
    });
  }
}
