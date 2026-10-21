// 移动端判定（独立模块，避免 UI 之间循环引用）
const mq = window.matchMedia('(max-width: 900px), (max-height: 560px)');
const mqLandscape = window.matchMedia('(max-height: 560px) and (orientation: landscape)');

export function isMobile() {
  return mq.matches;
}

export function isLandscape() {
  return mqLandscape.matches;
}

export function onViewportChange(cb) {
  mq.addEventListener('change', cb);
  mqLandscape.addEventListener('change', cb);
}
