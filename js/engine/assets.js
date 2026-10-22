// 资源加载：按需加载清单中的图片，带缓存与批量预载
import { SPRITES } from '../data/sprites.js';

const cache = new Map();     // key -> HTMLImageElement
const pending = new Map();   // key -> Promise
const failed = new Set();    // 加载失败的 key，避免每帧重试

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败: ' + src));
    img.src = src;
  });
}

/** 取得图片（未加载完成时返回 null，可稍后重试） */
export function img(key) {
  if (!key || failed.has(key)) return null;
  const hit = cache.get(key);
  if (hit) return hit.complete && hit.naturalWidth ? hit : null;
  if (!pending.has(key)) {
    const meta = SPRITES.images[key];
    if (!meta) return null;
    const p = loadImage(meta.src)
      .then((image) => { cache.set(key, image); pending.delete(key); return image; })
      .catch(() => { pending.delete(key); failed.add(key); return null; });
    pending.set(key, p);
  }
  return null;
}

/** 预载一组 key，返回 Promise（全部结束） */
export function preload(keys) {
  const jobs = keys.map((key) => {
    if (failed.has(key)) return Promise.resolve();
    if (cache.has(key) && cache.get(key).complete) return Promise.resolve();
    const meta = SPRITES.images[key];
    if (!meta) return Promise.resolve();
    if (!pending.has(key)) {
      const p = loadImage(meta.src)
        .then((image) => { cache.set(key, image); pending.delete(key); })
        .catch(() => { pending.delete(key); failed.add(key); });
      pending.set(key, p);
    }
    return pending.get(key);
  });
  return Promise.all(jobs);
}

export function meta(key) {
  return SPRITES.images[key] || null;
}

/** 动画条信息（cell / frames / fps） */
export function animMeta(key) {
  return SPRITES.anims[key] || null;
}

/** 预载某个角色的整套动画 */
export function preloadHero(hero) {
  return preloadAnim(['idle', 'walk', 'attack', 'combo1', 'combo2', 'combo3', 'cast', 'hurt', 'death', 'dash']
    .map((a) => 'hero/' + hero + '_' + a));
}

/** 预载动画条 */
export function preloadAnim(animKeys) {
  const jobs = animKeys.map((key) => {
    if (failed.has(key)) return Promise.resolve();
    const m = SPRITES.anims[key];
    if (!m) return Promise.resolve();
    if (cache.has(key)) return Promise.resolve();
    if (!pending.has(key)) {
      const p = loadImage(m.src)
        .then((image) => { cache.set(key, image); pending.delete(key); })
        .catch(() => { pending.delete(key); failed.add(key); });
      pending.set(key, p);
    }
    return pending.get(key);
  });
  return Promise.all(jobs);
}

export function animImg(key) {
  if (failed.has(key)) return null;
  if (cache.has(key)) {
    const image = cache.get(key);
    return image.complete && image.naturalWidth ? image : null;
  }
  const m = SPRITES.anims[key];
  if (!m) return null;
  if (!pending.has(key)) {
    const p = loadImage(m.src)
      .then((image) => { cache.set(key, image); pending.delete(key); })
      .catch(() => { pending.delete(key); failed.add(key); });
    pending.set(key, p);
  }
  return null;
}
