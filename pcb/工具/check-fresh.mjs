#!/usr/bin/env node
/**
 * 基于 fresh.json（EDA 实时导出）的碰撞检查
 *  - 每个元件用【自己焊盘的真实矩形并集】当轮廓（比手写本体表准）
 *  - 再叠加一个「本体外扩」量：贴片元件焊盘内缩于本体，直插件/插座焊盘外露
 *  - 输出：元件轮廓重叠、焊盘间过近、焊盘越板边
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);
const D = JSON.parse(fs.readFileSync(HERE('./数据/fresh.json'), 'utf8'));

const BOARD = { l: 0, r: 2283, b: 0, t: 2166 };
const MIN_PAD_GAP = 6;    // mil
const MIN_EDGE = 11.8;    // mil

// 本体相对焊盘的外扩量（mil）：贴片元件本体一般比焊盘外沿大一点点
const BODY_PAD = {
  // 模组：焊盘内缩本体 0，本体即焊盘外沿再外扩一点
  U1: 0, CARD1: 0,
};
const DEFAULT_BODY_PAD = 0;

const rot90 = r => Math.abs(Math.round(r) % 180) === 90;

const comps = D.comps.map(c => {
  const pads = [];
  for (const p of c.pins) {
    const sh = p.pad || [];
    let w = 0, h = 0;
    if (sh[0] === 'RECT' || sh[0] === 'OVAL' || sh[0] === 'ELLIPSE') { w = sh[1]; h = sh[2]; }
    else if (sh[0] === 'POLYGON' && Array.isArray(sh[1])) {
      const xs = sh[1].map(q => q[0]), ys = sh[1].map(q => q[1]);
      w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys);
    } else { w = 32; h = 32; }
    if (rot90(p.rotation ?? 0)) { const t = w; w = h; h = t; }
    // 通孔焊盘：两个面都有
    const layers = (p.padType === 'THROUGH' || p.hole) ? [1, 2] : [p.l];
    pads.push({ n: p.n, x: p.x, y: p.y, w, h, layers, net: p.net,
                l: p.x - w / 2, r: p.x + w / 2, b: p.y - h / 2, t: p.y + h / 2 });
  }
  const ext = BODY_PAD[c.d] ?? DEFAULT_BODY_PAD;
  const l = Math.min(...pads.map(p => p.l)), r = Math.max(...pads.map(p => p.r));
  const b = Math.min(...pads.map(p => p.b)), t = Math.max(...pads.map(p => p.t));
  return { ...c, pads, box: { l: l - ext, r: r + ext, b: b - ext, t: t + ext } };
});

const ov = (a, b) => !(a.r <= b.l || b.r <= a.l || a.t <= b.b || b.t <= a.b);
const inter = (a, b) => ({ l: Math.max(a.l, b.l), r: Math.min(a.r, b.r),
                           b: Math.max(a.b, b.b), t: Math.min(a.t, b.t) });

// ── 1. 元件轮廓重叠 ──
const hits = [];
for (let i = 0; i < comps.length; i++) for (let j = i + 1; j < comps.length; j++) {
  const A = comps[i], B = comps[j];
  if (!ov(A.box, B.box)) continue;
  const it = inter(A.box, B.box);
  hits.push({ a: A.d, b: B.d, 重叠宽: Math.round(it.r - it.l), 重叠高: Math.round(it.t - it.b),
              A层: A.l, B层: B.l,
              同面: A.l === B.l || A.l > 2 || B.l > 2 ? (A.l === B.l) : false });
}
hits.sort((x, y) => (y.重叠宽 * y.重叠高) - (x.重叠宽 * x.重叠高));

// ── 2. 焊盘间过近（同层） ──
const flat = [];
for (const c of comps) for (const p of c.pads) flat.push({ ...p, comp: c.d });
const near = [];
for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) {
  const A = flat[i], B = flat[j];
  if (A.comp === B.comp) continue;
  if (!A.layers.some(L => B.layers.includes(L))) continue;
  const gx = Math.max(A.l - B.r, B.l - A.r), gy = Math.max(A.b - B.t, B.b - A.t);
  const gap = (gx >= 0 && gy >= 0) ? Math.hypot(gx, gy) : Math.max(gx, gy);
  if (gap < MIN_PAD_GAP) near.push({ a: A.comp + '_' + A.n, b: B.comp + '_' + B.n, gap: +gap.toFixed(1) });
}
near.sort((x, y) => x.gap - y.gap);

// ── 3. 越板边 ──
const edge = [];
for (const p of flat) {
  const d = Math.min(p.l - BOARD.l, BOARD.r - p.r, p.b - BOARD.b, BOARD.t - p.t);
  if (d < MIN_EDGE) {
    const side = d === p.l - BOARD.l ? '左' : d === BOARD.r - p.r ? '右' : d === p.b - BOARD.b ? '下' : '上';
    edge.push({ pad: p.comp + '_' + p.n, 边: side, 距离mil: +d.toFixed(1), 距离mm: +(d * 0.0254).toFixed(2) });
  }
}
edge.sort((a, b) => a.距离mil - b.距离mil);

console.log('板框', JSON.stringify(BOARD), '=', ((BOARD.r - BOARD.l) * 0.0254).toFixed(1) + '×' + ((BOARD.t - BOARD.b) * 0.0254).toFixed(1) + 'mm');
console.log('元件', comps.length, ' 焊盘', flat.length);
console.log('\n【元件轮廓重叠】', hits.length, '处');
for (const h of hits) console.log('  ', h.a, '(L' + h.A层 + ') ↔', h.b, '(L' + h.B层 + ')  重叠', h.重叠宽 + '×' + h.重叠高, 'mil');
console.log('\n【焊盘过近 <' + MIN_PAD_GAP + 'mil】', near.length, '处');
for (const x of near.slice(0, 25)) console.log('  ', x.a, '↔', x.b, ' 间隙', x.gap);
console.log('\n【越板边 <' + MIN_EDGE + 'mil】', edge.length, '处');
for (const x of edge.slice(0, 25)) console.log('  ', x.pad, '距', x.边, '边', x.距离mil, 'mil (' + x.距离mm + 'mm)');
console.log('\n结论:', (hits.length === 0 && near.length === 0 && edge.length === 0) ? 'OK' : 'FAIL');
