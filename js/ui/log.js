// 战斗日志
const logEl = document.getElementById('log');
let count = 0;

export function logLine(text, cls = '') {
  if (!logEl) return;
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  logEl.appendChild(el);
  count++;
  while (logEl.children.length > 8) logEl.removeChild(logEl.firstChild);
}
