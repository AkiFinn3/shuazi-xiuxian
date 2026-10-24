// 视觉层共用的小工具：线性图标、页头与卡片标题
export function icon(name, cls = '') {
  return `<svg class="ico${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

export function isFullPage(root) {
  return !!root.closest('#pageScreen');
}

export function playerPortrait(appearance, thumb = false) {
  const key = appearance || 'swordsman';
  return `assets/hd/player/${key}${thumb ? '-thumb' : ''}.webp`;
}

export function pageHead({ kicker = '', title, desc = '', actions = '' }) {
  return `<header class="page-head">
    <div class="page-head-main">
      ${kicker ? `<div class="kicker">${kicker}</div>` : ''}
      <h1>${title}</h1>
      ${desc ? `<p>${desc}</p>` : ''}
    </div>
    ${actions ? `<div class="page-head-actions">${actions}</div>` : ''}
  </header>`;
}

export function cardHead(title, note = '', iconName = '') {
  return `<div class="card-head">
    <h3 class="card-title">${iconName ? icon(iconName) : ''}${title}</h3>
    ${note ? `<span class="card-note">${note}</span>` : ''}
  </div>`;
}

export function barHtml(pct, kind = 'bar-xp') {
  return `<div class="bar ${kind}"><div class="bar-track"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div></div>`;
}
