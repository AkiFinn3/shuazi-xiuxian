// 道侣任务链：进度、解锁、结算
import { ROUTES } from '../data/routes.js';

export function routeState(state, npcKey) {
  const route = ROUTES[npcKey];
  if (!route) return null;
  const prog = state.routes = state.routes || {};
  const rec = prog[npcKey] = prog[npcKey] || { step: 0, done: false };
  const affinity = (state.npcAffinity || {})[npcKey] || 0;
  const step = route.steps[rec.step] || null;
  let status = 'locked';
  let progress = 0;

  if (step) {
    const cond = step.condition || {};
    const condOk = (cond.affinity === undefined || affinity >= cond.affinity)
      && (cond.realm === undefined || state.realm >= cond.realm);
    progress = stepProgress(state, npcKey, step);
    status = !condOk ? 'locked' : (progress >= step.goal.target ? 'ready' : 'active');
  } else {
    status = rec.done ? 'done' : 'finished';
  }
  return { route, rec, step, status, progress, affinity };
}

export function stepProgress(state, npcKey, step) {
  const c = state.questCounters || {};
  switch (step.goal.type) {
    case 'floor': return state.bestFloor || 0;
    case 'gift': return (state.npcAffinity || {})[npcKey] || 0;
    case 'talk': return (state.npcTalk || {})[npcKey] || 0;
    default: return c[step.goal.type] || 0;
  }
}

/** 完成当前任务步骤 */
export function completeRouteStep(state, npcKey) {
  const rs = routeState(state, npcKey);
  if (!rs || !rs.step || rs.status !== 'ready') return null;
  const step = rs.step;
  const rec = rs.rec;

  rec.step += 1;
  if (rec.step >= rs.route.steps.length) rec.done = true;

  // 奖励
  const r = step.reward || {};
  if (r.affinity) {
    state.npcAffinity = state.npcAffinity || {};
    state.npcAffinity[npcKey] = Math.min(120, (state.npcAffinity[npcKey] || 0) + r.affinity);
  }
  if (r.coin) state.coin += r.coin;
  if (r.exp) state.exp += r.exp;
  for (const [k, v] of Object.entries(r.mats || {})) {
    state.mats[k] = (state.mats[k] || 0) + v;
  }
  return { step, line: step.line };
}

/** 是否可以结为道侣 */
export function canBindPartner(state, npcKey) {
  const rs = routeState(state, npcKey);
  if (!rs) return false;
  const affinity = (state.npcAffinity || {})[npcKey] || 0;
  return rs.rec.done && affinity >= 100;
}
