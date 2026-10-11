#!/usr/bin/env node
/**
 * 空闲区搜索（本地跑）
 * 把每个元件本体按 margin 膨胀后涂黑，输出还剩哪些连片的空地。
 * 用法：node free.mjs <placement.json> <板框 l,r,b,t> <margin> [只算某层]
 */
import fs from 'node:fs';
import { place } from './layout.mjs';

const P = process.argv[2] && fs.existsSync(process.argv[2]) ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : {};
const [BL, BR, BB, BT] = (process.argv[3] || '0,2283,0,1969').split(',').map(Number);
const MARGIN = Number(process.argv[4] || 60);
const STEP = 25;

const cs = place(P);
const W = Math.ceil((BR - BL) / STEP), H = Math.ceil((BT - BB) / STEP);
const occ = new Uint8Array(W * H);
for (const c of cs) {
  const l = c.body.l - MARGIN, r = c.body.r + MARGIN, b = c.body.b - MARGIN, t = c.body.t + MARGIN;
  for (let i = Math.floor((l - BL) / STEP); i <= Math.ceil((r - BL) / STEP); i++)
    for (let j = Math.floor((b - BB) / STEP); j <= Math.ceil((t - BB) / STEP); j++)
      if (i >= 0 && i < W && j >= 0 && j < H) occ[j * W + i] = 1;
}
// 最大全空矩形（贪心：对每个起点向右下扩）
const rects = [];
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  if (occ[j * W + i]) continue;
  let w = 0; while (i + w < W && !occ[j * W + i + w]) w++;
  let h = 1; outer: while (j + h < H) {
    for (let k = 0; k < w; k++) if (occ[(j + h) * W + i + k]) break outer;
    h++;
  }
  if (w * h >= 12) rects.push({ x: BL + i * STEP, y: BB + j * STEP, w: w * STEP, h: h * STEP, area: w * h });
}
rects.sort((a, b) => b.area - a.area);
// 去掉被更大矩形包含的
const keep = [];
for (const r of rects) {
  if (keep.some(k => r.x >= k.x && r.y >= k.y && r.x + r.w <= k.x + k.w && r.y + r.h <= k.y + k.h)) continue;
  keep.push(r);
  if (keep.length >= 15) break;
}
console.log(`板框 ${BL},${BR},${BB},${BT}  ${((BR-BL)*.0254).toFixed(1)}×${((BT-BB)*.0254).toFixed(1)}mm   净空 ${MARGIN}mil`);
console.log('【可用的连片空地】');
for (const r of keep) {
  const n = Math.floor(r.w / 100), m = Math.floor(r.h / 130);
  console.log(`  x ${r.x}~${r.x+r.w}  y ${r.y}~${r.y+r.h}   ${(r.w*.0254).toFixed(1)}×${(r.h*.0254).toFixed(1)}mm   估可放 ${n}×${m}=${n*m} 个 0603`);
}
