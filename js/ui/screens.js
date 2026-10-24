// 屏幕路由：战斗页常驻，其它页面按需挂载
import {
  renderCharacter,
  renderBagInto,
  setPanelDirtyHook,
  setPanelsMounted,
  refreshPanels,
  markPanelsDirty,
} from './panels.js';
import { renderCave } from './cave.js';
import { renderSect } from './sect.js';
import { renderFate } from './fate.js';
import { renderDungeon } from './dungeon.js';
import { renderAscend } from './ascend.js';
import { initNav, setNavActive } from './nav.js';

const PAGES = {
  character: {
    label: '角色',
    render: (g, el) => renderCharacter(g, el, {
      rerender: () => refreshActiveScreen(),
      onOpenFate: () => showScreen('fate'),
    }),
  },
  bag: {
    label: '背包',
    render: (g, el) => renderBagInto(g, el, {
      full: true,
      rerender: () => refreshActiveScreen(),
    }),
  },
  cave: { label: '洞府', render: (g, el) => renderCave(g, el) },
  sect: { label: '宗门', render: (g, el) => renderSect(g, el) },
  dungeon: { label: '秘境', render: (g, el) => renderDungeon(g, el) },
  fate: { label: '法宝', render: (g, el) => renderFate(g, el) },
  ascend: { label: '仙缘', render: (g, el) => renderAscend(g, el) },
};

const LIVE_PAGES = new Set(['character', 'cave', 'sect']);
const PRIMARY_MOBILE = new Set(['battle', 'character', 'bag', 'cave', 'sect']);

let game = null;
let battleScreen = null;
let pageScreen = null;
let active = 'battle';
let pageDirty = false;

export function initScreens(g) {
  game = g;
  battleScreen = document.getElementById('battleScreen');
  pageScreen = document.getElementById('pageScreen');
  setPanelDirtyHook(() => { pageDirty = true; });
  initNav(g, (key) => showScreen(key));
  setPanelsMounted(true);
  showScreen('battle');
}

export function showScreen(key) {
  if (!game || !battleScreen || !pageScreen) return;

  if (key === 'battle') {
    if (active !== 'battle') {
      pageScreen.hidden = true;
      pageScreen.innerHTML = '';
      battleScreen.hidden = false;
      active = 'battle';
      setPanelsMounted(true);
      markPanelsDirty('both');
      refreshPanels();
    }
    battleScreen.hidden = false;
    setNavActive('battle');
    game.render();
    return;
  }

  if (!PAGES[key]) return;
  if (key === active) return;

  if (active === 'battle') {
    setPanelsMounted(false);
  }
  active = key;
  battleScreen.hidden = true;
  pageScreen.hidden = false;
  pageScreen.dataset.screen = key;
  pageScreen.innerHTML = '<div class="page-inner" id="pageBody"></div>';
  pageDirty = false;
  renderPage(key);
  pageScreen.scrollTop = 0;
  setNavActive(key);
}

function renderPage(key) {
  const body = pageScreen.querySelector('#pageBody');
  if (!body || !PAGES[key]) return;
  body.innerHTML = '';
  PAGES[key].render(game, body);
}

export function refreshActiveScreen() {
  if (!game || active === 'battle') return;
  if (pageScreen.hidden) return;
  const modal = document.getElementById('modalRoot');
  if (modal && !modal.hidden) return;
  const focused = document.activeElement;
  if (focused && pageScreen.contains(focused) && /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName)) return;
  const scroll = pageScreen.scrollTop;
  renderPage(active);
  pageScreen.scrollTop = scroll;
}

export function refreshLiveScreen() {
  if (!LIVE_PAGES.has(active)) return;
  refreshActiveScreen();
}

export function flushScreens() {
  if (!pageDirty) return;
  pageDirty = false;
  refreshActiveScreen();
}

export function markScreenDirty(key = active) {
  if (key === active) pageDirty = true;
}

export function currentScreen() {
  return active;
}

export function battleVisible() {
  return active === 'battle';
}
