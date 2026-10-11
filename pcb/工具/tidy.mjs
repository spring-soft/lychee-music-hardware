#!/usr/bin/env node
/**
 * 对行对齐（本地下跑）
 * 把「大致同一排」的小元件拉成一条直线 + 等间距，但不让它们跑远（保持整组重心）。
 * 固定件不参与；结果会用 layout.mjs 复核，有冲突就回退该组。
 *
 * 用法：node tidy.mjs <in.json> <out.json> [行容差mil] [最小间距mil]
 */
import fs from 'node:fs';
import { place, MODEL } from './layout.mjs';

const IN = process.argv[2] || './数据/place-final.json';
const OUT = process.argv[3] || './数据/place-tidy.json';
const TOL = Number(process.argv[4] || 70);      // 同一排的 y 容差
const PITCH_MIN = Number(process.argv[5] || 115);

const FIXED = new Set(['U1', 'CARD1', 'J1', 'J2', 'J3', 'J4', 'EC1', 'U2', 'U3', 'U4',
  'L1', 'C15', 'C16', 'Q1', 'D1', 'D2', 'D3',
  'SW1', 'SW2', 'SW3', 'SW4', 'SW5', 'SW6', 'SW7',
  'C8', 'C9', 'C13', 'C14', 'C19', 'C20', 'FB1', 'FB2']);

const P = JSON.parse(fs.readFileSync(IN, 'utf8'));
const mov = Object.keys(P).filter(d => !FIXED.has(d) && MODEL.has(d));
const halfW = d => (MODEL.get(d).body.r - MODEL.get(d).body.l) / 2;
const halfH = d => (MODEL.get(d).body.t - MODEL.get(d).body.b) / 2;
const layer = d => MODEL.get(d).l;

// 检查一组新坐标会不会撞（只跟"不在本组里的同面元件"比）
function collides(group, trial) {
  const others = [];
  for (const d of Object.keys(P)) {
    if (group.includes(d) || !MODEL.has(d)) continue;
    const [x, y] = trial[d] ?? P[d];
    others.push({ d, l: layer(d),
      b: { l: x + MODEL.get(d).body.l, r: x + MODEL.get(d).body.r,
           b: y + MODEL.get(d).body.b, t: y + MODEL.get(d).body.t } });
  }
  for (const d of group) {
    const [x, y] = trial[d];
    const A = { l: x + MODEL.get(d).body.l, r: x + MODEL.get(d).body.r,
                b: y + MODEL.get(d).body.b, t: y + MODEL.get(d).body.t };
    for (const o of others) {
      if (o.l !== layer(d)) continue;
      if (A.l < o.b.r && o.b.l < A.r && A.b < o.b.t && o.b.b < A.t) return true;
      // 也要求留 20mil 净空
      const dx = Math.max(A.l - o.b.r, o.b.l - A.r), dy = Math.max(A.b - o.b.t, o.b.b - A.t);
      const g = (dx > 0 && dy > 0) ? Math.hypot(dx, dy) : Math.max(dx, dy);
      if (g < 20) return true;
    }
    // 与同组其它件
    for (const e of group) if (e !== d) {
      const [ex, ey] = trial[e];
      const B = { l: ex + MODEL.get(e).body.l, r: ex + MODEL.get(e).body.r,
                  b: ey + MODEL.get(e).body.b, t: ey + MODEL.get(e).body.t };
      const dx = Math.max(A.l - B.r, B.l - A.r), dy = Math.max(A.b - B.t, B.b - A.t);
      const g = (dx > 0 && dy > 0) ? Math.hypot(dx, dy) : Math.max(dx, dy);
      if (g < 20) return true;
    }
  }
  return false;
}

let changed = 0;
for (let pass = 0; pass < 3; pass++) {
  // ── 按行分组（y 相近 + x 相邻）──
  const arr = mov.map(d => ({ d, x: P[d][0], y: P[d][1] })).sort((a, b) => a.y - b.y || a.x - b.x);
  const used = new Set();
  for (let i = 0; i < arr.length; i++) {
    if (used.has(arr[i].d)) continue;
    const g = [arr[i]];
    for (let j = i + 1; j < arr.length; j++) {
      if (used.has(arr[j].d)) continue;
      const prev = g[g.length - 1];
      if (Math.abs(arr[j].y - prev.y) > TOL) break;
      if (Math.abs(arr[j].x - prev.x) > 400) break;
      g.push(arr[j]);
    }
    if (g.length < 3) continue;
    const ys = g.map(o => o.y).sort((a, b) => a - b);
    const ty = ys[Math.floor(ys.length / 2)];
    const xs = g.map(o => o.x).sort((a, b) => a - b);
    const cx = xs.reduce((s, v) => s + v, 0) / xs.length;
    const maxHalf = Math.max(...g.map(o => halfW(o.d)));
    let pitch = Math.max(PITCH_MIN, ((xs[xs.length - 1] - xs[0]) + 2 * maxHalf) / Math.max(1, g.length - 1));
    const total = pitch * (g.length - 1);
    const trial = {};
    g.forEach((o, k) => { trial[o.d] = [Math.round(cx - total / 2 + k * pitch), Math.round(ty)]; });
    if (!collides(g.map(o => o.d), { ...P, ...trial })) {
      for (const o of g) { P[o.d] = trial[o.d]; changed++; }
      g.forEach(o => used.add(o.d));
    }
  }
  // ── 按列分组（x 相近 + y 相邻）──
  const arr2 = mov.map(d => ({ d, x: P[d][0], y: P[d][1] })).sort((a, b) => a.x - b.x || a.y - b.y);
  const used2 = new Set();
  for (let i = 0; i < arr2.length; i++) {
    if (used2.has(arr2[i].d)) continue;
    const g = [arr2[i]];
    for (let j = i + 1; j < arr2.length; j++) {
      if (used2.has(arr2[j].d)) continue;
      const prev = g[g.length - 1];
      if (Math.abs(arr2[j].x - prev.x) > TOL) break;
      if (Math.abs(arr2[j].y - prev.y) > 400) break;
      g.push(arr2[j]);
    }
    if (g.length < 3) continue;
    const xs = g.map(o => o.x).sort((a, b) => a - b);
    const tx = xs[Math.floor(xs.length / 2)];
    const ys = g.map(o => o.y).sort((a, b) => a - b);
    const cy = ys.reduce((s, v) => s + v, 0) / ys.length;
    const maxHalf = Math.max(...g.map(o => halfH(o.d)));
    let pitch = Math.max(PITCH_MIN, ((ys[ys.length - 1] - ys[0]) + 2 * maxHalf) / Math.max(1, g.length - 1));
    const total = pitch * (g.length - 1);
    const trial = {};
    g.forEach((o, k) => { trial[o.d] = [Math.round(tx), Math.round(cy - total / 2 + k * pitch)]; });
    if (!collides(g.map(o => o.d), { ...P, ...trial })) {
      for (const o of g) { P[o.d] = trial[o.d]; changed++; }
      g.forEach(o => used2.add(o.d));
    }
  }
}

fs.writeFileSync(OUT, JSON.stringify(P, null, 1));
console.log('对齐了', changed, '个元件次 →', OUT);

// 复核
const cs = place(P);
const bad = [];
for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
  if (cs[i].l !== cs[j].l) continue;
  const A = cs[i].body, B = cs[j].body;
  const dx = Math.max(A.l - B.r, B.l - A.r), dy = Math.max(A.b - B.t, B.b - A.t);
  const g = (dx > 0 && dy > 0) ? Math.hypot(dx, dy) : Math.max(dx, dy);
  if (g < 6) bad.push([+g.toFixed(1), cs[i].d, cs[j].d]);
}
console.log('【仍有重叠 <6mil】', bad.length);
for (const b of bad.slice(0, 10)) console.log('   ', b[0], b[1], '↔', b[2]);
