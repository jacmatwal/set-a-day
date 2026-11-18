import { EXERCISES, PARTS, EX } from './exercises.js';

// --- seeded RNG so a given day always produces the same workout ---
function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return (h ^ (h >>> 16)) >>> 0;
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export const conflicts = (a, b) => a.tags.some(t => b.tags.includes(t));
export const isAvailable = (ex, equip) => ex.eq.every(e => equip[e]);
export const poolFor = (part, equip) => EXERCISES.filter(e => e.part === part && isAvailable(e, equip));

// Random depth-first search for an order where no two neighbours share a muscle.
function randomOrder(items, rng) {
  const order = [], used = new Array(items.length).fill(false);
  let steps = 0;
  const dfs = () => {
    if (order.length === items.length) return true;
    if (++steps > 2000) return false;
    const prev = order[order.length - 1];
    for (const i of shuffle(rng, items.map((_, k) => k))) {
      if (used[i] || (prev && conflicts(prev, items[i]))) continue;
      used[i] = true; order.push(items[i]);
      if (dfs()) return true;
      used[i] = false; order.pop();
    }
    return false;
  };
  return dfs() ? order : null;
}

export const stationChanges = order => order.reduce((n, e, i) => n + (i && e.station !== order[i - 1].station ? 1 : 0), 0);

// Among many valid orders, keep the one with the fewest equipment-station changes.
function bestOrder(items, rng, tries = 250) {
  let best = null, bestScore = Infinity;
  for (let k = 0; k < tries; k++) {
    const o = randomOrder(items, rng);
    if (!o) continue;
    const s = stationChanges(o);
    if (s < bestScore) { best = o; bestScore = s; if (s <= 2) break; }
  }
  return best;
}

// lastUsed: { part: exerciseId } from the previous workout, so we avoid repeating it.
export function generatePlan(seedKey, equip, lastUsed = {}) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = mulberry32(hash(seedKey + '#' + attempt));
    const picks = [];
    for (const p of PARTS) {
      let pool = poolFor(p.id, equip);
      if (!pool.length) continue; // body part has no eligible exercise with this equipment
      if (pool.length > 1 && lastUsed[p.id]) pool = pool.filter(e => e.id !== lastUsed[p.id]);
      picks.push(pick(rng, pool));
    }
    const order = bestOrder(picks, rng);
    if (order) return order.map(e => e.id);
  }
  // Should never happen with the stock library; fall back to an unconstrained list.
  return PARTS.map(p => poolFor(p.id, equip)[0]).filter(Boolean).map(e => e.id);
}

// Exercises that could replace plan[index] without breaking the spacing rule.
export function alternatives(plan, index, equip) {
  const cur = EX[plan[index]];
  const prev = EX[plan[index - 1]], next = EX[plan[index + 1]];
  return poolFor(cur.part, equip).filter(e => e.id !== cur.id && !(prev && conflicts(prev, e)) && !(next && conflicts(next, e)));
}
