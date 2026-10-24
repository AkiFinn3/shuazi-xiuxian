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

const MOBILE_ITEMS = [
  { key: 'battle', label: '战斗', glyph: '战' },
  { key: 'character', label: '角色', glyph: '角' },
  { key: 'bag', label: '背包', glyph: '包' },
  { key: 'cave', label: '洞府', glyph: '府' },
  { key: 'sect', label: '宗门', glyph: '宗' },
  { key: 'more', label: '更多', glyph: '更' },
];

const MORE_ITEMS = [
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
  renderMobileNav();
  ensureMoreSheet();
  setNavActive('battle');
}

function renderMobileNav() {
  const nav = document.getElementById('navMobile');
  if (!nav) return;
  nav.innerHTML = MOBILE_ITEMS.map((item) => `
    <button data-mobile-nav="${item.key}" title="${item.label}" aria-label="${item.label}">
      <span class="ni">${item.glyph}</span>
      <span class="nl">${item.label}</span>
    </button>`).join('');
  nav.querySelectorAll('[data-mobile-nav]').forEach((btn) => {
    btn.onclick = () => {
      if (btn.dataset.mobileNav === 'more') openMoreSheet();
      else selectHandler(btn.dataset.mobileNav);
    };
  });
}

function ensureMoreSheet() {
  const root = document.getElementById('moreSheet');
  if (!root || root.dataset.ready === '1') return;
  root.dataset.ready = '1';
  root.innerHTML = `
    <div class="sheet-mask"></div>
    <div class="sheet more-sheet">
      <div class="sheet-grab"></div>
      <div class="sheet-title">更多</div>
      <div class="more-grid">
        ${MORE_ITEMS.map((item) => `
          <button class="more-item" data-more="${item.key}">
            <span class="ni">${item.glyph}</span>
            <span class="nl">${item.label}</span>
          </button>`).join('')}
        <button class="more-item" data-more="settings">
          <span class="ni">设</span>
          <span class="nl">设置</span>
        </button>
      </div>
    </div>`;
  root.querySelector('.sheet-mask').onclick = closeMoreSheet;
  root.querySelectorAll('[data-more]').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.more;
      closeMoreSheet();
      if (key === 'settings') {
        if (gameRef) gameRef.showSettings();
      } else {
        selectHandler(key);
      }
    };
  });
}

export function openMoreSheet() {
  const root = document.getElementById('moreSheet');
  if (root) root.hidden = false;
}

export function closeMoreSheet() {
  const root = document.getElementById('moreSheet');
  if (root) root.hidden = true;
}

export function setNavActive(key) {
  activeKey = key;
  const rail = document.getElementById('navRail');
  if (rail) {
    rail.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.nav === key);
    });
  }
  const mobile = document.getElementById('navMobile');
  if (mobile) {
    const inMore = key === 'farm' || key === 'dungeon' || key === 'fate' || key === 'ascend';
    mobile.querySelectorAll('[data-mobile-nav]').forEach((btn) => {
      const target = btn.dataset.mobileNav;
      btn.classList.toggle('on', target === key || (target === 'more' && inMore));
    });
  }
}
