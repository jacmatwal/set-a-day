import { EX, PARTS, PART_NAME, EQUIPMENT } from './exercises.js';
import { alternatives, poolFor } from './planner.js';
import * as S from './store.js';
import { mountFigure } from './figure.js';
import { barChart, lineChart, sparkline } from './charts.js';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const main = $('#main');

const ui = { view: 'today', focus: null, draft: null, stopFig: null, openDay: null };

// ---------- formatting ----------
const units = () => S.get().settings.units;
const fmtW = w => (Math.round(w * 10) / 10).toString();
const fmtClock = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const longDate = k => new Date(k + 'T12:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
const shortDate = k => new Date(k + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const weightNote = ex => (ex.eq.includes('cable') ? 'stack' : ex.eq.includes('pullup') ? 'added' : ex.eq.includes('barbell') ? 'total' : ex.eq.includes('db') ? 'per dumbbell' : 'added');
const increment = ex => {
  const kg = units() === 'kg';
  if (ex.eq.includes('barbell')) return kg ? 2.5 : 5;
  if (ex.compound) return kg ? 2 : 5;
  return kg ? 1 : 2.5;
};
const rirText = ex => (ex.compound ? '1–2' : '0–1');

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- suggestions (double progression) ----------
function suggestion(ex, key) {
  const last = S.lastPerformance(ex.id, key);
  const [lo, hi] = ex.reps;
  if (!last) return { last: null, w: '', r: lo, text: `First time: pick a weight you can lift about ${hi - 2} times with good form.` };
  if (last.r >= hi && last.w > 0) {
    const w = last.w + increment(ex);
    return { last, w, r: lo, text: `You hit the top of the range. Add weight: ${fmtW(w)} ${units()} × ${lo}+.` };
  }
  if (last.r >= hi && last.w === 0) return { last, w: 0, r: last.r + 1, text: `Beat ${last.r} reps, or add weight.` };
  return { last, w: last.w, r: Math.min(hi, last.r + 1), text: `Beat ${last.r} reps at ${fmtW(last.w)} ${units()}.` };
}

// ---------- TODAY ----------
function dayState() {
  const key = S.activeKey();
  const day = S.ensureDay(key);
  return { key, day };
}

const isDone = (day, i) => !!day.log[i];
const nextOpen = (day, from = 0) => {
  const n = day.plan.length;
  for (let k = 0; k < n; k++) { const i = (from + k) % n; if (!isDone(day, i)) return i; }
  return null;
};

function initDraft(day, key, i) {
  const ex = EX[day.plan[i]];
  const logged = day.log[i];
  if (logged && !logged.skipped) ui.draft = { w: logged.w, r: logged.r, rir: logged.rir ?? 1 };
  else { const sg = suggestion(ex, key); ui.draft = { w: sg.w, r: sg.r, rir: ex.compound ? 1 : 0 }; }
}

function renderToday() {
  const { key, day } = dayState();
  if (ui.focus == null || ui.focus >= day.plan.length || ui.focusKey !== key) {
    ui.focusKey = key;
    ui.focus = day.finished ? null : nextOpen(day) ?? 0;
    if (ui.focus != null) initDraft(day, key, ui.focus);
  }
  const doneCount = Object.keys(day.log).length;
  const logged = Object.values(day.log).filter(s => !s.skipped).length;
  const missing = PARTS.filter(p => !day.plan.some(id => EX[id].part === p.id));

  let html = `<header class="top"><div><div class="eyebrow">${esc(longDate(key))}</div><h1>${day.finished ? 'Done' : 'Today'}</h1></div>`;
  if (day.started) html += `<div class="timer ${day.finished ? 'stopped' : ''}" id="timer">${fmtClock((day.finished || Date.now()) - day.started)}</div>`;
  html += `</header>`;

  html += `<div class="segs" aria-label="${doneCount} of ${day.plan.length} done">${day.plan.map((_, i) => `<span class="${day.log[i] ? (day.log[i].skipped ? 'skip' : 'done') : ''} ${i === ui.focus ? 'cur' : ''}"></span>`).join('')}</div>`;

  if (day.finished && ui.focus == null) html += summaryCard(key, day, logged);
  else if (ui.focus != null) html += currentCard(key, day, ui.focus);

  html += `<ol class="plan">`;
  day.plan.forEach((id, i) => {
    const ex = EX[id], s = day.log[i];
    const status = s ? (s.skipped ? '<span class="st skip">skipped</span>' : `<span class="st ok">${fmtW(s.w)}×${s.r}</span>`) : '';
    html += `<li class="${i === ui.focus ? 'cur' : ''} ${s ? (s.skipped ? 'is-skip' : 'is-done') : ''}" data-act="focus" data-i="${i}">
      <span class="num">${s && !s.skipped ? '✓' : s ? '–' : i + 1}</span>
      <span class="nm"><b>${esc(ex.name)}</b><small>${PART_NAME[ex.part]}</small></span>${status}</li>`;
  });
  html += `</ol>`;
  if (missing.length) html += `<p class="note">No exercise available for ${missing.map(p => p.name).join(', ')} with your equipment settings.</p>`;

  html += `<div class="row-actions">`;
  if (!day.started && !doneCount) html += `<button class="btn ghost" data-act="reshuffle">Reshuffle workout</button>`;
  if (day.started && !day.finished) html += `<button class="btn ghost" data-act="finish">Finish workout</button>`;
  html += `</div>`;
  main.innerHTML = html;

  if (ui.focus != null) {
    const el = $('#fig');
    if (el) ui.stopFig = mountFigure(el, EX[day.plan[ui.focus]].anim, { still: matchMedia('(prefers-reduced-motion: reduce)').matches });
  }
}

function currentCard(key, day, i) {
  const ex = EX[day.plan[i]];
  const sg = suggestion(ex, key);
  const logged = day.log[i];
  const d = ui.draft;
  const [lo, hi] = ex.reps;
  const lastLine = sg.last ? `<div class="last"><span>Last time</span><b>${fmtW(sg.last.w)} ${units()} × ${sg.last.r}</b><small>${shortDate(sg.last.day)}</small></div>` : '';
  const canSwap = !logged;
  return `<section class="card current">
    <div class="cur-head"><span class="chip">${PART_NAME[ex.part]}</span><span class="muted">${i + 1} of ${day.plan.length}</span>
      ${canSwap ? `<button class="link" data-act="swap">Swap</button>` : ''}</div>
    <h2>${esc(ex.name)}</h2>
    <div class="fig" id="fig" title="Tap to pause"></div>
    <div class="target"><b>${lo}–${hi} reps${ex.perSide ? ' per side' : ''}</b> · stop with ${rirText(ex)} left in the tank</div>
    ${lastLine}
    <p class="hint">${esc(sg.text)}</p>
    <details class="cues"><summary>Form cues</summary><ul>${ex.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>
    <div class="inputs">
      <label class="stepper"><span>Weight <small>${units()}${weightNote(ex) ? ' · ' + weightNote(ex) : ''}</small></span>
        <div><button data-act="w-" aria-label="Less weight">−</button><input id="in-w" inputmode="decimal" value="${d.w === '' ? '' : fmtW(d.w)}" placeholder="0"><button data-act="w+" aria-label="More weight">+</button></div></label>
      <label class="stepper"><span>Reps</span>
        <div><button data-act="r-" aria-label="Fewer reps">−</button><input id="in-r" inputmode="numeric" value="${d.r}"><button data-act="r+" aria-label="More reps">+</button></div></label>
    </div>
    <div class="rir"><span>Reps left in tank</span><div class="seg">${[0, 1, 2, 3].map(v => `<button class="${d.rir === v ? 'on' : ''}" data-act="rir" data-v="${v}">${v === 3 ? '3+' : v}</button>`).join('')}</div></div>
    <div class="log-actions">
      <button class="btn primary" data-act="log">${logged && !logged.skipped ? 'Update set' : 'Log set'}</button>
      ${logged ? `<button class="btn ghost" data-act="clear">Clear</button>` : `<button class="btn ghost" data-act="skip">Skip</button>`}
    </div>
  </section>`;
}

function summaryCard(key, day, logged) {
  const dur = day.started ? fmtClock(day.finished - day.started) : '—';
  const prs = [];
  for (const [i, s] of Object.entries(day.log)) {
    if (s.skipped || !s.r) continue;
    const prev = S.bestBefore(s.ex, key);
    if (prev && S.e1rm(s.w, s.r) > prev) prs.push(EX[s.ex]?.name || s.ex);
  }
  const si = S.strengthIndexSeries();
  const siNow = si.length ? si[si.length - 1].v : 100;
  return `<section class="card summary">
    <div class="tiles">
      <div class="tile"><small>Time</small><b>${dur}</b></div>
      <div class="tile"><small>Sets</small><b>${logged}/${day.plan.length}</b></div>
      <div class="tile"><small>Strength</small><b>${siNow >= 100 ? '+' : ''}${(siNow - 100).toFixed(1)}%</b></div>
    </div>
    ${prs.length ? `<div class="prs"><b>New bests</b><ul>${prs.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    <p class="muted small">Tap any exercise below to edit it. Tomorrow's workout appears after midnight.</p>
  </section>`;
}

function readInputs() {
  const w = parseFloat($('#in-w')?.value); const r = parseInt($('#in-r')?.value, 10);
  ui.draft.w = isNaN(w) ? '' : w; ui.draft.r = isNaN(r) ? '' : r;
}

function logCurrent(skip = false) {
  const { key, day } = dayState();
  const i = ui.focus; const exId = day.plan[i]; const ex = EX[exId];
  if (!skip) {
    readInputs();
    if (!ui.draft.r || ui.draft.r < 1) { toast('Enter how many reps you did.'); return; }
  }
  const wasLogged = !!day.log[i];
  const prevBest = S.bestBefore(exId, key);
  day.log[i] = skip ? { ex: exId, skipped: true, ts: Date.now() } : { ex: exId, w: ui.draft.w || 0, r: ui.draft.r, rir: ui.draft.rir, ts: Date.now() };
  if (!day.started) day.started = Date.now();
  if (!skip && prevBest && S.e1rm(day.log[i].w, day.log[i].r) > prevBest) toast(`New best on ${ex.name}!`);
  const nxt = nextOpen(day, i + 1);
  if (nxt == null) { if (!day.finished) day.finished = Date.now(); ui.focus = null; }
  else if (!wasLogged || day.finished == null) { ui.focus = nxt; initDraft(day, key, nxt); }
  S.save(); render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSwap() {
  const { day } = dayState();
  const i = ui.focus; const ex = EX[day.plan[i]];
  const alts = alternatives(day.plan, i, S.get().settings.equip);
  const body = alts.length
    ? `<ul class="sheet-list">${alts.map(a => `<li><button data-act="pick-alt" data-id="${a.id}"><b>${esc(a.name)}</b><small>${a.reps[0]}–${a.reps[1]} reps</small></button></li>`).join('')}</ul>`
    : `<p class="muted">No other ${PART_NAME[ex.part].toLowerCase()} exercise fits here without putting similar muscles back to back.</p>`;
  openSheet(`Swap ${esc(ex.name)}`, body + `<p class="muted small">Only options that keep a set between similar muscles are shown.</p>`);
}

// ---------- PROGRESS ----------
function renderProgress() {
  const fin = S.finishedDays();
  const dur = S.durations();
  const si = S.strengthIndexSeries();
  const last7 = dur.slice(-7);
  const avg = last7.length ? last7.reduce((a, d) => a + d.min, 0) / last7.length : null;
  const siNow = si.length ? si[si.length - 1].v : null;

  let html = `<header class="top"><div><div class="eyebrow">Is it working?</div><h1>Progress</h1></div></header>`;
  html += `<div class="tiles four">
    <div class="tile"><small>Workouts</small><b>${fin.length}</b></div>
    <div class="tile"><small>Streak</small><b>${S.streak()}<i>d</i></b></div>
    <div class="tile"><small>Avg time (7)</small><b>${avg == null ? '—' : Math.round(avg)}<i>${avg == null ? '' : 'min'}</i></b></div>
    <div class="tile"><small>Strength</small><b>${siNow == null ? '—' : (siNow >= 100 ? '+' : '') + (siNow - 100).toFixed(1) + '%'}</b></div>
  </div>`;
  html += `<section class="card"><h3>Workout time</h3><p class="sub">Minutes from first set to finish, last 30 workouts.</p><div id="ch-dur"></div></section>`;
  html += `<section class="card"><h3>Strength index</h3><p class="sub">Your current estimated 1-rep max on every exercise vs. your first time doing it, averaged. 100 = where you started.</p><div id="ch-si"></div></section>`;

  const hist = S.exerciseHistory();
  html += `<section class="card"><h3>By body part</h3><p class="sub">Change in estimated 1RM since your first session on each lift.</p>`;
  let any = false;
  for (const p of PARTS) {
    const rows = poolFor(p.id, { barbell: 1, rack: 1, bench: 1, incline: 1, db: 1, cable: 1, box: 1, legmachine: 1, pullup: 1 })
      .filter(e => hist[e.id]).map(e => {
        const h = hist[e.id], first = h[0], last = h[h.length - 1];
        const ch = (last.e / first.e - 1) * 100;
        return `<li><span class="nm"><b>${esc(e.name)}</b><small>${h.length}× · last ${fmtW(last.w)}×${last.r}</small></span>${sparkline(h.map(s => s.e))}<span class="delta ${ch > 0.05 ? 'up' : ch < -0.05 ? 'down' : ''}">${h.length > 1 ? (ch >= 0 ? '+' : '') + ch.toFixed(0) + '%' : 'new'}</span></li>`;
      });
    if (rows.length) { any = true; html += `<h4>${p.name}</h4><ul class="ex-list">${rows.join('')}</ul>`; }
  }
  if (!any) html += `<p class="empty">Log a workout to start tracking.</p>`;
  html += `</section>`;

  const days = S.sortedDays().filter(k => Object.keys(S.get().days[k].log).length).reverse().slice(0, 30);
  html += `<section class="card"><h3>History</h3>`;
  if (!days.length) html += `<p class="empty">Nothing logged yet.</p>`;
  html += `<ul class="hist">`;
  for (const k of days) {
    const d = S.get().days[k];
    const sets = Object.values(d.log).filter(s => !s.skipped);
    const mins = d.started && d.finished ? Math.round((d.finished - d.started) / 60000) + ' min' : d.finished ? '' : 'in progress';
    html += `<li><button data-act="toggle-day" data-k="${k}"><b>${esc(longDate(k))}</b><small>${sets.length} sets${mins ? ' · ' + mins : ''}</small></button>`;
    if (ui.openDay === k) {
      html += `<ul class="sets">${d.plan.map((id, i) => { const s = d.log[i]; return `<li><span>${esc(EX[id]?.name || id)}</span><span>${s ? (s.skipped ? 'skipped' : `${fmtW(s.w)} × ${s.r}${s.rir != null ? ` <small>RIR ${s.rir === 3 ? '3+' : s.rir}</small>` : ''}`) : '—'}</span></li>`; }).join('')}</ul>`;
    }
    html += `</li>`;
  }
  html += `</ul></section>`;
  main.innerHTML = html;

  barChart($('#ch-dur'), dur.slice(-30).map(d => ({ day: d.day, v: d.min })), { target: 25, unit: 'min', fmt: v => v.toFixed(0) });
  lineChart($('#ch-si'), si, { base: 100, fmt: v => v.toFixed(0) });
}

// ---------- SETTINGS ----------
function renderSettings() {
  const st = S.get().settings;
  let html = `<header class="top"><div><div class="eyebrow">Set a Day</div><h1>Settings</h1></div></header>`;
  html += `<section class="card"><h3>Units</h3><div class="seg wide">${['lb', 'kg'].map(u => `<button class="${st.units === u ? 'on' : ''}" data-act="units" data-v="${u}">${u}</button>`).join('')}</div>
    <p class="sub">Changing units doesn't convert past entries.</p></section>`;
  html += `<section class="card"><h3>Equipment</h3><p class="sub">Only exercises using equipment you have are scheduled. Changes apply to the next workout — or reshuffle today's before you start.</p><ul class="toggles">`;
  for (const e of EQUIPMENT) {
    html += `<li><label><span><b>${esc(e.name)}</b>${e.note ? `<small>${esc(e.note)}</small>` : ''}</span><input type="checkbox" role="switch" data-act="equip" data-id="${e.id}" ${st.equip[e.id] ? 'checked' : ''}></label></li>`;
  }
  html += `</ul></section>`;
  html += `<section class="card"><h3>Your data</h3><p class="sub">Everything is stored on this phone only. Export a backup now and then — if the app is deleted from your home screen, its data goes with it.</p>
    <div class="row-actions"><button class="btn ghost" data-act="export">Export backup</button><button class="btn ghost" data-act="import">Import backup</button></div>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <div class="row-actions"><button class="btn danger" data-act="reset">Erase all data</button></div></section>`;
  html += `<section class="card about"><h3>The method</h3>
    <p>One hard set for each of 10 body parts, every day. Exercises rotate so joints and motivation stay fresh; the order always puts at least one set between exercises that work similar muscles, so each set can be taken close to failure without a long rest.</p>
    <p><b>Progression:</b> work in the rep range. When you hit the top, add weight next time. Big lifts stop 1–2 reps short of failure; small isolation lifts can go to 0–1.</p>
    <p><b>Warm-up:</b> for the first barbell lift of the day, do one light set of 5 first. It isn't logged.</p></section>`;
  main.innerHTML = html;
}

// ---------- sheet ----------
function openSheet(title, body) {
  const sh = $('#sheet');
  sh.querySelector('.sheet-title').innerHTML = title;
  sh.querySelector('.sheet-body').innerHTML = body;
  sh.showModal();
}

// ---------- routing ----------
function render() {
  if (ui.stopFig) { ui.stopFig(); ui.stopFig = null; }
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('on', b.dataset.view === ui.view));
  if (ui.view === 'today') renderToday();
  else if (ui.view === 'progress') renderProgress();
  else renderSettings();
}

async function exportData() {
  const json = JSON.stringify(S.get(), null, 1);
  const name = `set-a-day-${S.dayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Set a Day backup' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act], .tabbar button');
  if (!t) return;
  if (t.dataset.view) { ui.view = t.dataset.view; render(); window.scrollTo(0, 0); return; }
  const act = t.dataset.act;
  const { key, day } = ui.view === 'today' ? dayState() : {};
  switch (act) {
    case 'focus': {
      readInputsSafe();
      ui.focus = +t.dataset.i; initDraft(day, key, ui.focus); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    }
    case 'w-': case 'w+': {
      readInputs(); const ex = EX[day.plan[ui.focus]]; const inc = increment(ex);
      ui.draft.w = Math.max(0, (+ui.draft.w || 0) + (act === 'w+' ? inc : -inc)); $('#in-w').value = fmtW(ui.draft.w); break;
    }
    case 'r-': case 'r+': {
      readInputs(); ui.draft.r = Math.max(0, (+ui.draft.r || 0) + (act === 'r+' ? 1 : -1)); $('#in-r').value = ui.draft.r; break;
    }
    case 'rir': ui.draft.rir = +t.dataset.v; t.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === t)); break;
    case 'log': logCurrent(false); break;
    case 'skip': logCurrent(true); break;
    case 'clear': {
      delete day.log[ui.focus];
      if (day.finished) day.finished = null;
      if (!Object.keys(day.log).length) day.started = null;
      S.save(); initDraft(day, key, ui.focus); render(); break;
    }
    case 'finish': {
      if (!confirm('Finish now? Remaining exercises stay unlogged.')) return;
      day.finished = Date.now(); ui.focus = null; S.save(); render(); break;
    }
    case 'reshuffle': S.reshuffle(key); ui.focus = null; render(); break;
    case 'swap': readInputsSafe(); openSwap(); break;
    case 'pick-alt': {
      day.plan[ui.focus] = t.dataset.id; S.save(); $('#sheet').close(); initDraft(day, key, ui.focus); render(); break;
    }
    case 'units': S.get().settings.units = t.dataset.v; S.save(); render(); break;
    case 'toggle-day': ui.openDay = ui.openDay === t.dataset.k ? null : t.dataset.k; render(); break;
    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
    case 'reset': {
      if (confirm('Erase every workout and setting on this phone? Export a backup first if unsure.') && confirm('Really erase everything?')) { S.resetAll(); ui.focus = null; render(); toast('All data erased.'); }
      break;
    }
    case 'close-sheet': $('#sheet').close(); break;
  }
});

function readInputsSafe() { if ($('#in-w') && ui.draft) readInputs(); }

document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.act === 'equip') { S.get().settings.equip[t.dataset.id] = t.checked; S.save(); }
  if (t.id === 'import-file' && t.files[0]) {
    try {
      const data = JSON.parse(await t.files[0].text());
      if (!data || !data.days || !data.settings) throw new Error('bad');
      if (!confirm(`Replace current data with this backup (${Object.keys(data.days).length} days)?`)) return;
      S.replaceAll(data); ui.focus = null; render(); toast('Backup restored.');
    } catch { toast('That file isn’t a Set a Day backup.'); }
    t.value = '';
  }
});

// select-all on focus makes thumb entry faster
document.addEventListener('focusin', e => { if (e.target.matches('.stepper input')) setTimeout(() => e.target.select(), 0); });

// live workout clock
setInterval(() => {
  const el = $('#timer'); if (!el || ui.view !== 'today') return;
  const { day } = dayState(); if (day.started && !day.finished) el.textContent = fmtClock(Date.now() - day.started);
}, 1000);

// a new day while the app sat in the background → show the new workout
document.addEventListener('visibilitychange', () => { if (!document.hidden && ui.view === 'today' && ui.focusKey !== S.activeKey()) { ui.focus = null; render(); } });

if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

render();
