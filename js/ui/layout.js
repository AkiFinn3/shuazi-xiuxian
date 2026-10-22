// 自适应布局：移动端页签栏、抽屉、竖屏提示
import { setRightTab } from './panels.js';

const TABS = [
  { key: 'equip', label: '装备', panel: 'left' },
  { key: 'gear', label: '背包', panel: 'right', right: 'gear' },
  { key: 'cave', label: '洞府', panel: 'right', right: 'cave' },
  { key: 'sect', label: '宗门', panel: 'right', right: 'sect' },
  { key: 'fate', label: '法宝', panel: 'right', right: 'fate' },
  { key: 'dungeon', label: '秘境', panel: 'right', right: 'dungeon' },
  { key: 'ascend', label: '仙缘', panel: 'right', right: 'ascend' },
];

const mqNarrow = window.matchMedia('(max-width: 900px), (max-height: 560px)');
const mqLandscape = window.matchMedia('(max-height: 560px) and (orientation: landscape)');

let tabbar, scrim, leftPanel, rightPanel;
let activeKey = 'gear';
let mobile = false;
let drawerOpen = false;
let rotateHinted = false;

export function isMobileLayout() { return mobile; }

/** 初始化移动端布局（桌面下只做一次检测，不改结构） */
export function initLayout(game) {
  tabbar = document.getElementById('tabbar');
  scrim = document.getElementById('scrim');
  leftPanel = document.getElementById('leftPanel');
  rightPanel = document.getElementById('rightPanel');

  buildTabbar();
  if (scrim) scrim.onclick = closeDrawer;
  mqNarrow.addEventListener('change', applyMode);
  mqLandscape.addEventListener('change', applyMode);
  applyMode();
  window.addEventListener('orientationchange', () => setTimeout(applyMode, 120));
}

function buildTabbar() {
  if (!tabbar) return;
  tabbar.innerHTML = TABS.map((t) =>
    `<button data-tab="${t.key}" data-right="${t.right || ''}">${t.label}</button>`).join('');
  tabbar.querySelectorAll('button').forEach((b) => {
    b.onclick = () => onTab(b.dataset.tab, b.dataset.right);
  });
}

function applyMode() {
  const narrow = mqNarrow.matches;
  const landscape = mqLandscape.matches;
  mobile = narrow;
  closeDrawer();
  if (narrow) {
    tabbar.hidden = false;
    showPanel(activeKey, landscape);
    markActive();
  } else {
    tabbar.hidden = true;
    leftPanel.classList.remove('mobile-active');
    rightPanel.classList.remove('mobile-active');
    rightPanel.style.transform = '';
  }
  maybeRotateHint();
}

/** 切页签 */
function onTab(key, right) {
  const landscape = mqLandscape.matches;
  if (!landscape) {
    activeKey = key;
    if (right) setRightTab(right);
    showPanel(key, false);
    markActive();
    return;
  }
  // 横屏抽屉：再点当前页签（或遮罩）收起；点其它页签切换内容
  if (drawerOpen && key === activeKey) {
    closeDrawer();
    return;
  }
  activeKey = key;
  if (right) setRightTab(right);
  showPanel(key, true);
  openDrawer();
  markActive();
}

function showPanel(key, landscape) {
  const t = TABS.find((x) => x.key === key) || TABS[1];
  const isLeft = t.panel === 'left';
  if (isLeft) {
    leftPanel.classList.add('mobile-active');
    rightPanel.classList.remove('mobile-active');
  } else {
    rightPanel.classList.add('mobile-active');
    leftPanel.classList.remove('mobile-active');
  }
  if (landscape) {
    leftPanel.style.transform = '';
    rightPanel.style.transform = '';
  }
}

function openDrawer() {
  if (!mobile || !mqLandscape.matches) return;
  const tab = TABS.find((x) => x.key === activeKey) || TABS[1];
  const panel = tab.panel === 'left' ? leftPanel : rightPanel;
  drawerOpen = true;
  panel.style.transform = 'none';
  if (scrim) scrim.hidden = false;
}

function closeDrawer() {
  drawerOpen = false;
  if (leftPanel) leftPanel.style.transform = '';
  if (rightPanel) rightPanel.style.transform = '';
  if (scrim) scrim.hidden = true;
}

function markActive() {
  if (!tabbar) return;
  tabbar.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === activeKey);
  });
}

/** 竖屏时给一次提示 */
function maybeRotateHint() {
  if (rotateHinted) return;
  if (!(mqNarrow.matches && !mqLandscape.matches)) return;
  if (localStorage.getItem('rotateHinted')) { rotateHinted = true; return; }
  rotateHinted = true;
  localStorage.setItem('rotateHinted', '1');
  const el = document.createElement('div');
  el.className = 'rotate-hint';
  el.innerHTML = '横屏体验更好<span>知道了</span>';
  el.querySelector('span').onclick = () => el.remove();
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

/** 供其它模块调用：当前是否用抽屉形态 */
export function isDrawerMode() {
  return mobile && mqLandscape.matches && drawerOpen;
}
