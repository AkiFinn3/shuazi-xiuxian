// 弹窗 / 提示 / 气泡
const modalRoot = document.getElementById('modalRoot');
const toastRoot = document.getElementById('toastRoot');

let onCloseCb = null;

export function openModal(build, opts = {}) {
  modalRoot.hidden = false;
  modalRoot.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'modal';
  if (opts.width) box.style.width = opts.width;
  build(box, closeModal);
  modalRoot.appendChild(box);
  onCloseCb = opts.onClose || null;
  if (opts.dismissible === false) {
    modalRoot.onclick = (e) => { if (e.target === modalRoot) e.stopPropagation(); };
  }
  return box;
}

export function closeModal() {
  modalRoot.hidden = true;
  modalRoot.innerHTML = '';
  if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
}

/** 顶部/右下角短提示 */
export function toast(text, color) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = text;
  if (color) el.style.borderLeftColor = color;
  toastRoot.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 420);
  }, 2600);
}

/* ---------------- 物品气泡 ---------------- */
let tipEl = null;

export function showTooltip(html, x, y) {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'tooltip';
    document.body.appendChild(tipEl);
  }
  tipEl.innerHTML = html;
  tipEl.style.display = 'block';
  const r = tipEl.getBoundingClientRect();
  let left = x + 14;
  let top = y + 14;
  if (left + r.width > window.innerWidth - 8) left = x - r.width - 12;
  if (top + r.height > window.innerHeight - 8) top = y - r.height - 12;
  tipEl.style.left = Math.max(4, left) + 'px';
  tipEl.style.top = Math.max(4, top) + 'px';
}

export function hideTooltip() {
  if (tipEl) tipEl.style.display = 'none';
}
