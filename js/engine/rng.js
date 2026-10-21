// 随机数：可播种的 mulberry32，保证同一存档的掉落序列可复现
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
    this.next = mulberry32(this.seed);
  }
  float(min = 0, max = 1) { return min + this.next() * (max - min); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }        // 闭区间
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** 按权重挑选：items = [{w:权重, ...}] */
  weighted(items, weightKey = 'w') {
    let total = 0;
    for (const it of items) total += it[weightKey];
    let r = this.next() * total;
    for (const it of items) {
      r -= it[weightKey];
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }
}

export const globalRng = new Rng();
