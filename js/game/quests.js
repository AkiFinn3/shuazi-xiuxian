// 任务：每日任务 + 宗门任务
export const QUEST_VERSION = 2;

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** 计数器：任务进度来源 */
export const COUNTERS = ['kills', 'drops', 'craft', 'upgrade', 'talk', 'online', 'boss', 'fate'];

const DAILY_TEMPLATES = [
  { key: 'd_kill', name: '巡山', type: 'kills', target: 300, desc: '击杀 300 只妖兽', reward: { coin: 800, mats: { herb: 3 } } },
  { key: 'd_online', name: '静坐', type: 'online', target: 30, desc: '累计在线 30 分钟', reward: { coin: 600, exp: 800 } },
  { key: 'd_drop', name: '淘宝', type: 'drops', target: 5, desc: '拾取 5 件装备', reward: { coin: 700, mats: { core: 2 } } },
  { key: 'd_craft', name: '开炉', type: 'craft', target: 3, desc: '炼制 3 炉丹药', reward: { coin: 900, mats: { iron: 6 } } },
  { key: 'd_boss', name: '斩妖', type: 'boss', target: 2, desc: '击败 2 只守关妖兽', reward: { coin: 1200, mats: { jade: 3 } } },
];

const SECT_TEMPLATES = [
  { key: 's_kill', name: '宗门悬赏·剿妖', type: 'kills', target: 500, desc: '为宗门剿杀 500 只妖兽', reward: { coin: 1500, mats: { core: 3 } } },
  { key: 's_drop', name: '宗门悬赏·寻宝', type: 'drops', target: 12, desc: '寻回 12 件装备', reward: { coin: 1800, mats: { jade: 4 } } },
  { key: 's_craft', name: '丹阁订单', type: 'craft', target: 6, desc: '为丹阁炼 6 炉丹药', reward: { coin: 2000, mats: { herb: 8 } } },
  { key: 's_upgrade', name: '器阁差事', type: 'upgrade', target: 8, desc: '替器阁强化 8 次装备', reward: { coin: 2200, mats: { iron: 12 } } },
  { key: 's_talk', name: '同门问候', type: 'talk', target: 5, desc: '与 5 位同门交谈', reward: { coin: 1200, mats: { wine: 2 } } },
];

/** 保证当天任务存在 */
export function ensureQuests(state) {
  const key = dayKey();
  if (state.questDay !== key || state.questVersion !== QUEST_VERSION) {
    state.questDay = key;
    state.questVersion = QUEST_VERSION;
    state.daily = pickDaily();
    state.sect = pickSect();
    state.questCounters = state.questCounters || {};
    for (const c of COUNTERS) state.questCounters[c] = 0;
  }
  state.daily = state.daily || pickDaily();
  state.sect = state.sect || pickSect();
  state.questCounters = state.questCounters || {};
  for (const c of COUNTERS) {
    if (state.questCounters[c] === undefined) state.questCounters[c] = 0;
  }
  return state;
}

function pickDaily() {
  const pool = DAILY_TEMPLATES.slice();
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    out.push(pick(pool));
  }
  return out.map((t) => ({ ...t, progress: 0, done: false, claimed: false }));
}

function pickSect() {
  const pool = SECT_TEMPLATES.slice();
  const out = [];
  for (let i = 0; i < 2 && pool.length; i++) {
    out.push(pick(pool));
  }
  return out.map((t) => ({ ...t, progress: 0, done: false, claimed: false }));
}

function pick(arr) {
  const i = Math.floor(Math.random() * arr.length);
  return arr.splice(i, 1)[0];
}

/** 任务进度（每日任务用累计值，宗门任务用当日累计） */
export function questProgress(state, q) {
  const c = state.questCounters || {};
  switch (q.type) {
    case 'online': return Math.floor((c.online || 0) / 60);
    default: return c[q.type] || 0;
  }
}

export function isQuestDone(state, q) {
  return questProgress(state, q) >= q.target;
}

/** 领取奖励 */
export function claimQuest(state, q) {
  if (!isQuestDone(state, q) || q.claimed) return null;
  q.claimed = true;
  const r = q.reward || {};
  if (r.coin) state.coin += r.coin;
  if (r.exp) state.exp += r.exp;
  for (const [k, v] of Object.entries(r.mats || {})) {
    state.mats[k] = (state.mats[k] || 0) + v;
  }
  return r;
}

/** 计数 +1 */
export function count(state, type, n = 1) {
  state.questCounters = state.questCounters || {};
  state.questCounters[type] = (state.questCounters[type] || 0) + n;
}

/** 扫荡：花灵石直接完成一条任务 */
export function sweepQuest(state, q) {
  if (q.claimed) return null;
  const cost = Math.max(100, Math.round(q.reward.coin * 0.6));
  if (state.coin < cost) return { error: '灵石不足' };
  state.coin -= cost;
  // 直接把进度补满
  if (q.type === 'online') {
    state.questCounters.online = (state.questCounters.online || 0) + q.target * 60;
  } else {
    state.questCounters[q.type] = Math.max(state.questCounters[q.type] || 0, q.target);
  }
  if (q.type === 'floor') state.bestFloor = Math.max(state.bestFloor || 0, q.target);
  const r = claimQuest(state, q);
  return r ? { cost, reward: r } : { error: '无法完成' };
}
