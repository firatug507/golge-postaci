'use strict';
/* Gölge Postacı v0.1 — original game, procedural art & synthesized audio. */
(() => {
const VERSION = '0.1';
const TEST = /[?&]test=1/.test(location.search);

// ---------- Content ----------
const LETTERS = [
  {id:1, title:'Sarı yağmurluklu kıza', body:'Geçen hafta şemsiyeni tamir eden çocuk bendim. Aslında onu bilerek bozmuştum. Özür dilerim.\nBir kahveye ne dersin?'},
  {id:2, title:'Anneme', body:'Anne, çatı artık akmıyor. Gitmeden önce tamir ettim.\nLütfen artık benim için kova koymayı bırak.'},
  {id:3, title:'Bacadaki Güvercin Bey\'e', body:'Sayın Güvercin Bey, bacadan tahliye edildiniz.\nİmza: Alt kattaki aile.\nNot: Sizi özleyeceğiz.'},
  {id:4, title:'Gece üçte piyano çalana', body:'Gece üçte piyano çalan her kimse: Lütfen bırakma.\nUyuyabilmemi sağlayan tek şey o.'},
  {id:5, title:'Dedeme', body:'Dedeciğim, tavan arasında eski mektuplarını buldum. Ninem her birini saklamış.\nBu arada cevabı evetmiş. Her seferinde.'},
  {id:6, title:'Komşuma', body:'Kedi senin değil. Kedi benim de değil.\nKedinin iki evi var ve ikimizi de kandırıyor.'},
  {id:7, title:'Kardeşime', body:'Kardeşim, odanı olduğu gibi bıraktım. Pencere hâlâ açık.\nYağmur dinince eve gel.'},
  {id:8, title:'Köşedeki fırına', body:'1998\'de sizden bir poğaça çaldım. Parası faiziyle birlikte zarfın içinde.\nÇok lezzetliydi.'},
  {id:9, title:'Gelecekteki bana', body:'Sevgili gelecekteki ben: Bunu okuyorsan sonunda bu yağmurlu kasabadan taşınmışsın demektir.\nDeğdi mi?'},
  {id:10, title:'Penceremin altında şarkı söyleyene', body:'Dün gece penceremin altında şarkı söyleyen yabancı: Berbattın.\nYarın yine gel.'},
];
const SHOP = [
  {id:'cape_gece',  type:'cape', name:'Gece Mavisi',     color:'#2c3670', price:0},
  {id:'cape_kiremit',type:'cape', name:'Kiremit Kızılı',  color:'#a8412e', price:40},
  {id:'cape_yosun', type:'cape', name:'Yosun Yeşili',    color:'#3d7050', price:90},
  {id:'cape_safak', type:'cape', name:'Şafak Altını',    color:'#d9a23c', price:180},
  {id:'rope_kenevir',type:'rope', name:'Kenevir',        color:'#cdb88c', price:0},
  {id:'rope_fener', type:'rope', name:'Fener Turuncusu', color:'#ff9a3c', price:30},
  {id:'rope_gumus', type:'rope', name:'Ay Gümüşü',       color:'#d4dcff', price:70},
  {id:'rope_erik',  type:'rope', name:'Erik Moru',       color:'#b46ae0', price:130},
];
const shopItem = id => SHOP.find(s => s.id === id);

// ---------- Save ----------
const LS_KEY = 'golgePostaci.save.v1';
const defaultSave = () => ({best:0, stamps:0, letters:[], owned:['cape_gece','rope_kenevir'], cape:'cape_gece', rope:'rope_kenevir', muted:false, runs:0, deliveries:0});
let save = defaultSave();
try { const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (s) save = Object.assign(defaultSave(), s); } catch (e) {}
function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(save)); } catch (e) {} }

// ---------- Utils ----------
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
let seed = 1;
function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
const R = (a, b) => a + (b - a) * rnd();
const mixColor = (c1, c2, t) => {
  const p = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
  const a = p(c1), b = p(c2);
  return `rgb(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))})`;
};
function vibrate(ms) {
  try { if (window.AndroidBridge && AndroidBridge.vibrate) { AndroidBridge.vibrate(ms); return; } } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}

// ---------- Audio (synthesized, original) ----------
const Snd = {
  ctx:null, master:null, noiseBuf:null, rainGain:null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = save.muted ? 0 : 0.8; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startRain();
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { save.muted = m; persist(); if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05); },
  tone(f, dur, type='sine', vol=0.2, to=null, delay=0) {
    if (!this.ctx || save.muted) return; const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, ftype, f, vol, q=1, fto=null, delay=0) {
    if (!this.ctx || save.muted) return; const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const fl = this.ctx.createBiquadFilter(); fl.type = ftype; fl.frequency.setValueAtTime(f, t); fl.Q.value = q; if (fto) fl.frequency.exponentialRampToValueAtTime(fto, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  startRain() {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    this.rainGain = this.ctx.createGain(); this.rainGain.gain.value = 0.045;
    s.connect(hp); hp.connect(lp); lp.connect(this.rainGain); this.rainGain.connect(this.master); s.start();
  },
  rope()    { this.noise(0.14, 'bandpass', 900, 0.35, 3, 3200); this.tone(420, 0.09, 'triangle', 0.12, 820); },
  release() { this.noise(0.3, 'bandpass', 500, 0.22, 1.2, 1600); },
  land(h)   { this.tone(150, 0.2, 'sine', 0.45 * h + 0.1, 55); this.noise(0.14, 'lowpass', 900, 0.3 * h + 0.08); },
  stamp()   { this.tone(1250, 0.07, 'square', 0.05); this.tone(1870, 0.1, 'square', 0.05, null, 0.05); },
  deliver() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.55, 'sine', 0.2, null, i * 0.08)); this.tone(2093, 0.8, 'triangle', 0.05, null, 0.32); },
  fall()    { this.tone(520, 0.7, 'triangle', 0.18, 110); },
  dawn()    { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.9, 'sine', 0.16, null, i * 0.14)); },
  click()   { this.tone(880, 0.05, 'square', 0.04); },
  buy()     { this.tone(660, 0.12, 'square', 0.06); this.tone(990, 0.2, 'square', 0.06, null, 0.1); },
  miss()    { this.tone(200, 0.12, 'sawtooth', 0.05, 150); },
};

// ---------- Canvas / view ----------
const cv = $('c'), ctx = cv.getContext('2d');
let W = 390, H = 844, DPR = 1, SCALE = 1, VW = 440, VH = 950;
const BOTTOM_Y = 300, DEATH_Y = 360;
function resize() {
  W = window.innerWidth; H = window.innerHeight; DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  SCALE = Math.min(W / 410, H / 680); VW = W / SCALE; VH = H / SCALE;
  buildFar();
}
window.addEventListener('resize', resize);

// ---------- Background (parallax, pre-rendered) ----------
let far = [], stars = [], clouds = [];
function buildFar() {
  const oldSeed = seed; seed = 777;
  far = [];
  const cfg = [
    {f:0.08, col:'#2a2f68', win:'rgba(255,200,120,0.35)', hMin:0.10, hMax:0.24, wMin:18, wMax:46, winP:0.10},
    {f:0.2,  col:'#1d2152', win:'rgba(255,190,110,0.55)', hMin:0.14, hMax:0.32, wMin:26, wMax:64, winP:0.16},
    {f:0.4,  col:'#141739', win:'rgba(255,185,100,0.75)', hMin:0.18, hMax:0.40, wMin:36, wMax:90, winP:0.2},
  ];
  for (const c of cfg) {
    const lw = Math.max(900, Math.ceil(W * 2.2)), lh = Math.ceil(H * 0.6);
    const oc = document.createElement('canvas'); oc.width = Math.ceil(lw * DPR); oc.height = Math.ceil(lh * DPR);
    const o = oc.getContext('2d'); o.scale(DPR, DPR);
    let x = 0;
    while (x < lw) {
      const bw = R(c.wMin, c.wMax), bh = H * R(c.hMin, c.hMax); const top = lh - bh;
      o.fillStyle = c.col; o.fillRect(x, top, bw + 1, bh);
      if (rnd() < 0.4) { o.beginPath(); o.moveTo(x - 2, top); o.lineTo(x + bw / 2, top - R(8, 26)); o.lineTo(x + bw + 2, top); o.fill(); }
      if (rnd() < 0.3) { o.fillRect(x + bw * R(0.2, 0.8), top - R(10, 30), 2, 30); }
      if (rnd() < 0.25) { const cx = x + bw * R(0.15, 0.7); o.fillRect(cx, top - 10, 6, 10); }
      o.fillStyle = c.win;
      for (let wy = top + 8; wy < lh - 4; wy += 9 + c.f * 20) for (let wx = x + 4; wx < x + bw - 4; wx += 7 + c.f * 14) if (rnd() < c.winP) o.fillRect(wx, wy, 2 + c.f * 5, 3 + c.f * 6);
      x += bw + R(0, 6);
    }
    far.push({canvas:oc, f:c.f, lw, lh});
  }
  stars = []; for (let i = 0; i < 90; i++) stars.push({x:rnd(), y:rnd() * 0.5, r:R(0.5, 1.6), p:R(0, 6.28)});
  clouds = []; for (let i = 0; i < 6; i++) clouds.push({x:R(0, 1.4), y:R(0.05, 0.35), s:R(0.6, 1.4), v:R(0.004, 0.012)});
  seed = oldSeed;
}

// ---------- World ----------
let world;
function newWorld(s) {
  seed = s;
  world = {buildings:[], anchors:[], stamps:[], mailboxes:[], lines:[], genX:-260, lastTop:-60, count:0};
  addBuilding(-260, 620, -60, true);
  ensureGen(2000);
}
function addBuilding(x, w, top, first=false) {
  const b = {x, w, top, wins:[], chims:[], id:world.count++, hue:R(0, 1)};
  // windows
  const cols = Math.floor((w - 24) / 34); const ox = x + (w - (cols - 1) * 34) / 2;
  for (let r = 0; r < 10; r++) for (let c = 0; c < cols; c++) {
    const lit = rnd() < 0.32; b.wins.push({x:ox + c * 34 - 7, y:top + 46 + r * 50, lit, warm:R(0, 1), fl:rnd() < 0.06});
  }
  // chimneys
  const nc = rnd() < 0.7 ? (rnd() < 0.4 ? 2 : 1) : 0;
  for (let i = 0; i < nc; i++) b.chims.push({x:x + R(20, w - 50), w:R(16, 26), h:R(22, 42), smoke:rnd() < 0.5});
  world.buildings.push(b);
  // anchors: one near the far end, plus one in the middle of wide roofs
  const mk = (ax, ay, kind) => { const a = {x:ax, y:ay, kind, b, base:top}; world.anchors.push(a); return a; };
  const endA = mk(x + w - R(12, 60), top - R(175, 250), rnd() < 0.5 ? 'antenna' : 'pole');
  let midA = null;
  if (w > 300 || first) midA = mk(x + w * R(0.3, 0.45), top - R(170, 230), 'antenna');
  // stamps along swing arcs
  for (const a of [endA, midA]) {
    if (!a || first && a === midA || rnd() > 0.65) continue;
    const r = Math.min(a.base - a.y - 45, 230);
    for (let k = -1; k <= 1; k++) { const ang = k * 0.45 + 0.35; world.stamps.push({x:a.x + Math.sin(ang) * r, y:a.y + Math.cos(ang) * r, got:false, ph:rnd() * 6}); }
  }
  // mailbox
  if (!first && (world.count % 5 === 0 || rnd() < 0.06)) world.mailboxes.push({x:x + w * R(0.35, 0.65), y:top, done:false, b});
  return b;
}
function ensureGen(toX) {
  while (world.genX < toX) {
    const last = world.buildings[world.buildings.length - 1];
    const d = Math.max(0, last.x + last.w);
    const diff = clamp(d / 6000, 0, 1);
    const gap = R(60 + 100 * diff, 115 + 165 * diff);
    const w = R(170 - 30 * diff, 340 - 80 * diff);
    const top = clamp(last.top + R(-80, 80), -170, 0);
    const nb = addBuilding(last.x + last.w + gap, w, top);
    // laundry line bridging wide gaps (with a ring you can grab)
    if (gap > 175 && rnd() < 0.8) {
      const x1 = last.x + last.w - 8, x2 = nb.x + 8;
      const y1 = last.top - R(150, 200), y2 = nb.top - R(150, 200);
      const ln = {x1, y1, b1:last.top, x2, y2, b2:nb.top, clothes:[]};
      for (let t = 0.12; t < 0.9; t += R(0.1, 0.2)) ln.clothes.push({t, w:R(10, 20), h:R(14, 30), c:['#5b6aa8','#8a5a6b','#c9c2b0','#4f7d78','#7a6aa8'][Math.floor(rnd() * 5)]});
      world.lines.push(ln);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 16;
      world.anchors.push({x:mx, y:my, kind:'ring', b:null, base:Math.min(last.top, nb.top), line:ln});
    }
    world.genX = nb.x + nb.w;
  }
}
function buildingAt(x) { for (const b of world.buildings) if (x >= b.x && x <= b.x + b.w) return b; return null; }
function roofClear(ax) {
  const b = buildingAt(ax); if (b) return b.top;
  let t = 0; for (const bb of world.buildings) if (Math.abs((bb.x + bb.w / 2) - ax) < bb.w / 2 + 260) t = Math.min(t, bb.top);
  return t;
}

// ---------- Player ----------
const G = 1650, RUN = 250, SLIP = 1.1, HOP = 430, PUMP = 280, MAXV = 1350, FEET = 18, PR = 9, LEDGE = 20;
let P, cam = {x:0, y:0}, state = 'menu', run = null, input = {held:false, n:0}, parts = [], floats = [], shake = 0, time = 0;
let rain = [];
for (let i = 0; i < 150; i++) rain.push({x:Math.random(), y:Math.random(), v:R(0.9, 1.4), l:R(10, 22), z:R(0.4, 1)});

function newRun() {
  newWorld((Date.now() & 0xffff) + 1);
  P = {x:-120, y:-60 - FEET, vx:RUN, vy:0, grounded:true, onB:world.buildings[0], rope:null, sq:0, phase:0, rot:0, dir:1, flap:0, airT:0};
  run = {t:0, night:120, letters:0, stamps:0, newLetters:[], startX:P.x, maxX:P.x, swings:0, landed:0, ended:false, reason:'', endT:0, target:null, hintDone:save.runs > 0};
  parts = []; floats = [];
  cam.x = P.x - VW * 0.3; cam.y = BOTTOM_Y - VH;
}

function findAnchor() {
  let best = null, bs = 1e9;
  for (const a of world.anchors) {
    const dx = a.x - P.x, dy = a.y - P.y;
    if (dy > -40 || dx < -30 || dx > 360) continue;
    const d = Math.hypot(dx, dy); if (d > 340) continue;
    const s = d - dx * 0.55 + (dx < 0 ? 140 : 0);
    if (s < bs) { bs = s; best = a; }
  }
  return best;
}
function attach(a) {
  const d = Math.hypot(P.x - a.x, P.y - a.y);
  const maxL = Math.max(70, roofClear(a.x) - a.y - 42);
  P.rope = {x:a.x, y:a.y, L:d, tL:clamp(Math.min(d, maxL), 60, 330), a};
  P.grounded = false; P.onB = null;
  run.swings++; Snd.rope(); vibrate(8);
  for (let i = 0; i < 5; i++) parts.push({x:a.x, y:a.y, vx:R(-80, 80), vy:R(-80, 40), life:0.3, max:0.3, c:'#ffe2b0', s:2});
}
function release() {
  const p = P; p.rope = null;
  if (p.vx > 0) p.vx *= 1.06; p.vy -= 50;
  // slight aim assist: nudge horizontal speed so the arc reaches a roof if it is close
  if (!predictLand(p.x, p.y, p.vx, p.vy)) {
    for (const f of [1.04, 0.96, 1.08, 0.92, 1.13, 0.88]) { if (predictLand(p.x, p.y, p.vx * f, p.vy)) { p.vx *= f; break; } }
  }
  Snd.release();
  if (!run.hintDone && run.swings >= 2) { run.hintDone = true; $('hint').classList.add('hidden'); }
}
function predictLand(x, y, vx, vy) {
  const dt = 1 / 60;
  for (let i = 0; i < 150; i++) {
    vy += G * dt; const nx = x + vx * dt, ny = y + vy * dt;
    for (const b of world.buildings) {
      if (b.x > nx + 40 || b.x + b.w < nx - 40) continue;
      if (vy >= 0 && nx >= b.x - LEDGE && nx <= b.x + b.w && y + FEET <= b.top + 2 && ny + FEET >= b.top) return b;
      if (ny + FEET > b.top + 6 && nx + PR > b.x && nx - PR < b.x + b.w) return null;
    }
    x = nx; y = ny; if (y > DEATH_Y) return null;
  }
  return null;
}

function land(b, impact) {
  const p = P; p.grounded = true; p.onB = b; p.rope = null; p.y = b.top - FEET;
  if (p.x < b.x + 2) p.x = b.x + 2;
  const h = clamp(impact / 1100, 0, 1);
  p.vx = Math.max(p.vx * 0.92, 60); p.vy = 0; p.sq = 0.18 + h * 0.25;
  run.landed++; if (p.airT > 0.25) { Snd.land(h); vibrate(Math.round(12 + h * 28)); if (h > 0.6) shake = 6 * h; }
  for (let i = 0; i < 10 + h * 12; i++) parts.push({x:p.x + R(-10, 10), y:b.top, vx:R(-140, 140) + p.vx * 0.3, vy:R(-220, -40), life:R(0.25, 0.5), max:0.5, c:'rgba(180,200,255,0.8)', s:R(1.5, 3)});
}

function step(dt) {
  const p = P; const px = p.x, py = p.y;
  if (!run.ended) {
    if (input.held && !p.rope) { const a = findAnchor(); if (a) attach(a); else if (input.fresh) Snd.miss(); }
    input.fresh = false;
    if (!input.held && p.rope) release();
  }
  if (p.rope) {
    const r = p.rope;
    if (r.L > r.tL) r.L = Math.max(r.tL, r.L - 1000 * dt);
    p.vy += G * dt;
    const dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy) || 1;
    let tx = -dy / d, ty = dx / d; if (tx < 0) { tx = -tx; ty = -ty; }
    const vt = p.vx * tx + p.vy * ty;
    if (dy > 0 && vt > 0) { p.vx += tx * PUMP * dt; p.vy += ty * PUMP * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const dx2 = p.x - r.x, dy2 = p.y - r.y, d2 = Math.hypot(dx2, dy2);
    if (d2 > r.L) { const nx = dx2 / d2, ny = dy2 / d2; p.x = r.x + nx * r.L; p.y = r.y + ny * r.L; const vr = p.vx * nx + p.vy * ny; if (vr > 0) { p.vx -= nx * vr; p.vy -= ny * vr; } }
    p.airT += dt;
  } else if (p.grounded) {
    const b = p.onB;
    p.vx += (RUN - p.vx) * (1 - Math.exp(-SLIP * dt));
    p.x += p.vx * dt; p.y = b.top - FEET; p.phase += p.vx * dt * 0.06; p.airT = 0;
    if (p.x > b.x + b.w + 3) { p.grounded = false; p.onB = null; p.vy = -HOP; }
  } else {
    p.vy += G * dt; p.vx *= (1 - 0.04 * dt);
    p.x += p.vx * dt; p.y += p.vy * dt; p.airT += dt;
  }
  const sp = Math.hypot(p.vx, p.vy); if (sp > MAXV) { p.vx *= MAXV / sp; p.vy *= MAXV / sp; }
  // collisions
  if (!p.grounded) {
    for (const b of world.buildings) {
      if (b.x > p.x + 60 || b.x + b.w < p.x - 60) continue;
      const feet = p.y + FEET, pfeet = py + FEET;
      if (p.vy >= 0 && p.x >= b.x - LEDGE && p.x <= b.x + b.w + 2 && pfeet <= b.top + 3 && feet >= b.top) {
        if (p.rope) { p.y = b.top - FEET; p.vy = 0; }
        else { land(b, p.vy); break; }
      } else if (feet > b.top + 6) {
        if (px + PR <= b.x + 1 && p.x + PR > b.x) { p.x = b.x - PR; p.vx = -Math.abs(p.vx) * 0.25; if (p.rope) p.rope = null; bump(); }
        else if (px - PR >= b.x + b.w - 1 && p.x - PR < b.x + b.w) { p.x = b.x + b.w + PR; p.vx = Math.abs(p.vx) * 0.25; bump(); }
      }
    }
  }
  p.rot = p.rope ? 0 : (p.grounded ? 0 : clamp(p.vx * 0.0003 + p.vy * 0.0004, -0.6, 0.6));
  if (p.rope) p.rot = Math.atan2(-(p.x - p.rope.x), (p.y - p.rope.y));
  p.sq *= Math.exp(-10 * dt);
  if (Math.abs(p.vx) > 20) p.dir = p.vx > 0 ? 1 : -1;
  // pickups
  for (const s of world.stamps) if (!s.got && Math.abs(s.x - p.x) < 28 && Math.abs(s.y - p.y) < 30) {
    s.got = true; run.stamps++; Snd.stamp(); floats.push({x:s.x, y:s.y - 10, t:0, txt:'+1'});
    for (let i = 0; i < 6; i++) parts.push({x:s.x, y:s.y, vx:R(-90, 90), vy:R(-90, 90), life:0.35, max:0.35, c:'#ffd98a', s:2});
  }
  for (const m of world.mailboxes) if (!m.done && Math.abs(m.x - p.x) < 34 && p.y > m.y - 70 && p.y < m.y + 10) deliver(m);
  run.maxX = Math.max(run.maxX, p.x);
  if (!run.ended && p.y > DEATH_Y) endRun('fall');
}
function bump() { Snd.noise(0.1, 'lowpass', 500, 0.25); vibrate(15); }

function deliver(m) {
  m.done = true; run.letters++; save.deliveries++;
  const locked = LETTERS.filter(l => !save.letters.includes(l.id));
  let gain = 5, txt = 'Mektup teslim edildi! +5 pul';
  if (locked.length && [1, 4, 8].includes(run.letters)) {
    const L = locked[0]; save.letters.push(L.id); run.newLetters.push(L.id);
    txt = 'Yeni mektup açıldı! +5 pul';
  } else if (!locked.length) { gain = 8; txt = 'Mektup teslim edildi! +8 pul'; }
  run.stamps += gain; persist();
  Snd.deliver(); vibrate(30); toast(txt);
  floats.push({x:m.x, y:m.y - 50, t:0, txt:'+' + gain, big:true});
  for (let i = 0; i < 26; i++) { const a = R(0, 6.28), v = R(80, 260); parts.push({x:m.x, y:m.y - 24, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 80, life:R(0.5, 0.9), max:0.9, c:i % 2 ? '#ffb04a' : '#fff1c9', s:R(2, 3.5)}); }
}

function endRun(reason) {
  if (run.ended) return; run.ended = true; run.reason = reason; run.endT = 0;
  if (reason === 'fall') { Snd.fall(); vibrate(60); } else Snd.dawn();
  input.held = false;
  setTimeout(showOver, reason === 'fall' ? 700 : 900);
}
function dist() { return Math.max(0, Math.floor((run.maxX - run.startX) / 20)); }

// ---------- Update ----------
function update(dt) {
  time += dt;
  if (state === 'play') {
    run.t += dt;
    if (!run.ended) { run.night -= dt; if (run.night <= 0) { run.night = 0; endRun('dawn'); } }
    const sub = 4; for (let i = 0; i < sub; i++) step(dt / sub);
    ensureGen(P.x + 2400);
    // trim old
    const cut = P.x - 1400;
    if (world.buildings.length > 40) world.buildings = world.buildings.filter(b => b.x + b.w > cut);
    world.anchors = world.anchors.filter(a => a.x > cut); world.stamps = world.stamps.filter(s => s.x > cut);
    world.mailboxes = world.mailboxes.filter(m => m.x > cut); world.lines = world.lines.filter(l => l.x2 > cut);
    run.target = P.rope ? null : findAnchor();
    // camera
    const lookX = P.x - VW * 0.3 + clamp(P.vx * 0.16, -40, 110);
    cam.x += (lookX - cam.x) * (1 - Math.exp(-5 * dt));
    const ty = Math.min(BOTTOM_Y - VH, P.y - VH * 0.3);
    if (!(run.ended && run.reason === 'fall')) cam.y += (ty - cam.y) * (1 - Math.exp(-4 * dt));
    updateHUD();
  } else if (state === 'menu') {
    cam.x += 40 * dt; cam.y = BOTTOM_Y - VH; ensureGen(cam.x + VW + 1200);
    if (world.buildings.length > 40) world.buildings = world.buildings.filter(b => b.x + b.w > cam.x - 600);
  }
  for (const q of parts) { q.vy += 500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
  parts = parts.filter(q => q.life > 0);
  for (const f of floats) f.t += dt; floats = floats.filter(f => f.t < 1);
  shake *= Math.exp(-8 * dt);
}
let lastHud = '';
function updateHUD() {
  const s = dist() + ' m|' + run.letters + '|' + run.stamps + '|' + Math.ceil(run.night);
  if (s === lastHud) return; lastHud = s;
  $('hudDist').textContent = dist() + ' m'; $('hudLetters').textContent = run.letters; $('hudStamps').textContent = run.stamps;
  const n = Math.ceil(run.night); $('dawnTime').textContent = Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  $('dawnFill').style.width = ((1 - run.night / 120) * 100).toFixed(1) + '%';
}

// ---------- Render ----------
function dawnT() { return state === 'play' || state === 'pause' || state === 'over' ? clamp((30 - run.night) / 30, 0, 1) : 0; }
function render() {
  const dt0 = dawnT();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mixColor('#080b26', '#3b3f86', dt0)); g.addColorStop(0.55, mixColor('#1b2063', '#a1668f', dt0)); g.addColorStop(1, mixColor('#2b2f72', '#f0a070', dt0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // stars
  for (const s of stars) { ctx.globalAlpha = (0.5 + 0.5 * Math.sin(time * 2 + s.p)) * (1 - dt0) * 0.9; ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H, s.r, s.r); }
  ctx.globalAlpha = 1;
  // moon
  const mx = W * 0.72, my = H * (0.15 + dt0 * 0.1), mr = Math.min(W, H) * 0.11;
  const mg = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2);
  mg.addColorStop(0, `rgba(255,214,140,${0.35 * (1 - dt0)})`); mg.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = mg; ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
  ctx.globalAlpha = 1 - dt0 * 0.7; ctx.fillStyle = '#f7d891'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(200,160,90,0.35)';
  [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.35, 0.12], [0.35, -0.35, 0.09]].forEach(c => { ctx.beginPath(); ctx.arc(mx + c[0] * mr, my + c[1] * mr, c[2] * mr, 0, 6.283); ctx.fill(); });
  ctx.globalAlpha = 1;
  // clouds
  for (const c of clouds) {
    const cx = ((c.x + time * c.v) % 1.6 - 0.3) * W, cy = c.y * H;
    ctx.fillStyle = `rgba(${dt0 > 0 ? '120,100,150' : '60,66,130'},0.33)`;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(cx + k * 34 * c.s, cy + Math.sin(k * 1.7) * 8, 46 * c.s, 16 * c.s, 0, 0, 6.283); ctx.fill(); }
  }
  // far layers
  const camDy = (cam.y - (BOTTOM_Y - VH)) * SCALE;
  for (const L of far) {
    const off = ((cam.x * SCALE * L.f) % L.lw + L.lw) % L.lw;
    const y = H - L.lh - camDy * L.f * 0.6 + (1 - L.f) * 30;
    for (let x = -off; x < W; x += L.lw) ctx.drawImage(L.canvas, x, y, L.lw, L.lh);
    ctx.fillStyle = mixColor(L.f < 0.1 ? '#2a2f68' : L.f < 0.3 ? '#1d2152' : '#141739', '#3a2b4f', dt0 * 0.5); ctx.fillRect(0, y + L.lh - 1, W, H);
  }
  const haze = ctx.createLinearGradient(0, H * 0.4, 0, H); haze.addColorStop(0, 'rgba(40,46,110,0)'); haze.addColorStop(1, 'rgba(30,34,90,0.45)');
  ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
  // world
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  ctx.setTransform(DPR * SCALE, 0, 0, DPR * SCALE, (-cam.x * SCALE + sx) * DPR, (-cam.y * SCALE + sy) * DPR);
  drawWorld();
  if (P && state !== 'menu') drawPlayer(ctx, P, true);
  for (const q of parts) { ctx.globalAlpha = clamp(q.life / q.max, 0, 1); ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const f of floats) { ctx.globalAlpha = 1 - f.t; ctx.fillStyle = '#ffe2a8'; ctx.font = `700 ${f.big ? 26 : 18}px system-ui,sans-serif`; ctx.fillText(f.txt, f.x, f.y - f.t * 40); }
  ctx.globalAlpha = 1;
  // rain (screen space)
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.strokeStyle = 'rgba(175,195,255,0.32)'; ctx.lineWidth = 1; ctx.beginPath();
  for (const d of rain) {
    d.y += d.v * 0.016 * 1.6; if (d.y > 1.05) { d.y = -0.05; d.x = Math.random() * 1.2; }
    const x = ((d.x - (cam.x * SCALE * d.z * 0.0006)) % 1.2 + 1.2) % 1.2 * W - 0.1 * W, y = d.y * H;
    ctx.moveTo(x, y); ctx.lineTo(x - d.l * 0.25 * d.z, y + d.l * d.z);
  }
  ctx.stroke();
  if (state === 'play' && run && run.ended && run.reason === 'fall') { ctx.fillStyle = `rgba(5,6,20,${clamp(run.t - run.endT, 0, 0.4)})`; }
}

function drawWorld() {
  const x0 = cam.x - 80, x1 = cam.x + VW + 80, yb = cam.y + VH + 40;
  const dt0 = dawnT();
  // laundry lines (behind)
  for (const ln of world.lines) {
    if (ln.x2 < x0 || ln.x1 > x1) continue;
    ctx.strokeStyle = '#0b0d22'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ln.x1, ln.b1); ctx.lineTo(ln.x1, ln.y1); ctx.moveTo(ln.x2, ln.b2); ctx.lineTo(ln.x2, ln.y2); ctx.stroke();
    const mx = (ln.x1 + ln.x2) / 2, my = (ln.y1 + ln.y2) / 2 + 32;
    ctx.strokeStyle = 'rgba(200,205,240,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.quadraticCurveTo(mx, my, ln.x2, ln.y2); ctx.stroke();
    for (const c of ln.clothes) {
      const t = c.t, cx = (1 - t) * (1 - t) * ln.x1 + 2 * (1 - t) * t * mx + t * t * ln.x2, cy = (1 - t) * (1 - t) * ln.y1 + 2 * (1 - t) * t * my + t * t * ln.y2;
      if (Math.abs(t - 0.5) < 0.06) continue;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.sin(time * 2 + t * 9) * 0.12);
      ctx.fillStyle = c.c; ctx.globalAlpha = 0.85; ctx.fillRect(-c.w / 2, 0, c.w, c.h); ctx.globalAlpha = 1; ctx.restore();
    }
  }
  // buildings
  for (const b of world.buildings) {
    if (b.x + b.w < x0 || b.x > x1) continue;
    const fg = ctx.createLinearGradient(0, b.top, 0, b.top + 500);
    fg.addColorStop(0, mixColor('#232859', '#3a2f55', dt0 * 0.6)); fg.addColorStop(1, '#0e1030');
    ctx.fillStyle = fg; ctx.fillRect(b.x, b.top, b.w, yb - b.top);
    // side shading
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x + b.w - 10, b.top, 10, yb - b.top);
    // windows
    for (const w of b.wins) {
      if (w.y > yb) break;
      if (w.lit) {
        const fl = w.fl ? (0.7 + 0.3 * Math.sin(time * 9 + w.x)) : 1;
        ctx.fillStyle = `rgba(255,170,70,${0.12 * fl})`; ctx.fillRect(w.x - 6, w.y - 6, 26, 34);
        ctx.fillStyle = w.warm > 0.5 ? `rgba(255,206,122,${fl})` : `rgba(255,184,96,${fl})`; ctx.fillRect(w.x, w.y, 14, 22);
        ctx.fillStyle = 'rgba(60,30,10,0.5)'; ctx.fillRect(w.x + 6, w.y, 2, 22); ctx.fillRect(w.x, w.y + 10, 14, 2);
      } else { ctx.fillStyle = 'rgba(8,10,30,0.7)'; ctx.fillRect(w.x, w.y, 14, 22); }
    }
    // roof: tiled cap + gutter
    ctx.fillStyle = '#2f3570'; ctx.fillRect(b.x - 6, b.top - 4, b.w + 12, 8);
    ctx.fillStyle = 'rgba(190,205,255,0.55)'; ctx.fillRect(b.x - 6, b.top - 4, b.w + 12, 1.5);
    ctx.fillStyle = '#161a42'; for (let tx = b.x - 4; tx < b.x + b.w + 4; tx += 12) ctx.fillRect(tx, b.top + 4, 10, 5);
    // wet sheen
    ctx.fillStyle = 'rgba(160,180,255,0.12)'; ctx.fillRect(b.x, b.top + 9, b.w, 3);
    // chimneys
    for (const c of b.chims) {
      ctx.fillStyle = '#1a1e48'; ctx.fillRect(c.x, b.top - c.h, c.w, c.h);
      ctx.fillStyle = '#2b3168'; ctx.fillRect(c.x - 3, b.top - c.h - 5, c.w + 6, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(c.x + c.w * 0.6, b.top - c.h, c.w * 0.4, c.h);
      if (c.smoke) for (let k = 0; k < 4; k++) {
        const t = ((time * 0.35 + k * 0.25 + c.x * 0.001) % 1);
        ctx.fillStyle = `rgba(150,155,200,${0.18 * (1 - t)})`;
        ctx.beginPath(); ctx.arc(c.x + c.w / 2 + t * 30 + Math.sin(t * 6 + k) * 6, b.top - c.h - 8 - t * 70, 6 + t * 14, 0, 6.283); ctx.fill();
      }
    }
  }
  // anchors
  for (const a of world.anchors) {
    if (a.x < x0 || a.x > x1) continue;
    if (a.kind !== 'ring') {
      ctx.strokeStyle = '#0a0c20'; ctx.lineWidth = a.kind === 'pole' ? 5 : 3;
      ctx.beginPath(); ctx.moveTo(a.x, a.base); ctx.lineTo(a.x, a.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(170,185,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x - 1, a.base); ctx.lineTo(a.x - 1, a.y); ctx.stroke();
      if (a.kind === 'antenna') {
        ctx.strokeStyle = '#0a0c20'; ctx.lineWidth = 2.5; ctx.beginPath();
        ctx.moveTo(a.x - 22, a.y + 26); ctx.lineTo(a.x + 22, a.y + 26); ctx.moveTo(a.x - 15, a.y + 42); ctx.lineTo(a.x + 15, a.y + 42); ctx.moveTo(a.x - 9, a.y + 56); ctx.lineTo(a.x + 9, a.y + 56); ctx.stroke();
      } else {
        ctx.fillStyle = '#0a0c20'; ctx.fillRect(a.x - 12, a.y + 8, 24, 4);
        ctx.fillStyle = `rgba(255,90,70,${0.5 + 0.5 * Math.sin(time * 3 + a.x)})`; ctx.beginPath(); ctx.arc(a.x, a.y - 4, 2.5, 0, 6.283); ctx.fill();
      }
    }
    const isT = run && run.target === a && state === 'play';
    ctx.strokeStyle = isT ? '#ffd28a' : 'rgba(205,215,255,0.8)'; ctx.lineWidth = isT ? 3 : 2;
    ctx.beginPath(); ctx.arc(a.x, a.y, 6, 0, 6.283); ctx.stroke();
    if (isT) { const pr = 12 + Math.sin(time * 8) * 3; ctx.strokeStyle = 'rgba(255,200,120,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, pr, 0, 6.283); ctx.stroke(); }
  }
  // mailboxes
  for (const m of world.mailboxes) {
    if (m.x < x0 || m.x > x1) continue;
    const y = m.y;
    ctx.fillStyle = '#0a0c20'; ctx.fillRect(m.x - 2, y - 22, 4, 22);
    ctx.fillStyle = m.done ? '#3a3f70' : '#26306a'; ctx.beginPath(); ctx.moveTo(m.x - 14, y - 22); ctx.lineTo(m.x + 14, y - 22); ctx.lineTo(m.x + 14, y - 40); ctx.arc(m.x, y - 40, 14, 0, Math.PI, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = m.done ? '#6d7bd0' : '#ffb04a'; ctx.fillRect(m.x + 14, y - 50, 3, 16); ctx.fillRect(m.x + 14, y - 50, 10, 6);
    if (!m.done) {
      const bob = Math.sin(time * 3 + m.x) * 4, ey = y - 78 + bob;
      const gl = ctx.createRadialGradient(m.x, ey, 2, m.x, ey, 34); gl.addColorStop(0, 'rgba(255,170,60,0.55)'); gl.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = gl; ctx.fillRect(m.x - 34, ey - 34, 68, 68);
      drawEnvelope(m.x, ey, 1);
    }
  }
  // stamps
  for (const s of world.stamps) {
    if (s.got || s.x < x0 || s.x > x1) continue;
    const bob = Math.sin(time * 4 + s.ph) * 3;
    ctx.save(); ctx.translate(s.x, s.y + bob); ctx.rotate(Math.sin(time * 2 + s.ph) * 0.2);
    ctx.fillStyle = 'rgba(255,217,138,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ffd98a'; ctx.fillRect(-7, -9, 14, 18); ctx.fillStyle = '#b5532a'; ctx.fillRect(-4, -6, 8, 9);
    ctx.restore();
  }
  // trajectory hint while swinging
  if (state === 'play' && P && P.rope && !run.ended) {
    let x = P.x, y = P.y, vx = P.vx > 0 ? P.vx * 1.06 : P.vx, vy = P.vy - 50; const dt = 1 / 30;
    for (let i = 0; i < 16; i++) { vy += G * dt; x += vx * dt; y += vy * dt; if (i % 2) { ctx.fillStyle = `rgba(210,220,255,${0.4 * (1 - i / 16)})`; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.283); ctx.fill(); } }
  }
}
function drawEnvelope(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#ffb04a'; ctx.fillRect(-13, -9, 26, 18);
  ctx.strokeStyle = '#8a3f0c'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-13, -9); ctx.lineTo(0, 2); ctx.lineTo(13, -9); ctx.stroke();
  ctx.restore();
}
function drawPlayer(c, p, inWorld) {
  const cape = shopItem(save.cape).color, ropeC = shopItem(save.rope).color;
  if (inWorld && p.rope) {
    c.strokeStyle = ropeC; c.lineWidth = 2.2; c.beginPath(); c.moveTo(p.x, p.y - 8); c.lineTo(p.rope.x, p.rope.y); c.stroke();
  }
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot); if (inWorld) c.scale(1.25, 1.25);
  const sq = p.sq || 0; c.scale((1 + sq) * p.dir, 1 - sq); c.translate(0, sq * 18);
  // satchel glow
  const gl = c.createRadialGradient(5, 4, 1, 5, 4, 26); gl.addColorStop(0, 'rgba(255,160,50,0.55)'); gl.addColorStop(1, 'rgba(255,160,50,0)');
  c.fillStyle = gl; c.fillRect(-22, -20, 54, 50);
  // cape
  const sp = Math.min(1, Math.hypot(p.vx, p.vy) / 900); const fl = Math.sin(time * 14) * 3 * (0.3 + sp);
  c.fillStyle = cape; c.beginPath(); c.moveTo(-3, -14); c.quadraticCurveTo(-14 - sp * 10, -2 + fl, -16 - sp * 14, 12 + fl); c.lineTo(-4, 9); c.closePath(); c.fill();
  // legs
  const ph = p.grounded ? Math.sin(p.phase) : (p.rope ? 0.35 : -0.4);
  c.strokeStyle = '#090b1d'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath();
  c.moveTo(-2, 8); c.lineTo(-2 - ph * 6, FEET - 1); c.moveTo(3, 8); c.lineTo(3 + ph * 6, FEET - 1); c.stroke();
  // body
  c.fillStyle = '#0c0e24'; c.beginPath(); c.moveTo(-7, -12); c.lineTo(7, -12); c.lineTo(8, 10); c.lineTo(-7, 10); c.closePath(); c.fill();
  // arm (up to rope, or forward)
  c.beginPath(); c.lineWidth = 3.5; c.moveTo(2, -9); if (p.rope) c.lineTo(0, -16); else c.lineTo(9, -2 + (p.grounded ? Math.cos(p.phase) * 2 : -3)); c.stroke();
  // hood
  c.fillStyle = '#0c0e24'; c.beginPath(); c.arc(1, -18, 7.5, 0, 6.283); c.fill();
  c.beginPath(); c.moveTo(-5, -23); c.lineTo(-13, -17); c.lineTo(-4, -13); c.closePath(); c.fill();
  c.fillStyle = cape; c.globalAlpha = 0.6; c.beginPath(); c.arc(1, -18, 7.5, Math.PI * 0.9, Math.PI * 1.6); c.lineTo(1, -18); c.fill(); c.globalAlpha = 1;
  c.fillStyle = 'rgba(255,220,170,0.85)'; c.fillRect(5, -19, 2, 1.6);
  // satchel
  c.strokeStyle = '#5a2a08'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-5, -11); c.lineTo(7, 1); c.stroke();
  c.fillStyle = '#ff9b3d'; c.fillRect(2, 0, 12, 9); c.fillStyle = '#ffd08a'; c.fillRect(2, 0, 12, 3);
  c.restore();
}

// ---------- Loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state !== 'pause' && state !== 'over') update(dt); else time += dt * 0.3;
  render();
  requestAnimationFrame(frame);
}

// ---------- Input ----------
function down(e) {
  Snd.init();
  if (state !== 'play') return;
  if (e.target.closest && e.target.closest('button')) return;
  e.preventDefault(); input.n++; input.held = true; input.fresh = true;
}
function up(e) {
  if (state !== 'play') { input.n = 0; input.held = false; return; }
  input.n = Math.max(0, input.n - 1); if (input.n === 0) input.held = false;
}
window.addEventListener('pointerdown', down, {passive:false});
window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
window.addEventListener('blur', () => { input.n = 0; input.held = false; if (state === 'play') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'play') pause();
  try { if (Snd.ctx) { if (document.hidden) Snd.ctx.suspend(); else Snd.ctx.resume(); } } catch (e) {}
});
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp') { Snd.init(); if (state === 'play') { input.held = true; input.n = 1; } }
  if (e.code === 'Escape' || e.code === 'KeyP') onBack();
});
window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp') { input.held = false; input.n = 0; } });

// ---------- UI ----------
const screens = ['menu', 'letters', 'shop', 'pause', 'over'];
function show(id) { for (const s of screens) $(s).classList.toggle('hidden', s !== id); $('hud').classList.toggle('hidden', !(id === null || id === 'pause')); }
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }
function refreshMenu() {
  $('menuBest').textContent = save.best + ' m'; $('menuStamps').textContent = save.stamps;
  $('menuLetterCount').textContent = save.letters.length + '/' + LETTERS.length; refreshMute();
}
function refreshMute() {
  $('btnMute').innerHTML = save.muted
    ? '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="#eef0ff" stroke-width="2"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="#eef0ff" stroke-width="2"/></svg>';
  $('btnMute2').textContent = 'Ses: ' + (save.muted ? 'Kapalı' : 'Açık');
}
function goMenu() { state = 'menu'; if (!world || !P) newWorld(42); P = null; show('menu'); refreshMenu(); }
function startGame() {
  newRun(); state = 'play'; show(null); lastHud = ''; updateHUD();
  $('hint').classList.toggle('hidden', run.hintDone);
}
function pause() { if (state !== 'play' || run.ended) return; state = 'pause'; input.held = false; input.n = 0; show('pause'); }
function resume() { if (state !== 'pause') return; state = 'play'; show(null); last = performance.now(); }
function showOver() {
  state = 'over'; save.runs++;
  const d = dist(); const rec = d > save.best; if (rec) save.best = d; save.stamps += run.stamps; persist();
  $('overTitle').textContent = run.reason === 'dawn' ? 'Şafak söktü!' : 'Düştün!';
  $('overSub').textContent = run.reason === 'dawn' ? 'Gece bitti, çanta hafifledi. Yarın gece yine çatılardayız.' : 'Kiremitler kaygandı. Bir tur daha?';
  $('overDist').textContent = d + ' m'; $('overLetters').textContent = run.letters; $('overStamps').textContent = '+' + run.stamps;
  $('overBest').textContent = rec && d > 0 ? 'Yeni rekor!' : 'En iyi: ' + save.best + ' m';
  const nl = $('overNew'); nl.innerHTML = '';
  if (run.newLetters.length) {
    const lb = document.createElement('div'); lb.className = 'lbl'; lb.textContent = 'Yeni açılan mektuplar:'; nl.appendChild(lb);
    for (const id of run.newLetters) { const L = LETTERS.find(l => l.id === id); const b = document.createElement('button'); b.innerHTML = `<span>✉ ${L.title}</span><span>Oku ›</span>`; b.onclick = () => openLetter(id); nl.appendChild(b); }
  }
  show('over'); $('hint').classList.add('hidden');
  if (run.newLetters.length) setTimeout(() => { if (state === 'over') openLetter(run.newLetters[0]); }, 500);
}
function openLetter(id) {
  const L = LETTERS.find(l => l.id === id); if (!L) return;
  $('lmTitle').textContent = L.title; $('lmBody').textContent = L.body; $('letterModal').classList.remove('hidden'); Snd.click();
}
function renderLetters() {
  $('lettersCount').textContent = save.letters.length + '/' + LETTERS.length;
  const g = $('letterGrid'); g.innerHTML = '';
  LETTERS.forEach((L, i) => {
    const open = save.letters.includes(L.id); const b = document.createElement('button');
    b.className = 'lcard' + (open ? '' : ' locked');
    b.innerHTML = open ? `<span class="num">#${i + 1}</span><b>${L.title}</b><span>${L.body.slice(0, 42)}…</span>` : `<span class="num">#${i + 1}</span><b>Mühürlü mektup</b><span>Bir posta kutusuna ulaştır</span>`;
    if (open) b.onclick = () => openLetter(L.id);
    g.appendChild(b);
  });
}
let prevCv = null;
function renderShop() {
  $('shopStamps').textContent = save.stamps;
  for (const type of ['cape', 'rope']) {
    const box = $(type === 'cape' ? 'shopCapes' : 'shopRopes'); box.innerHTML = '';
    for (const it of SHOP.filter(s => s.type === type)) {
      const owned = save.owned.includes(it.id), on = save[type] === it.id;
      const row = document.createElement('div'); row.className = 'item';
      row.innerHTML = `<div class="sw ${type === 'rope' ? 'rope' : ''}" style="background:${it.color}"></div><div class="nm">${it.name}</div>`;
      const b = document.createElement('button'); b.dataset.item = it.id;
      if (on) { b.textContent = 'Seçili'; b.className = 'on'; }
      else if (owned) { b.textContent = 'Kullan'; b.onclick = () => { save[type] = it.id; persist(); Snd.click(); renderShop(); }; }
      else { b.textContent = it.price + ' pul'; b.className = 'buy'; b.disabled = save.stamps < it.price;
        b.onclick = () => { if (save.stamps < it.price) return; save.stamps -= it.price; save.owned.push(it.id); save[type] = it.id; persist(); Snd.buy(); toast(it.name + ' alındı!'); renderShop(); }; }
      row.appendChild(b); box.appendChild(row);
    }
  }
  // preview
  if (!prevCv) { prevCv = document.createElement('canvas'); $('shopPreview').appendChild(prevCv); }
  const d = 2; prevCv.width = 150 * d; prevCv.height = 150 * d; const c = prevCv.getContext('2d'); c.setTransform(d * 2.6, 0, 0, d * 2.6, 75 * d, 82 * d);
  c.strokeStyle = shopItem(save.rope).color; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -8); c.lineTo(-14, -30); c.stroke();
  drawPlayer(c, {x:0, y:0, vx:300, vy:0, rot:0.25, dir:1, sq:0, rope:{x:-14, y:-30}, grounded:false, phase:0}, false);
}
$('btnStart').onclick = () => { Snd.init(); Snd.click(); startGame(); };
$('btnLetters').onclick = () => { Snd.init(); Snd.click(); renderLetters(); show('letters'); };
$('btnShop').onclick = () => { Snd.init(); Snd.click(); renderShop(); show('shop'); };
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { Snd.click(); goMenu(); });
$('btnPause').onclick = e => { e.stopPropagation(); Snd.click(); pause(); };
$('btnResume').onclick = () => { Snd.click(); resume(); };
$('btnQuit').onclick = () => { Snd.click(); goMenu(); };
$('btnRetry').onclick = () => { Snd.click(); startGame(); };
$('btnHome').onclick = () => { Snd.click(); goMenu(); };
$('btnMute').onclick = () => { Snd.init(); Snd.setMuted(!save.muted); refreshMute(); Snd.click(); };
$('btnMute2').onclick = () => { Snd.init(); Snd.setMuted(!save.muted); refreshMute(); Snd.click(); };
$('lmClose').onclick = () => { $('letterModal').classList.add('hidden'); Snd.click(); };

// Android back button: returns true if handled (otherwise app may exit)
function onBack() {
  if (!$('letterModal').classList.contains('hidden')) { $('letterModal').classList.add('hidden'); return true; }
  if (state === 'play') { pause(); return true; }
  if (state === 'pause') { resume(); return true; }
  if (state === 'over') { goMenu(); return true; }
  if (!$('letters').classList.contains('hidden') || !$('shop').classList.contains('hidden')) { goMenu(); return true; }
  return false;
}
window.onAndroidBack = () => onBack();
window.onAndroidPause = () => { input.held = false; input.n = 0; if (state === 'play') pause(); };

// ---------- Test hooks (read-only state + helpers only with ?test=1) ----------
window.__gp = {
  version: VERSION,
  get state() { return state; },
  get save() { return JSON.parse(JSON.stringify(save)); },
  get player() { return P && {x:P.x, y:P.y, vx:P.vx, vy:P.vy, grounded:P.grounded, roped:!!P.rope}; },
  get run() { return run && {dist:dist(), letters:run.letters, stamps:run.stamps, swings:run.swings, landed:run.landed, ended:run.ended, reason:run.reason, night:run.night}; },
};
if (TEST) Object.assign(window.__gp, {
  nextMailbox() { return world.mailboxes.find(m => !m.done && m.x > P.x) || null; },
  placeBefore(m) { const b = m.b; P.x = Math.max(b.x + 4, m.x - 90); P.y = b.top - FEET; P.vx = RUN; P.vy = 0; P.grounded = true; P.onB = b; P.rope = null; cam.x = P.x - VW * 0.3; },
  setNight(s) { run.night = s; },
  giveStamps(n) { save.stamps += n; persist(); },
  resetSave() { save = defaultSave(); persist(); refreshMenu(); },
});

// ---------- Boot ----------
resize(); newWorld(42); goMenu(); requestAnimationFrame(frame);
})();
