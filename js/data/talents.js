// 仙缘天赋：转生后的永久加点
export const TALENTS = [
  {
    key: 'body', name: '仙躯', max: 5, cost: 1, icon: '体',
    desc: '每级：气血 +6%',
    apply: (stats, lv) => { stats.maxHp *= 1 + 0.06 * lv; },
  },
  {
    key: 'edge', name: '仙锋', max: 5, cost: 1, icon: '锋',
    desc: '每级：攻击 +6%',
    apply: (stats, lv) => { stats.atk *= 1 + 0.06 * lv; },
  },
  {
    key: 'luck', name: '运数', max: 5, cost: 1, icon: '运',
    desc: '每级：幸运 +3（掉落品质）',
    apply: (stats, lv) => { stats.luck += 3 * lv; },
  },
  {
    key: 'bag', name: '洞天', max: 3, cost: 2, icon: '纳',
    desc: '每级：背包 +10 格',
    apply: () => {},
  },
  {
    key: 'offline', name: '灵犀', max: 3, cost: 2, icon: '犀',
    desc: '每级：离线收益效率 +12%',
    apply: () => {},
  },
  {
    key: 'together', name: '同心', max: 5, cost: 1, icon: '同', need: 'go',
    desc: '每级：全属性 +4%（道侣同行）',
    apply: (stats, lv) => {
      const m = 1 + 0.04 * lv;
      stats.atk *= m; stats.maxHp *= m; stats.def *= m;
    },
  },
  {
    key: 'sect', name: '镇宗', max: 5, cost: 1, icon: '镇', need: 'stay',
    desc: '每级：灵石获取 +8%（道侣镇守）',
    apply: (stats, lv) => { stats.coinPct += 8 * lv; },
  },
];

export function talentOf(key) {
  return TALENTS.find((t) => t.key === key) || null;
}
