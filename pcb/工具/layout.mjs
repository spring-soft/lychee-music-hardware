#!/usr/bin/env node
/**
 * 布局求解器（本地跑，不经过 EDA）
 *
 * 数据源：数据/fresh.json（EDA 实时导出：元件中心 + 每个焊盘的真实坐标/尺寸）
 * 把「焊盘相对元件中心的偏移」当作刚体，于是可以把元件摆到任意位置算出精确碰撞。
 *
 * 用法：
 *   node layout.mjs check  <placement.json>     检查给定布局
 *   node layout.mjs suggest <placement.json>    对违规元件找空位
 *
 * placement.json 格式：{ "U1": [540,1560], "C11": [960,1150], ... }
 * 缺省元件沿用 fresh.json 里的当前位置。
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);
const D = JSON.parse(fs.readFileSync(HERE('./数据/fresh.json'), 'utf8'));

export const BOARD = { l: 0, r: 2283, b: 0, t: 2166 };   // 由命令行覆盖

const MIN_PAD_GAP = 6;     // mil
const MIN_EDGE    = 12;    // mil

// 本体盒子（mil）。两种写法：
//   {x, y}          —— 相对【焊盘包围盒】外扩（小元件用）
//   {L,R,B,T}       —— 相对【元件原点】的绝对盒（大件用）
// 关键：模组本体远大于焊盘盒（18×25.5mm），且原点不在几何中心，必须显式给。
const BODY_ABS = {
  // ESP32-S3-WROOM-1：焊盘两列 x ±344.5、GND 排就在本体下边缘，
  // 本体 18×25.5mm = ±354.5 × (−368 ~ +636)。渲染图已核对。
  U1: { L: -354.5, R: 354.5, B: -368, T: 636 },
  // 6×6×5 直插按键：本体 236mil 见方（焊盘 ⌀78.7、跨距 200 → 焊盘伸出本体）
  SW1: { L: -118, R: 118, B: -118, T: 118 }, SW2: { L: -118, R: 118, B: -118, T: 118 },
  SW3: { L: -118, R: 118, B: -118, T: 118 }, SW4: { L: -118, R: 118, B: -118, T: 118 },
  SW7: { L: -118, R: 118, B: -118, T: 118 },
  // 3×4 贴片按键 TS-1185：本体 4.0×2.9mm
  SW5: { L: -78.5, R: 78.5, B: -57, T: 57 }, SW6: { L: -78.5, R: 78.5, B: -57, T: 57 },
};
const BODY = {
  CARD1: { x: 25,  y: 25  },   // TF-01A
  J1:    { x: 20,  y: 20  },   // TYPE-C（口面故意出界）
  J2:    { x: 20,  y: 20  },   // PJ-320A
  J3:    { x: 15,  y: 15  },   // FPC 14P
  J4:    { x: 15,  y: 15  },   // SP088 电池座
  EC1:   { x: 0,   y: 0   },   // 焊盘已伸出本体轮廓
  L1:    { x: 20,  y: 20  },
  C15:   { x: 15,  y: 15  }, C16: { x: 15, y: 15 },
  U2:    { x: 10,  y: 10  }, U4: { x: 10, y: 10 },
  SW5:   { x: 20,  y: 20  }, SW6: { x: 20, y: 20 },
};
const DEFAULT_BODY = { x: 4, y: 4 };

const rot90 = r => Math.abs(Math.round(r) % 180) === 90;

// ── 建模：每个元件的焊盘 [相对中心的 dx,dy,宽,高,层] ──
export const MODEL = new Map();
for (const c of D.comps) {
  const pads = [];
  for (const p of c.pins) {
    const sh = p.pad || [];
    let w = 32, h = 32;
    if (sh[0] === 'RECT' || sh[0] === 'OVAL' || sh[0] === 'ELLIPSE') { w = sh[1]; h = sh[2]; }
    else if (sh[0] === 'POLYGON' && Array.isArray(sh[1])) {
      // 两种格式：[[x,y],…]（点对）与 [x,y,'L',x2,y2,…]（扁平点列，J1 的外壳焊盘用这种）
      const arr = sh[1], xs = [], ys = [];
      if (Array.isArray(arr[0])) for (const q of arr) { xs.push(q[0]); ys.push(q[1]); }
      else for (let i = 0; i + 1 < arr.length; i += 2)
        if (typeof arr[i] === 'number' && typeof arr[i + 1] === 'number') { xs.push(arr[i]); ys.push(arr[i + 1]); }
      if (xs.length) { w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys); }
    }
    if (rot90(p.rotation ?? 0)) { const t = w; w = h; h = t; }
    const layers = (p.padType === 'THROUGH' || p.hole) ? [1, 2] : [p.l];
    pads.push({ n: p.n, dx: p.x - c.x, dy: p.y - c.y, w, h, layers, net: p.net });
  }
  if (!pads.length) continue;
  const xs = pads.map(p => p.dx), ys = pads.map(p => p.dy);
  const raw = { l: Math.min(...xs) - Math.max(...pads.map(p => p.w)) / 2,
                r: Math.max(...xs) + Math.max(...pads.map(p => p.w)) / 2,
                b: Math.min(...ys) - Math.max(...pads.map(p => p.h)) / 2,
                t: Math.max(...ys) + Math.max(...pads.map(p => p.h)) / 2 };
  const raw2 = { l: 1e9, r: -1e9, b: 1e9, t: -1e9 };
  for (const p of pads) {
    raw2.l = Math.min(raw2.l, p.dx - p.w / 2); raw2.r = Math.max(raw2.r, p.dx + p.w / 2);
    raw2.b = Math.min(raw2.b, p.dy - p.h / 2); raw2.t = Math.max(raw2.t, p.dy + p.h / 2);
  }
  const e = BODY[c.d] || DEFAULT_BODY;
  const abs = BODY_ABS[c.d];
  const body = abs ? { l: abs.L, r: abs.R, b: abs.B, t: abs.T }
                   : { l: raw2.l - e.x, r: raw2.r + e.x, b: raw2.b - e.y, t: raw2.t + e.y };
  MODEL.set(c.d, {
    d: c.d, l: c.l, rot: c.rot, x0: +c.x.toFixed(1), y0: +c.y.toFixed(1), pads,
    padBox: raw2, body,
  });
}

export function place(P) {
  const out = [];
  for (const [d, m] of MODEL) {
    const [x, y] = P[d] ?? [m.x0, m.y0];
    const pads = m.pads.map(p => {
      const l = x + p.dx - p.w / 2, r = x + p.dx + p.w / 2;
      const b = y + p.dy - p.h / 2, t = y + p.dy + p.h / 2;
      return { ...p, x: x + p.dx, y: y + p.dy, l, r, b, t };
    });
    out.push({ d, l: m.l, x, y, pads,
      body: { l: x + m.body.l, r: x + m.body.r, b: y + m.body.b, t: y + m.body.t } });
  }
  return out;
}

const ov = (a, b) => a.l < b.r && b.l < a.r && a.b < b.t && b.b < a.t;
const sameSide = (a, b) => a === b;

export function check(P, board = BOARD) {
  const cs = place(P);
  const padHit = [], bodyHit = [], edge = [];

  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
    const A = cs[i], B = cs[j];
    // 本体重叠（只报同面；正反两面互不干涉）
    if (sameSide(A.l, B.l) && ov(A.body, B.body)) {
      const w = Math.min(A.body.r, B.body.r) - Math.max(A.body.l, B.body.l);
      const h = Math.min(A.body.t, B.body.t) - Math.max(A.body.b, B.body.b);
      bodyHit.push({ a: A.d, b: B.d, w: Math.round(w), h: Math.round(h), 面积: Math.round(w * h) });
    }
    // 焊盘过近（同层）
    for (const pa of A.pads) for (const pb of B.pads) {
      if (!pa.layers.some(L => pb.layers.includes(L))) continue;
      const gx = Math.max(pa.l - pb.r, pb.l - pa.r), gy = Math.max(pa.b - pb.t, pb.b - pa.t);
      const gap = (gx >= 0 && gy >= 0) ? Math.hypot(gx, gy) : Math.max(gx, gy);
      if (gap < MIN_PAD_GAP) padHit.push({ a: A.d + '_' + pa.n, b: B.d + '_' + pb.n, gap: +gap.toFixed(1) });
    }
  }
  for (const c of cs) for (const p of c.pads) {
    const d = Math.min(p.l - board.l, board.r - p.r, p.b - board.b, board.t - p.t);
    if (d < MIN_EDGE) edge.push({ pad: c.d + '_' + p.n, 距: +d.toFixed(1),
      边: d === p.l - board.l ? '左' : d === board.r - p.r ? '右' : d === p.b - board.b ? '下' : '上' });
  }
  bodyHit.sort((a, b) => b.面积 - a.面积);
  padHit.sort((a, b) => a.gap - b.gap);
  edge.sort((a, b) => a.距 - b.距);
  return { cs, bodyHit, padHit, edge };
}

// ── 给某个元件找空位 ──
export function suggest(d, P, board = BOARD, opts = {}) {
  const m = MODEL.get(d);
  if (!m) return [];
  const step = opts.step || 10;
  const others = (opts.only || null);
  const hits = [];
  for (let x = board.l + 60; x <= board.r - 60; x += step) {
    for (let y = board.b + 60; y <= board.t - 60; y += step) {
      const trial = { ...P, [d]: [x, y] };
      const cs = place(trial);
      const self = cs.find(c => c.d === d);
      // 自身出界
      let bad = false;
      for (const p of self.pads) {
        const dd = Math.min(p.l - board.l, board.r - p.r, p.b - board.b, board.t - p.t);
        if (dd < MIN_EDGE) { bad = true; break; }
      }
      if (bad) continue;
      // 撞本体 / 撞焊盘
      for (const c of cs) {
        if (c.d === d) continue;
        if (others && !others.includes(c.d)) continue;
        if (sameSide(self.l, c.l) && ov(self.body, c.body)) { bad = true; break; }
        for (const pa of self.pads) { for (const pb of c.pads) {
          if (!pa.layers.some(L => pb.layers.includes(L))) continue;
          const gx = Math.max(pa.l - pb.r, pb.l - pa.r), gy = Math.max(pa.b - pb.t, pb.b - pa.t);
          const gap = (gx >= 0 && gy >= 0) ? Math.hypot(gx, gy) : Math.max(gx, gy);
          if (gap < MIN_PAD_GAP) { bad = true; break; }
        } if (bad) break; }
        if (bad) break;
      }
      if (bad) continue;
      hits.push({ x, y, 距原位: +Math.hypot(x - m.x0, y - m.y0).toFixed(0) });
    }
  }
  hits.sort((a, b) => a.距原位 - b.距原位);
  // 去重（同一片区域只留一个）
  const keep = [];
  for (const h of hits) {
    if (keep.some(k => Math.hypot(k.x - h.x, k.y - h.y) < 3 * step)) continue;
    keep.push(h);
    if (keep.length >= 12) break;
  }
  return keep;
}

// ── CLI ──
if (process.argv[1] && process.argv[1].endsWith('layout.mjs')) {
  const cmd = process.argv[2] || 'check';
  const file = process.argv[3];
  const P = file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  if (process.argv[4]) { const [l, r, b, t] = process.argv[4].split(',').map(Number); BOARD.l = l; BOARD.r = r; BOARD.b = b; BOARD.t = t; }
  if (cmd === 'check') {
    const R = check(P);
    console.log('板框', JSON.stringify(BOARD), ((BOARD.r - BOARD.l) * .0254).toFixed(1) + '×' + ((BOARD.t - BOARD.b) * .0254).toFixed(1) + 'mm');
    console.log('【本体重叠】', R.bodyHit.length);
    for (const h of R.bodyHit.slice(0, 30)) console.log('  ', h.a, '↔', h.b, ' 重叠', h.w + '×' + h.h);
    console.log('【焊盘过近】', R.padHit.length);
    for (const h of R.padHit.slice(0, 30)) console.log('  ', h.a, '↔', h.b, ' ', h.gap, 'mil');
    console.log('【越板边】', R.edge.length);
    for (const h of R.edge.slice(0, 30)) console.log('  ', h.pad, h.边, h.距, 'mil');
  } else if (cmd === 'suggest') {
    for (const d of process.argv.slice(5)) {
      console.log('──', d, '候选空位 ──');
      for (const s of suggest(d, P)) console.log('   ', s.x + ',' + s.y, ' 距原位', s.距原位);
    }
  } else if (cmd === 'model') {
    for (const [d, m] of MODEL) console.log(d.padEnd(7), 'L' + m.l, 'x' + m.x0, 'y' + m.y0,
      ' 焊盘盒', [Math.round(m.padBox.l), Math.round(m.padBox.r), Math.round(m.padBox.b), Math.round(m.padBox.t)].join(','),
      ' 本体', [Math.round(m.body.l), Math.round(m.body.r), Math.round(m.body.b), Math.round(m.body.t)].join(','));
  }
}
