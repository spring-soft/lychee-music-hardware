#!/usr/bin/env node
/**
 * 计算每段电源走线「最多能加宽到多少」
 *
 * 思路：自动布线是按 10mil 密排的，事后加宽必然顶到邻线。所以先量出
 * 每段线的中线到「其他网络铜皮边缘」的实际距离，反推允许的半宽：
 *      允许半宽 = 距离 - 最小间距
 * 取该段沿途所有障碍的最小值，再和目线宽取小。算不出来的保持原宽。
 *
 * 输入：routing.raw.json（走线+过孔）、padshape.raw.json（焊盘）、geom.raw.json
 * 输出：widths.json —— { id, net, from, to }
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);

const CLR   = 8;      // mil，最小间距
const EDGE  = 8;      // mil，铜到板边
const BOARD = { l: 0, r: 2283, b: 0, t: 1969 };
const TARGET = { 'BAT+': 24, 'VBUS': 24, '+5V': 24, 'SW_NODE': 30 };

const routing = JSON.parse(fs.readFileSync(HERE('./数据/routing.raw.json'), 'utf8'));
const rawPads = JSON.parse(fs.readFileSync(HERE('./数据/padshape.raw.json'), 'utf8')).all;
const comps   = JSON.parse(fs.readFileSync(HERE('./数据/geom.raw.json'), 'utf8')).comps;
const compRot = new Map(comps.map(c => [c.d, c.rot || 0]));

// ─── 障碍物 ───
const padObs = [];      // { l,r,b,t, layers }
for (const p of rawPads) {
  if (p.x === undefined) continue;
  const sh = p.pad || [];
  let w = 32, h = 32, prot = 0;
  if (sh[0] === 'RECT' || sh[0] === 'OVAL' || sh[0] === 'ELLIPSE') { w = sh[1]; h = sh[2]; prot = sh[3] ?? 0; }
  else if (sh[0] === 'POLYGON' && Array.isArray(sh[1])) {
    const xs = sh[1].map(q => q[0]), ys = sh[1].map(q => q[1]);
    w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys);
  }
  const rot = ((compRot.get(p.comp) || 0) + prot) % 360;
  if (Math.abs(rot % 180) === 90) { const t = w; w = h; h = t; }
  padObs.push({ l: p.x - w/2, r: p.x + w/2, b: p.y - h/2, t: p.y + h/2,
                layers: p.l === 12 ? [1, 2] : [p.l] });
}
const viaObs = routing.vias.map(v => ({ x: v.x, y: v.y, rad: v.d / 2, layers: [1, 2] }));

// ─── 几何工具 ───
const segSeg = (a, b, c, d) => {
  // 返回两线段最近距离
  const sub = (p, q) => [p[0]-q[0], p[1]-q[1]];
  const dot = (p, q) => p[0]*q[0] + p[1]*q[1];
  const len2 = p => dot(p, p);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const P = (t, p, q) => [p[0] + t*(q[0]-p[0]), p[1] + t*(q[1]-p[1])];
  const d1 = sub(b, a), d2 = sub(d, c), r0 = sub(a, c);
  const A = len2(d1), E = len2(d2), F = dot(d2, r0);
  let s, t;
  if (A <= 1e-12 && E <= 1e-12) { s = t = 0; }
  else if (A <= 1e-12) { s = 0; t = clamp(F / E, 0, 1); }
  else {
    const C = dot(d1, r0);
    if (E <= 1e-12) { t = 0; s = clamp(-C / A, 0, 1); }
    else {
      const B = dot(d1, d2), den = A*E - B*B;
      s = den > 1e-12 ? clamp((B*F - C*E) / den, 0, 1) : 0;
      t = (B*s + F) / E;
      if (t < 0) { t = 0; s = clamp(-C / A, 0, 1); }
      else if (t > 1) { t = 1; s = clamp((B - C) / A, 0, 1); }
    }
  }
  const p1 = P(s, a, b), p2 = P(t, c, d);
  return Math.hypot(p1[0]-p2[0], p1[1]-p2[1]);
};
const segPt = (a, b, p) => segSeg(a, b, p, p);
/** 线段到轴对齐矩形的最短距离（矩形内部为负） */
const segRect = (a, b, rc) => {
  const inside = p => p[0] > rc.l && p[0] < rc.r && p[1] > rc.b && p[1] < rc.t;
  if (inside(a) || inside(b)) return -1;
  const corners = [[rc.l,rc.b],[rc.r,rc.b],[rc.r,rc.t],[rc.l,rc.t]];
  let m = Infinity;
  for (let i = 0; i < 4; i++) m = Math.min(m, segSeg(a, b, corners[i], corners[(i+1)%4]));
  return m;
};

// ─── 逐段计算 ───
const out = [];
for (const L of routing.lines) {
  const target = TARGET[L.net];
  if (!target) continue;
  if (L.w >= target - 0.5) continue;                 // 已经是目标宽度
  const A = [L.x1, L.y1], B = [L.x2, L.y2];
  let maxHalf = target / 2;

  // 其他走线
  for (const o of routing.lines) {
    if (o.id === L.id || o.layer !== L.layer || o.net === L.net) continue;
    const d = segSeg(A, B, [o.x1, o.y1], [o.x2, o.y2]) - o.w / 2;
    maxHalf = Math.min(maxHalf, d - CLR);
  }
  // 焊盘
  for (const p of padObs) {
    if (!p.layers.includes(L.layer)) continue;
    if (p.l < Math.min(A[0],B[0])-60 && p.r < Math.min(A[0],B[0])-60) continue;
    if (p.l > Math.max(A[0],B[0])+60 && p.r > Math.max(A[0],B[0])+60) continue;
    const d = segRect(A, B, p);
    if (d < 0) { maxHalf = Math.min(maxHalf, -999); continue; }
    maxHalf = Math.min(maxHalf, d - CLR);
  }
  // 过孔
  for (const v of viaObs) {
    const d = segPt(A, B, [v.x, v.y]) - v.rad;
    maxHalf = Math.min(maxHalf, d - CLR);
  }
  // 板边
  const edgeD = Math.min(
    Math.min(A[0], B[0]) - BOARD.l, BOARD.r - Math.max(A[0], B[0]),
    Math.min(A[1], B[1]) - BOARD.b, BOARD.t - Math.max(A[1], B[1]));
  maxHalf = Math.min(maxHalf, edgeD - EDGE);
  // 板框内缩一格，避免整段贴着边
  const w = Math.max(L.w, Math.min(target, Math.floor(maxHalf * 2)));
  if (w > L.w + 0.5) out.push({ id: L.id, net: L.net, from: +L.w.toFixed(1), to: w });
}

const byNet = {};
for (const o of out) byNet[o.net] = (byNet[o.net] || 0) + 1;
const total = {}, totWidened = {};
for (const L of routing.lines) if (TARGET[L.net]) {
  total[L.net] = (total[L.net] || 0) + 1;
  if (out.some(o => o.id === L.id)) totWidened[L.net] = (totWidened[L.net] || 0) + 1;
}
fs.writeFileSync(HERE('./数据/widths.json'), JSON.stringify(out, null, 1));
console.log('可加宽段数:', out.length, '/', routing.lines.filter(L => TARGET[L.net]).length);
console.log('按网络:', JSON.stringify(totWidened), '/', JSON.stringify(total));
const hist = {};
for (const o of out) hist[o.to] = (hist[o.to] || 0) + 1;
console.log('加宽后宽度分布(mil):', JSON.stringify(hist));
