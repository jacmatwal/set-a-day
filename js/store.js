import { EQUIPMENT, EX } from './exercises.js';
import { generatePlan } from './planner.js';

const KEY = 'setaday:v1';

const defaults = () => ({
  v: 1,
  settings: {
    units: 'lb',
    equip: Object.fromEntries(EQUIPMENT.map(e => [e.id, e.default])),
  },
  // days[YYYY-MM-DD] = { plan: [exId], seed, started, finished, log: { [index]: { ex, w, r, rir, ts } | { ex, skipped: true, ts } } }
  days: {},
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const s = JSON.parse(raw);
    const d = defaults();
    return { ...d, ...s, settings: { ...d.settings, ...s.settings, equip: { ...d.settings.equip, ...(s.settings?.equip || {}) } } };
  } catch { return defaults(); }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
}

export const get = () => state;
export function replaceAll(next) { state = next; save(); }
export function resetAll() { state = defaults(); save(); }

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const sortedDays = () => Object.keys(state.days).sort();

// The workout to show on the Today screen. A session started late last night
// and still unfinished keeps going past midnight (for up to 3 hours).
export function activeKey() {
  const today = dayKey();
  const keys = sortedDays().filter(k => k < today);
  const prev = keys[keys.length - 1];
  const p = prev && state.days[prev];
  if (p && p.started && !p.finished && Date.now() - p.started < 3 * 3600e3) return prev;
  return today;
}

function lastUsedBefore(key) {
  const prev = sortedDays().filter(k => k < key).pop();
  if (!prev) return {};
  const out = {};
  for (const id of state.days[prev].plan) if (EX[id]) out[EX[id].part] = id;
  return out;
}

export function ensureDay(key) {
  if (!state.days[key]) {
    state.days[key] = { plan: generatePlan(key, state.settings.equip, lastUsedBefore(key)), seed: 0, started: null, finished: null, log: {} };
    save();
  }
  // drop any exercise that no longer exists in the library
  const d = state.days[key];
  if (d.plan.some(id => !EX[id]) && !Object.keys(d.log).length) {
    d.plan = generatePlan(key, state.settings.equip, lastUsedBefore(key)); save();
  }
  return state.days[key];
}

export function reshuffle(key) {
  const d = state.days[key];
  d.seed = (d.seed || 0) + 1;
  d.plan = generatePlan(`${key}~${d.seed}`, state.settings.equip, lastUsedBefore(key));
  save();
}

// ---------- stats ----------
export const e1rm = (w, r) => (w > 0 ? w * (1 + r / 30) : 1 + r / 30); // Epley; bodyweight sets → relative

// All logged (non-skipped) sets in date order.
export function allSets() {
  const out = [];
  for (const k of sortedDays()) {
    const d = state.days[k];
    for (const i of Object.keys(d.log).sort((a, b) => a - b)) {
      const s = d.log[i];
      if (s.skipped || !s.r) continue;
      out.push({ day: k, idx: +i, ...s, e: e1rm(s.w, s.r) });
    }
  }
  return out;
}

export function lastPerformance(exId, beforeKey) {
  let found = null;
  for (const k of sortedDays()) {
    if (k >= beforeKey) break;
    for (const s of Object.values(state.days[k].log)) if (s.ex === exId && !s.skipped && s.r) found = { day: k, ...s };
  }
  return found;
}

export function bestBefore(exId, beforeKey) {
  let best = 0;
  for (const s of allSets()) if (s.ex === exId && s.day < beforeKey) best = Math.max(best, s.e);
  return best;
}

export const finishedDays = () => sortedDays().filter(k => state.days[k].finished && Object.values(state.days[k].log).some(s => !s.skipped));

// Strength index: for every exercise you've done, latest e1RM ÷ your first
// e1RM on it, averaged. 100 = where you started. Computed per workout day.
export function strengthIndexSeries() {
  const base = {}, latest = {}, series = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const ids = Object.keys(latest);
    if (ids.length) series.push({ day: cur, v: 100 * ids.reduce((s, id) => s + latest[id] / base[id], 0) / ids.length });
  };
  for (const s of allSets()) {
    if (s.day !== cur) { flush(); cur = s.day; }
    if (!(s.ex in base)) base[s.ex] = s.e;
    latest[s.ex] = s.e;
  }
  flush();
  return series;
}

export function durations() {
  return finishedDays().map(k => {
    const d = state.days[k];
    return { day: k, min: Math.max(0, (d.finished - d.started) / 60000) };
  }).filter(d => d.min > 0 && d.min < 180);
}

export function streak() {
  const done = new Set(finishedDays());
  let n = 0; const d = new Date();
  if (!done.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not done yet doesn't break it
  while (done.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function exerciseHistory() {
  const by = {};
  for (const s of allSets()) (by[s.ex] ||= []).push(s);
  return by;
}
