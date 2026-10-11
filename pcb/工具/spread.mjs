#!/usr/bin/env node
/**
 * 元件自动散开（斥力松弛）
 *
 *  - 固定件（模组/连接器/按键/大电容/去耦电容组）钉死不动
 *  - 可动件互相排斥，同时被一根弱弹簧拴在初始位置（避免跑飞、少绕线）
 *  - 额外硬约束：板框内、模组净空区、编码器净空区
 *
 * 用法：node spread.mjs <in.json> <out.json> [目标间隙mil] [弹簧系数]
 */
import fs from 'node:fs';
import { place, MODEL } from './layout.mjs';

const IN = process.argv[2] || './数据/place-50.json';
const OUT = process.argv[3] || './数据/place-spread.json';
const D_MIN = Number(process.argv[4] || 80);     // 期望的本体间隙 mil
const K = Number(process.argv[5] || 0.035);      // 弹簧系数
const EDGE = Number(process.argv[6] || 60);      // 本体到板边的净空 mil

const BL = 0, BR = 2283, BB = 0, BT = 1969;

// 钉死不动
const FIXED = new Set(['U1', 'CARD1', 'J1', 'J2', 'J3', 'J4', 'EC1', 'U2', 'U3', 'U4',
  'L1', 'C15', 'C16', 'Q1', 'D1', 'D2', 'D3',
  'SW1', 'SW2', 'SW3', 'SW4', 'SW5', 'SW6', 'SW7',
  // U2 的去耦电容组，天生要挨在一起，整体不拆
  'C8', 'C9', 'C13', 'C14', 'C19', 'C20', 'FB1', 'FB2']);
// 禁入区（模组本体 + 编码器回转区）
const ZONES = [
  { l: 186 - 60, r: 895 + 60, b: 1192 - 60, t: 2196 + 60, name: '模组' },
  { l: 1800 - 250, r: 1800 + 250, b: 297 - 250, t: 297 + 250, name: '编码器' },
];

const P = JSON.parse(fs.readFileSync(IN, 'utf8'));
const ORIG = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, [...v]]));

const grid = 5;                                   // 落格 mil
const snap = v => Math.round(v / grid) * grid;

let pos = {}; for (const [d, [x, y]] of Object.entries(P)) pos[d] = [x, y];

// 本体的半宽半高（相对元件中心）
const HALF = {};
for (const [d, m] of MODEL) {
  const c = P[d] || [m.x0, m.y0];
  HALF[d] = { l: m.body.l, r: m.body.r, b: m.body.b, t: m.body.t };  // 相对量，直接可用
}

const box = d => { const [x, y] = pos[d]; const h = HALF[d];
  return { l: x + h.l, r: x + h.r, b: y + h.b, t: y + h.t }; };
const ov = (a, b) => a.l < b.r && b.l < a.r && a.b < b.t && b.b < a.t;
const gapOf = (a, b) => {
  const dx = Math.max(a.l - b.r, b.l - a.r), dy = Math.max(a.b - b.t, b.b - a.t);
  return (dx > 0 && dy > 0) ? Math.hypot(dx, dy) : Math.max(dx, dy);
};

const movable = Object.keys(pos).filter(d => !FIXED.has(d) && MODEL.has(d));
const all = Object.keys(pos).filter(d => MODEL.has(d));
const layers = {}; for (const d of all) layers[d] = MODEL.get(d).l;

for (let iter = 0; iter < 400; iter++) {
  const force = {}; for (const d of movable) force[d] = [0, 0];
  const cur = {}; for (const d of all) cur[d] = box(d);

  for (const a of movable) for (const b of all) {
    if (a === b) continue;
    if (layers[a] !== layers[b]) continue;
    const A = cur[a], B = cur[b];
    const g = gapOf(A, B);
    if (g >= D_MIN) continue;
    // 排斥方向：按中心连线的重叠轴推开
    const ax = (A.l + A.r) / 2, ay = (A.b + A.t) / 2;
    const bx = (B.l + B.r) / 2, by = (B.b + B.t) / 2;
    let dx = ax - bx, dy = ay - by;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const push = (D_MIN - g) * 0.5;
    force[a][0] += dx * push; force[a][1] += dy * push;
  }
  // 弹簧拉回原位
  for (const d of movable) {
    force[d][0] += (ORIG[d][0] - pos[d][0]) * K;
    force[d][1] += (ORIG[d][1] - pos[d][1]) * K;
  }
  // 板框约束
  for (const d of movable) {
    const h = HALF[d];
    const nx = pos[d][0] + force[d][0], ny = pos[d][1] + force[d][1];
    let x = nx, y = ny;
    x = Math.min(BR - EDGE - h.r, Math.max(BL + EDGE - h.l, x));
    y = Math.min(BT - EDGE - h.t, Math.max(BB + EDGE - h.b, y));
    // 禁入区
    const bx = { l: x + h.l, r: x + h.r, b: y + h.b, t: y + h.t };
    for (const z of ZONES) {
      if (ov(bx, z)) {
        // 往最近的出口推
        const cands = [
          { dx: z.l - bx.r, dy: 0 }, { dx: z.r - bx.l, dy: 0 },
          { dx: 0, dy: z.b - bx.t }, { dx: 0, dy: z.t - bx.b }];
        cands.sort((p, q) => Math.hypot(p.dx, p.dy) - Math.hypot(q.dx, q.dy));
        x += cands[0].dx; y += cands[0].dy;
      }
    }
    pos[d] = [x, y];
  }
}

// 落格 + 输出
const out = {};
for (const [d, [x, y]] of Object.entries(pos)) out[d] = [snap(x), snap(y)];
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

// 复核
const cs = place(out);
const bad = [];
for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
  if (cs[i].l !== cs[j].l) continue;
  const g = gapOf(cs[i].body, cs[j].body);
  if (g < 6) bad.push([+g.toFixed(1), cs[i].d, cs[j].d]);
}
const near = [];
for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
  if (cs[i].l !== cs[j].l) continue;
  if (FIXED.has(cs[i].d)) continue;
  const g = gapOf(cs[i].body, cs[j].body);
  if (g < D_MIN * 0.7) near.push([Math.round(g), cs[i].d, cs[j].d]);
}
console.log(`目标间隙 ${D_MIN}mil  可动 ${movable.length} 个`);
console.log('【仍重叠 <6mil】', bad.length);
for (const b of bad.slice(0, 15)) console.log('   ', b[0], b[1], '↔', b[2]);
near.sort((a, b) => a[0] - b[0]);
console.log('【仍偏近 <' + Math.round(D_MIN * 0.7) + 'mil】', near.length);
for (const b of near.slice(0, 15)) console.log('   ', b[0], b[1], '↔', b[2]);
