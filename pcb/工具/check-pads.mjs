#!/usr/bin/env node
/**
 * 基于【真实焊盘几何】的间距检查（本地运行，不经过 EDA）
 *
 * 之前几个检查脚本用手写的「元件本体尺寸表」估算，结果编码器/耳机座的焊盘
 * 伸到本体轮廓之外，被漏判（DRC 抓出来 4 处）。本脚本直接用 EDA 导出的
 * 焊盘形状 + 元件旋转角，算出每个焊盘的真实矩形，检查：
 *   1. 不同元件之间的焊盘重叠/过近
 *   2. 焊盘到板边距离
 *
 * 数据来源：padshape.raw.json（焊盘坐标+形状）、geom.raw.json（元件旋转角）
 * 重新生成：node eda.mjs dump-padshape.js > padshape.raw.json
 *           node eda.mjs dump-geom.js     > geom.raw.json
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);

const MIN_PAD_GAP = 6;      // mil，焊盘间最小间隙（对应 DRC 的 6mil 规则）
const MIN_EDGE    = 11.8;   // mil，焊盘到板边最小距离
const BOARD = { l: 0, r: 2283, b: 0, t: 1969 };

const rawPads = JSON.parse(fs.readFileSync(HERE('./数据/padshape.raw.json'), 'utf8')).all;
const comps   = JSON.parse(fs.readFileSync(HERE('./数据/geom.raw.json'), 'utf8')).comps;
const compRot = new Map(comps.map(c => [c.d, c.rot || 0]));

// pcb_PrimitivePad.getAll() 不含元件位号，用 (焊盘号, x, y) 与 pads.raw.json 关联
const ref = JSON.parse(fs.readFileSync(HERE('./数据/pads.raw.json'), 'utf8')).rows;
const designatorOf = new Map();
for (const r of ref) designatorOf.set(r.n + '|' + Math.round(r.x) + '|' + Math.round(r.y), r.d);

const pads = [];
for (const p of rawPads) {
  if (p.x === undefined) continue;
  p.comp = designatorOf.get(p.n + '|' + Math.round(p.x) + '|' + Math.round(p.y));
  if (!p.comp) continue;                       // 关联不上的跳过，避免误判
  const sh = p.pad || [];
  let w, h, prot = 0;
  if (sh[0] === 'RECT' || sh[0] === 'OVAL' || sh[0] === 'ELLIPSE') {
    w = sh[1]; h = sh[2]; prot = sh[3] ?? 0;
  } else if (sh[0] === 'POLYGON' && Array.isArray(sh[1])) {
    const xs = sh[1].map(q => q[0]), ys = sh[1].map(q => q[1]);
    w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys);
  } else { w = 32; h = 32; }
  const rot = ((compRot.get(p.comp) || 0) + prot) % 360;
  if (Math.abs(rot % 180) === 90) { const t = w; w = h; h = t; }
  const th = p.l === 12;
  pads.push({ comp: p.comp, n: p.n, x: p.x, y: p.y, w, h,
              layers: th ? [1, 2] : [p.l], th });
}

const box = p => ({ l: p.x - p.w/2, r: p.x + p.w/2, b: p.y - p.h/2, t: p.y + p.h/2 });

// ── 1. 焊盘互相靠太近 ──
const near = [];
for (let i = 0; i < pads.length; i++) for (let j = i + 1; j < pads.length; j++) {
  const A = pads[i], B = pads[j];
  if (A.comp === B.comp) continue;
  if (!A.layers.some(L => B.layers.includes(L))) continue;
  const a = box(A), b = box(B);
  const gx = Math.max(a.l - b.r, b.l - a.r);
  const gy = Math.max(a.b - b.t, b.b - a.t);
  const gap = (gx >= 0 && gy >= 0) ? Math.hypot(gx, gy) : Math.max(gx, gy);
  if (gap < MIN_PAD_GAP) {
    near.push({ a: A.comp+'_'+A.n, b: B.comp+'_'+B.n, gap: +gap.toFixed(1),
                layer: A.layers.filter(L => B.layers.includes(L)).join('/') });
  }
}
near.sort((x, y) => x.gap - y.gap);

// ── 2. 焊盘到板边 ──
const edge = [];
for (const p of pads) {
  const b = box(p);
  const d = Math.min(b.l - BOARD.l, BOARD.r - b.r, b.b - BOARD.b, BOARD.t - b.t);
  if (d < MIN_EDGE) {
    const side = d === b.l - BOARD.l ? '左' : d === BOARD.r - b.r ? '右'
               : d === b.b - BOARD.b ? '下' : '上';
    edge.push({ pad: p.comp+'_'+p.n, distMil: +d.toFixed(1), distMM: +(d*0.0254).toFixed(2),
                side, x: Math.round(p.x), y: Math.round(p.y), padW: p.w, padH: p.h });
  }
}
edge.sort((a, b) => a.distMil - b.distMil);

console.log('参数: 最小焊盘间隙', MIN_PAD_GAP, 'mil | 最小距板边', MIN_EDGE, 'mil');
console.log('焊盘总数:', pads.length);
console.log('\n【焊盘过近】', near.length, '处');
for (const x of near.slice(0, 20)) console.log('  ', x.a, '↔', x.b, ' 间隙', x.gap, 'mil  层', x.layer);
console.log('\n【距板边不足】', edge.length, '处');
for (const x of edge.slice(0, 20))
  console.log('  ', x.pad, ' 距', x.side, '边', x.distMil, 'mil (' + x.distMM + 'mm)  @(' + x.x + ',' + x.y + ') 焊盘' + x.padW + '×' + x.padH);
console.log('\n结论:', (near.length === 0 && edge.length === 0) ? 'OK' : 'FAIL — 需修正');
