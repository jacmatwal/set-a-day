// Minimal single-series SVG charts with a tap/hover tooltip.
const W = 340, H = 170, P = { l: 34, r: 10, t: 12, b: 24 };
const fmtDay = k => { const [, m, d] = k.split('-'); return `${+m}/${+d}`; };

function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p * 2) / 2 * p; }

function frame(yMin, yMax, ticks, fmt) {
  const ih = H - P.t - P.b;
  let s = '';
  for (const t of ticks) {
    const y = P.t + ih * (1 - (t - yMin) / (yMax - yMin));
    s += `<line class="ch-grid" x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}"/><text class="ch-tick" x="${P.l - 6}" y="${y + 3.5}" text-anchor="end">${fmt(t)}</text>`;
  }
  return s;
}

function attachTip(el, points, label) {
  const svg = el.querySelector('svg'), tip = el.querySelector('.ch-tip'), cross = el.querySelector('.ch-cross');
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const x = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) * (W / r.width);
    let best = points[0];
    for (const p of points) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    tip.innerHTML = label(best.d);
    tip.style.display = 'block';
    const px = best.x / W * r.width;
    tip.style.left = Math.min(Math.max(px, 50), r.width - 50) + 'px';
    if (cross) { cross.setAttribute('x1', best.x); cross.setAttribute('x2', best.x); cross.style.display = 'block'; }
    el.querySelectorAll('.ch-hit').forEach(n => n.classList.toggle('on', +n.dataset.i === best.i));
  };
  const hide = () => { tip.style.display = 'none'; if (cross) cross.style.display = 'none'; el.querySelectorAll('.ch-hit.on').forEach(n => n.classList.remove('on')); };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide);
}

export function barChart(el, data, { target, unit = '', fmt = v => v.toFixed(0) } = {}) {
  if (!data.length) { el.innerHTML = '<p class="empty">Finish a workout to see this.</p>'; return; }
  const yMax = niceMax(Math.max(target || 0, ...data.map(d => d.v)) * 1.1);
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const slot = iw / data.length, bw = Math.max(3, Math.min(22, slot - 2));
  const ticks = [0, yMax / 2, yMax];
  let s = frame(0, yMax, ticks, fmt);
  const pts = [];
  data.forEach((d, i) => {
    const x = P.l + slot * i + slot / 2, h = ih * d.v / yMax, y = P.t + ih - h;
    const r = Math.min(4, bw / 2, h);
    s += `<path class="ch-bar ch-hit" data-i="${i}" d="M${x - bw / 2},${P.t + ih} V${y + r} q0,-${r} ${r},-${r} H${x + bw / 2 - r} q${r},0 ${r},${r} V${P.t + ih} Z"/>`;
    pts.push({ x, i, d });
  });
  if (target) {
    const y = P.t + ih * (1 - target / yMax);
    s += `<line class="ch-ref" x1="${P.l}" x2="${W - P.r}" y1="${y}" y2="${y}"/><text class="ch-ref-label" x="${W - P.r}" y="${y - 4}" text-anchor="end">${target} ${unit} goal</text>`;
  }
  s += `<line class="ch-axis" x1="${P.l}" x2="${W - P.r}" y1="${P.t + ih}" y2="${P.t + ih}"/>`;
  s += `<text class="ch-tick" x="${P.l}" y="${H - 6}">${fmtDay(data[0].day)}</text><text class="ch-tick" x="${W - P.r}" y="${H - 6}" text-anchor="end">${fmtDay(data[data.length - 1].day)}</text>`;
  el.innerHTML = `<div class="ch"><svg viewBox="0 0 ${W} ${H}">${s}</svg><div class="ch-tip"></div></div>`;
  attachTip(el, pts, d => `<b>${fmt(d.v)} ${unit}</b><span>${fmtDay(d.day)}</span>`);
}

export function lineChart(el, data, { base, fmt = v => v.toFixed(0), unit = '' } = {}) {
  if (data.length < 2) { el.innerHTML = '<p class="empty">Needs at least two workouts.</p>'; return; }
  const vals = data.map(d => d.v).concat(base ?? []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max(2, (hi - lo) * 0.15); lo = Math.floor(lo - pad); hi = Math.ceil(hi + pad);
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const X = i => P.l + (data.length === 1 ? iw / 2 : iw * i / (data.length - 1));
  const Y = v => P.t + ih * (1 - (v - lo) / (hi - lo));
  let s = frame(lo, hi, [lo, Math.round((lo + hi) / 2), hi], fmt);
  if (base != null) s += `<line class="ch-ref" x1="${P.l}" x2="${W - P.r}" y1="${Y(base)}" y2="${Y(base)}"/><text class="ch-ref-label" x="${W - P.r}" y="${Y(base) - 4}" text-anchor="end">start</text>`;
  s += `<polyline class="ch-line" points="${data.map((d, i) => `${X(i)},${Y(d.v)}`).join(' ')}"/>`;
  const last = data[data.length - 1];
  s += `<circle class="ch-dot" cx="${X(data.length - 1)}" cy="${Y(last.v)}" r="4"/>`;
  s += `<line class="ch-cross" x1="0" x2="0" y1="${P.t}" y2="${P.t + ih}" style="display:none"/>`;
  data.forEach((d, i) => { s += `<circle class="ch-hit ch-pt" data-i="${i}" cx="${X(i)}" cy="${Y(d.v)}" r="4"/>`; });
  s += `<text class="ch-tick" x="${P.l}" y="${H - 6}">${fmtDay(data[0].day)}</text><text class="ch-tick" x="${W - P.r}" y="${H - 6}" text-anchor="end">${fmtDay(last.day)}</text>`;
  el.innerHTML = `<div class="ch"><svg viewBox="0 0 ${W} ${H}">${s}</svg><div class="ch-tip"></div></div>`;
  attachTip(el, data.map((d, i) => ({ x: X(i), i, d })), d => `<b>${fmt(d.v)}${unit}</b><span>${fmtDay(d.day)}</span>`);
}

export function sparkline(values) {
  if (values.length < 2) return '';
  const w = 72, h = 22, lo = Math.min(...values), hi = Math.max(...values), r = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1) * (w - 4) + 2).toFixed(1)},${(h - 3 - (v - lo) / r * (h - 6)).toFixed(1)}`);
  const [lx, ly] = pts[pts.length - 1].split(',');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts.join(' ')}"/><circle cx="${lx}" cy="${ly}" r="2.5"/></svg>`;
}
