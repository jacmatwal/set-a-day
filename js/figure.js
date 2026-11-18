// Tiny stick-figure animator. Two keyframes (A = start, B = end) are
// interpolated and rendered to SVG. Side view uses forward kinematics (fk:
// absolute segment angles) or two-bone IK (ik: target point + bend side).
// Angles: 0 = pointing down, 90 = forward (+x), 180 = up, 270 = back.

const LEN = { torso: 46, neck: 14, headR: 8, ua: 28, fa: 26, hand: 9, th: 38, sh: 38, foot: 11 };
const GROUND = 152;
const rad = d => d * Math.PI / 180;
const dir = a => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p, v, s = 1) => [p[0] + v[0] * s, p[1] + v[1] * s];
const angleOf = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]) * 180 / Math.PI;

function ik(p, t, l1, l2, bend) {
  const dx = t[0] - p[0], dy = t[1] - p[1];
  let d = Math.hypot(dx, dy);
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const c1 = [p[0] + l1 * Math.cos(base + a), p[1] + l1 * Math.sin(base + a)];
  const c2 = [p[0] + l1 * Math.cos(base - a), p[1] + l1 * Math.sin(base - a)];
  const pick = { fwd: (u, v) => u[0] >= v[0], back: (u, v) => u[0] <= v[0], up: (u, v) => u[1] <= v[1], down: (u, v) => u[1] >= v[1] }[bend || 'fwd'];
  const j = pick(c1, c2) ? c1 : c2;
  const ang = angleOf(j, t);
  return { joint: j, end: add(j, dir(ang), l2) };
}

function solveSide(s) {
  const J = { legs: [], arms: [] };
  J.hip = s.hip;
  J.shoulder = add(s.hip, dir(s.t), LEN.torso);
  J.head = add(J.shoulder, dir(s.t), LEN.neck);
  J.t = s.t;
  for (const leg of s.legs || []) {
    let knee, ankle;
    if (leg.fk) { knee = add(J.hip, dir(leg.fk[0]), LEN.th); ankle = add(knee, dir(leg.fk[1]), LEN.sh); }
    else { const r = ik(J.hip, leg.ik, LEN.th, LEN.sh, leg.bend); knee = r.joint; ankle = r.end; }
    const toe = add(ankle, dir(angleOf(knee, ankle) + 90), LEN.foot);
    J.legs.push({ knee, ankle, toe });
  }
  for (const arm of s.arms || []) {
    let elbow, hand, tip = null;
    if (arm.fk) {
      elbow = add(J.shoulder, dir(arm.fk[0]), LEN.ua); hand = add(elbow, dir(arm.fk[1]), LEN.fa);
      if (arm.fk.length > 2) tip = add(hand, dir(arm.fk[2]), LEN.hand);
    } else {
      const base = arm.rel === 'shoulder' ? J.shoulder : arm.rel === 'hip' ? J.hip : [0, 0];
      const r = ik(J.shoulder, add(base, arm.ik), LEN.ua, LEN.fa, arm.bend);
      elbow = r.joint; hand = r.end;
    }
    J.arms.push({ elbow, hand, tip });
  }
  return J;
}

function solveFront(s) {
  const cx = s.cx ?? 100, hipY = 73;
  const neck = [cx, hipY - 44];
  const J = { front: true, hip: [cx, hipY], neck, head: [cx, hipY - 44 - 14] };
  J.shL = [cx - 16, hipY - 42]; J.shR = [cx + 16, hipY - 42];
  J.hipL = [cx - 8, hipY]; J.hipR = [cx + 8, hipY];
  J.ankL = [cx - 13, 148]; J.ankR = [cx + 13, 148];
  const arm = (sh, a, sign) => {
    const d1 = [sign * Math.sin(rad(a.ua)), Math.cos(rad(a.ua))];
    const elbow = add(sh, d1, LEN.ua * (a.us ?? 1));
    const d2 = [sign * Math.sin(rad(a.fa)), Math.cos(rad(a.fa))];
    return { elbow, hand: add(elbow, d2, LEN.fa * (a.fs ?? 1)) };
  };
  const L = arm(J.shL, s.L, -1), R = arm(J.shR, s.R, 1);
  J.elbowL = L.elbow; J.handL = L.hand; J.elbowR = R.elbow; J.handR = R.hand;
  return J;
}

const solve = (view, s) => (view === 'front' ? solveFront(s) : solveSide(s));

function lerp(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], t));
  if (a && typeof a === 'object') { const o = {}; for (const k in a) o[k] = k in b ? lerp(a[k], b[k], t) : a[k]; return o; }
  return a;
}

function anchor(J, at) {
  if (Array.isArray(at)) return at;
  switch (at) {
    case 'hand': return J.arms[0].hand;
    case 'tip': return J.arms[0].tip || J.arms[0].hand;
    case 'hip': return J.hip;
    case 'shoulder': return J.shoulder;
    case 'ankle': return J.legs[0].ankle;
    case 'handL': return J.handL;
    case 'handR': return J.handR;
  }
  return [0, 0];
}

const f = n => n.toFixed(1);
const line = (p, q, cls) => `<line class="${cls}" x1="${f(p[0])}" y1="${f(p[1])}" x2="${f(q[0])}" y2="${f(q[1])}"/>`;
const poly = (pts, cls) => `<polyline class="${cls}" points="${pts.map(p => f(p[0]) + ',' + f(p[1])).join(' ')}"/>`;

function staticProps(props) {
  let s = '';
  for (const p of props || []) {
    if (p.type === 'rack') {
      s += line([p.x1, -300], [p.x1, GROUND], 'fp-faint') + line([p.x2, -300], [p.x2, GROUND], 'fp-faint');
    } else if (p.type === 'bench') {
      s += `<rect class="fp-solid" x="${p.x1}" y="${p.y}" width="${p.x2 - p.x1}" height="5" rx="2"/>`;
      s += line([p.x1 + 6, p.y + 5], [p.x1 + 6, GROUND], 'fp') + line([p.x2 - 6, p.y + 5], [p.x2 - 6, GROUND], 'fp');
    } else if (p.type === 'pad') {
      s += poly(p.pts, 'fp-pad');
    } else if (p.type === 'box') {
      s += `<rect class="fp-box" x="${p.x1}" y="${p.y}" width="${p.x2 - p.x1}" height="${GROUND - p.y}" rx="2"/>`;
    } else if (p.type === 'cable') {
      const x = p.from[0];
      s += `<rect class="fp-tower" x="${x - 5}" y="-300" width="10" height="${GROUND + 300}"/>`;
      s += `<circle class="fp-solid" cx="${x}" cy="${p.from[1]}" r="3.5"/>`;
    } else if (p.type === 'bar') {
      s += line([p.at[0] - 20, p.at[1]], [p.at[0] + 20, p.at[1]], 'fp');
    }
  }
  return s;
}

function dynamicProps(J, props) {
  let s = '';
  for (const p of props || []) {
    if (p.type === 'plate') {
      let c = anchor(J, p.at);
      if (p.back) { const d = dir(J.t); c = add(c, [d[1], -d[0]], p.back); }
      c = add(c, [p.dx || 0, p.dy || 0]);
      s += `<circle class="fp-load" cx="${f(c[0])}" cy="${f(c[1])}" r="${p.r || 10}"/><circle class="fp-hub" cx="${f(c[0])}" cy="${f(c[1])}" r="2"/>`;
    } else if (p.type === 'db') {
      const c = anchor(J, p.at); const w = p.big ? 9 : 7;
      s += `<rect class="fp-load" x="${f(c[0] - w)}" y="${f(c[1] - w * 0.6)}" width="${w * 2}" height="${w * 1.2}" rx="2.5"/>`;
    } else if (p.type === 'cable') {
      s += line(p.from, anchor(J, p.at), 'fp-cable');
    } else if (p.type === 'roll') {
      const L = J.legs[0];
      const a = angleOf(L.knee, L.ankle) + (p.side === 'front' ? 90 : -90);
      const c = add(add(L.ankle, dir(a), 7), dir(angleOf(L.ankle, L.knee)), 4);
      s += `<circle class="fp-solid" cx="${f(c[0])}" cy="${f(c[1])}" r="5.5"/>`;
    }
  }
  return s;
}

function body(J) {
  if (J.front) {
    let s = '';
    s += line(J.hipL, J.ankL, 'fb') + line(J.hipR, J.ankR, 'fb');
    s += line(J.hipL, J.hipR, 'fb') + line(J.hip, J.neck, 'fb') + line(J.shL, J.shR, 'fb');
    s += poly([J.shL, J.elbowL, J.handL], 'fb') + poly([J.shR, J.elbowR, J.handR], 'fb');
    s += `<circle class="fb-head" cx="${f(J.head[0])}" cy="${f(J.head[1])}" r="${LEN.headR}"/>`;
    return s;
  }
  let back = '', front = '';
  J.legs.forEach((L, i) => { const c = i ? 'fb fb-far' : 'fb'; const seg = poly([J.hip, L.knee, L.ankle, L.toe], c); if (i) back += seg; else front += seg; });
  J.arms.forEach((A, i) => {
    const pts = [J.shoulder, A.elbow, A.hand]; if (A.tip) pts.push(A.tip);
    const seg = poly(pts, i ? 'fb fb-far' : 'fb'); if (i) back += seg; else front += seg;
  });
  return back + line(J.hip, J.shoulder, 'fb') + `<circle class="fb-head" cx="${f(J.head[0])}" cy="${f(J.head[1])}" r="${LEN.headR}"/>` + front;
}

function bounds(anim) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = GROUND;
  const eat = p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); };
  for (const k of ['A', 'B']) {
    const J = solve(anim.view, anim[k]);
    if (J.front) {
      [J.head, J.shL, J.shR, J.elbowL, J.elbowR, J.handL, J.handR, J.ankL, J.ankR].forEach(eat);
      eat([J.head[0], J.head[1] - LEN.headR]);
    } else {
      [J.hip, J.shoulder].forEach(eat);
      eat([J.head[0], J.head[1] - LEN.headR]); eat([J.head[0] + LEN.headR, J.head[1]]); eat([J.head[0] - LEN.headR, J.head[1]]);
      J.legs.forEach(L => [L.knee, L.ankle, L.toe].forEach(eat));
      J.arms.forEach(A => [A.elbow, A.hand, A.tip].filter(Boolean).forEach(eat));
    }
  }
  for (const p of anim.props || []) {
    if (p.type === 'bench' || p.type === 'box') { eat([p.x1, p.y]); eat([p.x2, p.y]); }
    if (p.type === 'pad') p.pts.forEach(eat);
    if (p.type === 'cable') eat(p.from);
    if (p.type === 'bar') eat(p.at);
  }
  const pad = 14;
  x0 -= pad; x1 += pad; y0 -= pad; y1 += 6;
  // fixed 4:3 aspect, centred
  let w = x1 - x0, h = y1 - y0;
  if (w / h < 4 / 3) { const nw = h * 4 / 3; x0 -= (nw - w) / 2; w = nw; }
  else { const nh = w * 3 / 4; y0 -= nh - h; h = nh; }
  return [x0, y0, w, h];
}

const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const CYCLE = 3600; // ms: hold A, A→B, hold B, B→A (slower return)
function phase(ms) {
  const t = ms % CYCLE;
  if (t < 400) return 0;
  if (t < 1600) return ease((t - 400) / 1200);
  if (t < 2000) return 1;
  return 1 - ease((t - 2000) / 1600);
}

export function frameSVG(anim, k) {
  const pose = lerp(anim.A, anim.B, k);
  const J = solve(anim.view, pose);
  const props = anim.props || [];
  const behind = props.filter(p => p.type === 'plate' && p.at === 'shoulder');
  return staticProps(props) + dynamicProps(J, behind) + body(J) + dynamicProps(J, props.filter(p => !behind.includes(p)));
}

// Mount an animated figure into `el`. Returns a stop() function.
export function mountFigure(el, anim, { still = false } = {}) {
  const [x, y, w, h] = bounds(anim);
  el.innerHTML = `<svg viewBox="${f(x)} ${f(y)} ${f(w)} ${f(h)}" class="figure" role="img" aria-label="Form animation"><line class="fp-ground" x1="${f(x - 10)}" y1="${GROUND}" x2="${f(x + w + 10)}" y2="${GROUND}"/><g class="fig-g"></g></svg>`;
  const g = el.querySelector('.fig-g');
  if (still) { g.innerHTML = frameSVG(anim, 0); return () => {}; }
  let raf = 0, start = performance.now(), paused = false, pausedAt = 0;
  const tick = now => { g.innerHTML = frameSVG(anim, phase(now - start)); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  el.onclick = () => {
    if (paused) { start += performance.now() - pausedAt; raf = requestAnimationFrame(tick); }
    else { cancelAnimationFrame(raf); pausedAt = performance.now(); }
    paused = !paused; el.classList.toggle('paused', paused);
  };
  return () => cancelAnimationFrame(raf);
}
