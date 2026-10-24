// 自适应布局：只负责断点检测与竖屏旋转提示
const mqNarrow = window.matchMedia('(max-width: 900px), (max-height: 560px)');
const mqLandscape = window.matchMedia('(max-height: 560px) and (orientation: landscape)');

let mobile = mqNarrow.matches;
let rotateHinted = false;

export function isMobileLayout() { return mobile; }

export function initLayout() {
  const sync = () => {
    mobile = mqNarrow.matches;
    maybeRotateHint();
  };
  mqNarrow.addEventListener('change', sync);
  mqLandscape.addEventListener('change', sync);
  window.addEventListener('orientationchange', () => setTimeout(sync, 120));
  sync();
}

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
