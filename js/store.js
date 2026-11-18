import { EQUIPMENT, EX } from './exercises.js';
import { generatePlan, generateShortPlan } from './planner.js';

const KEY = 'setaday:v1';

const defaults = () => ({
  v: 1,
  settings: {
    units: 'lb',
    equip: Object.fromEntries(EQUIPMENT.map(e => [e.id, e.default])),
  },
  // days[YYYY-MM-DD] = { plan: [exId], mode: 'full'|'short', easy: bool, seed, started, finished,
  //                     log: { [index]: { ex, w, r, rir, ts } | { ex, skipped: true, ts } } }
  days: {},
  // measures: [{ day, bw, arm, chest, waist, thigh }] — one per day, body weight in lb/kg, lengths in in/cm
  measures: [],
  // deloads: [{ start, end }] — inclusive day keys
  deloads: [],
  deloadSnooze: null,
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return normalize(JSON.parse(raw));
  } catch { return defaults(); }
}

function normalize(s) {
  const d = defaults();
  return { ...d, ...s, settings: { ...d.settings, ...s.settings, equip: { ...d.settings.equip, ...(s.settings?.equip || {}) } }, measures: s.measures || [], deloads: s.deloads || [] };
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
}

export const get = () => state;
export function replaceAll(next) { state = normalize(next); save(); }
export function resetAll() { state = defaults(); save(); }

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (key, n) => { const d = new Date(key + 'T12:00'); d.setDate(d.getDate() + n); return dayKey(d); };

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

function prevDay(key) { const k = sortedDays().filter(x => x < key).pop(); return k ? state.days[k] : null; }

function makePlan(key, mode, seedKey) {
  const prev = prevDay(key);
  if (mode === 'short') return generateShortPlan(seedKey, state.settings.equip, prev ? prev.plan : []);
  const lastUsed = {};
  if (prev && prev.mode !== 'short') for (const id of prev.plan) if (EX[id]) lastUsed[EX[id].part] = id;
  return generatePlan(seedKey, state.settings.equip, lastUsed);
}

export const activeDeload = key => state.deloads.find(d => d.start <= key && key <= d.end) || null;

export function ensureDay(key) {
  if (!state.days[key]) {
    state.days[key] = { plan: makePlan(key, 'full', key), mode: 'full', easy: !!activeDeload(key), seed: 0, started: null, finished: null, log: {} };
    save();
  }
  const d = state.days[key];
  // drop any exercise that no longer exists in the library
  if (d.plan.some(id => !EX[id]) && !Object.keys(d.log).length) { d.plan = makePlan(key, d.mode, key); save(); }
  return d;
}

export function reshuffle(key) {
  const d = state.days[key];
  d.seed = (d.seed || 0) + 1;
  d.plan = makePlan(key, d.mode, `${key}~${d.seed}`);
  save();
}

export function setMode(key, mode) {
  const d = state.days[key];
  if (d.mode === mode || Object.keys(d.log).length) return;
  d.mode = mode;
  d.plan = makePlan(key, mode, d.seed ? `${key}~${d.seed}` : key);
  save();
}

// ---------- easy week (deload) ----------
export function startDeload(key) {
  state.deloads.push({ start: key, end: addDays(key, 6) });
  const d = state.days[key];
  if (d && !Object.keys(d.log).length) d.easy = true;
  save();
}
export function endDeload(key) {
  const dl = activeDeload(key); if (!dl) return;
  const d = state.days[key];
  const todayStarted = d && Object.keys(d.log).length;
  dl.end = todayStarted ? key : addDays(key, -1);
  if (dl.end < dl.start) state.deloads = state.deloads.filter(x => x !== dl);
  if (d && !todayStarted) d.easy = false;
  save();
}
export function snoozeDeload(key) { state.deloadSnooze = addDays(key, 7); save(); }

// Of the lifts repeated in the last `days` days, how many beat their previous best?
// (The strength index lags during a plateau because rotating lifts keep "catching
// up", so it can't be used to detect a stall.)
export function recentProgress(key, days = 14) {
  const cutoff = addDays(key, -days), best = {};
  let tried = 0, improved = 0;
  for (const s of allSets()) {
    if (s.easy || s.day >= key) continue;
    if (s.day >= cutoff && best[s.ex]) { tried++; if (s.e > best[s.ex] * 1.001) improved++; }
    best[s.ex] = Math.max(best[s.ex] || 0, s.e);
  }
  return { tried, improved };
}

// Suggest an easy week when fewer than 1 in 4 repeated lifts set a best in 14 days.
export function deloadSuggested(key) {
  if (activeDeload(key)) return null;
  if (state.deloadSnooze && key < state.deloadSnooze) return null;
  const lastEnd = state.deloads.map(d => d.end).sort().pop();
  if (lastEnd && lastEnd >= addDays(key, -14)) return null;
  const r = recentProgress(key);
  return r.tried >= 8 && r.improved / r.tried < 0.25 ? r : null;
}

// ---------- measurements ----------
export const MEASURES = [
  { id: 'bw', name: 'Body weight', how: 'Morning, after the bathroom, before eating.', mass: true },
  { id: 'arm', name: 'Arm', how: 'Flexed, widest point. Same arm every time.' },
  { id: 'chest', name: 'Chest', how: 'Relaxed, at nipple height, after a normal exhale.' },
  { id: 'thigh', name: 'Thigh', how: 'Standing relaxed, widest point. Same leg every time.' },
  { id: 'waist', name: 'Waist', how: 'At the navel, relaxed, after a normal exhale.' },
];
export function saveMeasure(key, values) {
  state.measures = state.measures.filter(m => m.day !== key);
  if (Object.values(values).some(v => v > 0)) state.measures.push({ day: key, ...values });
  state.measures.sort((a, b) => (a.day < b.day ? -1 : 1));
  save();
}
export const measures = () => state.measures;
export const lastMeasure = () => state.measures[state.measures.length - 1] || null;
export const measureDue = key => { const m = lastMeasure(); return !m || m.day <= addDays(key, -7); };
export const seriesOf = id => state.measures.filter(m => m[id] > 0).map(m => ({ day: m.day, v: m[id] }));

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
      out.push({ day: k, idx: +i, easy: !!d.easy, ...s, e: e1rm(s.w, s.r) });
    }
  }
  return out;
}

// Easy-week sets are ignored so progression picks up from the last real effort.
export function lastPerformance(exId, beforeKey) {
  let found = null;
  for (const k of sortedDays()) {
    if (k >= beforeKey) break;
    if (state.days[k].easy) continue;
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
// e1RM on it, averaged. 100 = where you started. Easy-week sets excluded.
export function strengthIndexSeries() {
  const base = {}, latest = {}, series = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const ids = Object.keys(latest);
    if (ids.length) series.push({ day: cur, v: 100 * ids.reduce((s, id) => s + latest[id] / base[id], 0) / ids.length });
  };
  for (const s of allSets()) {
    if (s.easy) continue;
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
  let k = dayKey(), n = 0;
  if (!done.has(k)) k = addDays(k, -1); // today not done yet doesn't break it
  while (done.has(k)) { n++; k = addDays(k, -1); }
  return n;
}

export function exerciseHistory() {
  const by = {};
  for (const s of allSets()) (by[s.ex] ||= []).push(s);
  return by;
}

// Rolling 7 days vs. the 7 days before. Ends yesterday until today's workout is finished.
export function weekly() {
  const today = dayKey();
  const key = state.days[today]?.finished ? today : addDays(today, -1);
  const si = strengthIndexSeries();
  const fin = new Set(finishedDays());
  const period = (from, to) => {
    const days = sortedDays().filter(k => k >= from && k <= to);
    const done = days.filter(k => fin.has(k));
    const mins = done.map(k => state.days[k]).filter(d => d.started && d.finished).map(d => (d.finished - d.started) / 60000).filter(m => m > 0 && m < 180);
    const sets = days.reduce((n, k) => n + Object.values(state.days[k].log).filter(s => !s.skipped).length, 0);
    const siPt = si.filter(p => p.day <= to).pop();
    const m = state.measures.filter(x => x.day <= to && x.day >= from).pop() || null;
    return { workouts: done.length, avgMin: mins.length ? mins.reduce((a, b) => a + b, 0) / mins.length : null, sets, si: siPt ? siPt.v : null, m };
  };
  return { cur: period(addDays(key, -6), key), prev: period(addDays(key, -13), addDays(key, -7)) };
}
