// 弹窗 / 提示 / 气泡
const modalRoot = document.getElementById('modalRoot');
const toastRoot = document.getElementById('toastRoot');

let onCloseCb = null;

export function openModal(build, opts = {}) {
  modalRoot.hidden = false;
  modalRoot.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'modal';
  if (opts.width) box.style.setProperty('--modal-w', opts.width);
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
let tipW = 0;
let tipH = 0;

function placeTooltip(x, y) {
  let left = x + 14;
  let top = y + 14;
  if (left + tipW > window.innerWidth - 8) left = x - tipW - 12;
  if (top + tipH > window.innerHeight - 8) top = y - tipH - 12;
  tipEl.style.left = Math.max(4, left) + 'px';
  tipEl.style.top = Math.max(4, top) + 'px';
}

export function showTooltip(html, x, y) {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'tooltip';
    document.body.appendChild(tipEl);
  }
  tipEl.innerHTML = html;
  tipEl.style.display = 'block';
  const r = tipEl.getBoundingClientRect();
  tipW = r.width;
  tipH = r.height;
  placeTooltip(x, y);
}

/** 鼠标移动时只挪位置，不重建 innerHTML */
export function moveTooltip(x, y) {
  if (!tipEl || tipEl.style.display === 'none') return;
  placeTooltip(x, y);
}

export function hideTooltip() {
  if (tipEl) tipEl.style.display = 'none';
}
