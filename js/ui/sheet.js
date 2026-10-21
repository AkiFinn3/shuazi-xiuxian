// 底部弹层：触屏下查看装备详情并装备/分解
import { itemTooltip } from './panels.js';

let root = null;

function ensureRoot() {
  if (root) return root;
  root = document.createElement('div');
  root.className = 'sheet-root';
  root.hidden = true;
  root.innerHTML = `<div class="sheet-mask"></div><div class="sheet"></div>`;
  document.body.appendChild(root);
  root.querySelector('.sheet-mask').onclick = closeSheet;
  return root;
}

export function closeSheet() {
  if (!root) return;
  root.hidden = true;
  root.querySelector('.sheet').innerHTML = '';
}

/**
 * 打开装备详情弹层
 * @param item 装备对象
 * @param opts { onEquip, onSalvage, onClose }
 */
export function openItemSheet(item, opts = {}) {
  const r = ensureRoot();
  const sheet = r.querySelector('.sheet');
  sheet.innerHTML = `
    <div class="sheet-grab"></div>
    <div class="sheet-title">${item.name}</div>
    ${itemTooltip(item)}
    <div class="row">
      <button class="btn btn-jade" data-act="equip">装备</button>
      <button class="btn" data-act="salvage">分解</button>
      <button class="btn btn-ghost" data-act="close">关闭</button>
    </div>`;
  r.hidden = false;
  sheet.querySelector('[data-act="equip"]').onclick = () => {
    closeSheet();
    opts.onEquip && opts.onEquip(item);
  };
  sheet.querySelector('[data-act="salvage"]').onclick = () => {
    closeSheet();
    opts.onSalvage && opts.onSalvage(item);
  };
  sheet.querySelector('[data-act="close"]').onclick = closeSheet;
}
