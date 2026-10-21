// 成就与称号
export const ACHIEVEMENTS = [
  { key: 'a_first_kill', name: '初出茅庐', desc: '击杀第一只妖兽', title: '初出茅庐', check: (s) => s.stats.kills >= 1 },
  { key: 'a_100', name: '百战之身', desc: '击杀 100 只妖兽', title: '百战修士', check: (s) => s.stats.kills >= 100 },
  { key: 'a_1000', name: '千战', desc: '击杀 1000 只妖兽', title: '刷子', check: (s) => s.stats.kills >= 1000 },
  { key: 'a_10000', name: '万战', desc: '击杀 10000 只妖兽', title: '肝帝', check: (s) => s.stats.kills >= 10000 },
  { key: 'a_drop1', name: '有产', desc: '第一次拾取装备', title: '有产之人', check: (s) => s.stats.drops >= 1 },
  { key: 'a_zi', name: '紫气东来', desc: '获得地品装备', title: '紫气东来', check: (s) => (s.bestRarity || 0) >= 3 },
  { key: 'a_tian', name: '天命所归', desc: '获得天品装备', title: '天命所归', check: (s) => (s.bestRarity || 0) >= 4 },
  { key: 'a_xian', name: '仙品在手', desc: '获得仙品装备', title: '仙品在手', check: (s) => (s.bestRarity || 0) >= 5 },
  { key: 'a_zhuji', name: '筑基', desc: '踏入筑基期', title: '筑基修士', check: (s) => s.realm >= 1 },
  { key: 'a_jindan', name: '金丹大道', desc: '踏入金丹期', title: '金丹大道', check: (s) => s.realm >= 2 },
  { key: 'a_huashen', name: '化神', desc: '踏入化神期', title: '化神大能', check: (s) => s.realm >= 4 },
  { key: 'a_zhenzhen', name: '真仙', desc: '踏入真仙境', title: '真仙', check: (s) => s.realm >= 9 },
  { key: 'a_boss10', name: '斩妖十', desc: '击败 10 只守关妖兽', title: '斩妖十', check: (s) => s.stats.bossKills >= 10 },
  { key: 'a_dan', name: '丹师', desc: '炼制 10 炉丹药', title: '丹师', check: (s) => (s.stats.craft || 0) >= 10 },
  { key: 'a_qi', name: '器师', desc: '强化 10 次装备', title: '器师', check: (s) => (s.stats.upgrade || 0) >= 10 },
  { key: 'a_partner', name: '有情人', desc: '结为道侣', title: '有情人', check: (s) => !!s.partner },
  { key: 'a_ascend', name: '飞升者', desc: '飞升一次', title: '飞升者', check: (s) => (s.ascend && s.ascend.count >= 1) },
  { key: 'a_name', name: '名字比境界大', desc: '道号气吞山河', title: '名字比境界大', check: (s) => /元始天尊|鸿蒙|太上|天道/.test(s.name || '') },
  { key: 'a_hun', name: '肝度极高', desc: '累计在线 10 小时', title: '肝度极高', check: (s) => (s.stats.playtime || 0) >= 36000 },
  { key: 'a_shili', name: '十里坡剑神', desc: '筑基期修为', title: '十里坡剑神', check: (s) => s.realm >= 1 && s.realm <= 1 },
  { key: 'a_fate', name: '器灵之主', desc: '本命法宝进化到化形', title: '器灵之主', check: (s) => s.fate && s.fate.unlocked && s.fate.tier >= 3 },
];

/** 检查新解锁的成就 */
export function checkAchievements(state) {
  state.achievements = state.achievements || {};
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.key]) continue;
    let ok = false;
    try { ok = a.check(state); } catch (e) { ok = false; }
    if (ok) {
      state.achievements[a.key] = Date.now();
      newly.push(a);
    }
  }
  return newly;
}

/** 已解锁的称号列表 */
export function unlockedTitles(state) {
  const done = state.achievements || {};
  return ACHIEVEMENTS.filter((a) => done[a.key]).map((a) => ({ key: a.key, title: a.title, name: a.name }));
}
