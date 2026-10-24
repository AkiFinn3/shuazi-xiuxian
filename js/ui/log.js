// 战斗日志
const logEl = document.getElementById('log');
const reportEl = document.getElementById('battleReportBody');

export function logLine(text, cls = '') {
  if (logEl) {
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    logEl.appendChild(el);
    while (logEl.children.length > 8) logEl.removeChild(logEl.firstChild);
  }
  if (reportEl) {
    const line = document.createElement('div');
    line.className = cls;
    line.textContent = text;
    reportEl.appendChild(line);
    while (reportEl.children.length > 14) reportEl.removeChild(reportEl.firstChild);
  }
}
