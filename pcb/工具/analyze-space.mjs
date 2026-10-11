#!/usr/bin/env node
/**
 * 板面空间占用分析
 * 按 0.5mm 栅格统计正面/背面的元件占用，找出剩余空间
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);

const MIL = 0.0254;
const BOARD = { w: 2283, h: 1969 };          // mil
const CELL = 20;                              // 栅格 20mil = 0.508mm
const BODY = {
  U1:{w:709,h:1004,anchor:'bottom'}, U2:{w:165,h:165}, U3:{w:118,h:118}, Q1:{w:118,h:118},
  U4:{w:197,h:236}, L1:{w:157,h:157},
  J1:{w:380,h:340}, J2:{w:559,h:244}, J3:{w:402,h:110}, J4:{w:120,h:150},
  SW1:{w:236,h:236}, SW2:{w:236,h:236}, SW3:{w:236,h:236}, SW4:{w:236,h:236},
  SW5:{w:197,h:114}, SW6:{w:197,h:114}, SW7:{w:236,h:236},
  C15:{w:150,h:115}, C16:{w:150,h:115}, EC1:{w:311,h:154},
};
// 屏幕覆盖区（正面，屏幕压在上面，不能放元件）
const SCREEN = { l:100, r:1904, b:560, t:1899 };
// 电池覆盖区（背面，只能放矮元件）
const BAT = { l:800, r:1981, b:60, t:1950 };

const pads = JSON.parse(fs.readFileSync(HERE('./数据/pads.raw.json'), 'utf8')).rows;
const comps = JSON.parse(fs.readFileSync(HERE('./数据/geom.raw.json'), 'utf8')).comps;
const compInfo = new Map(comps.map(c => [c.d, c]));

const nx = Math.ceil(BOARD.w / CELL), ny = Math.ceil(BOARD.h / CELL);
const grid = { 1: new Uint8Array(nx*ny), 2: new Uint8Array(nx*ny) };
const idx = (x,y) => y*nx + x;

// 打点：元件本体（外扩一点当安全间距）
const PAD = 10;  // mil
for (const [d, B] of Object.entries(BODY)) {
  const c = compInfo.get(d); if (!c) continue;
  const rot = (c.rot % 180) !== 0;
  const bw = rot ? B.h : B.w, bh = rot ? B.w : B.h;
  let l, r, b, t;
  if (B.anchor === 'bottom' && !rot) {
    const ys = pads.filter(p => p.d === d).map(p => p.y);
    b = Math.min(...ys); t = b + bh; l = c.x - bw/2; r = c.x + bw/2;
  } else { l = c.x-bw/2; r = c.x+bw/2; b = c.y-bh/2; t = c.y+bh/2; }
  const g = grid[c.l]; if (!g) continue;
  for (let y = Math.max(0, Math.floor((b-PAD)/CELL)); y <= Math.min(ny-1, Math.ceil((t+PAD)/CELL)); y++)
    for (let x = Math.max(0, Math.floor((l-PAD)/CELL)); x <= Math.min(nx-1, Math.ceil((r+PAD)/CELL)); x++)
      g[idx(x,y)] = 1;
}
// 小元件（0603 等）按焊盘包围盒打点
const byDes = {};
for (const p of pads) { (byDes[p.d] = byDes[p.d] || []).push(p); }
for (const [d, ps] of Object.entries(byDes)) {
  if (BODY[d]) continue;
  const c = compInfo.get(d); if (!c) continue;
  const xs = ps.map(p=>p.x), ys = ps.map(p=>p.y);
  const l = Math.min(...xs)-25, r = Math.max(...xs)+25, b = Math.min(...ys)-25, t = Math.max(...ys)+25;
  const g = grid[c.l]; if (!g) continue;
  for (let y = Math.max(0,Math.floor(b/CELL)); y <= Math.min(ny-1,Math.ceil(t/CELL)); y++)
    for (let x = Math.max(0,Math.floor(l/CELL)); x <= Math.min(nx-1,Math.ceil(r/CELL)); x++)
      g[idx(x,y)] = 1;
}
// 标记屏幕区 / 电池区覆盖
const mark = (g, reg) => { for (let y=Math.max(0,Math.floor(reg.b/CELL)); y<=Math.min(ny-1,Math.ceil(reg.t/CELL)); y++)
  for (let x=Math.max(0,Math.floor(reg.l/CELL)); x<=Math.min(nx-1,Math.ceil(reg.r/CELL)); x++) g[idx(x,y)] = 2; };
mark(grid[1], SCREEN);
mark(grid[2], BAT);

const MM = CELL * MIL;
const area = n => (n * MM * MM).toFixed(0);
const report = {};
for (const side of [1,2]) {
  const g = grid[side];
  let free=0, comp=0, blocked=0;
  for (const v of g) { if (v===0) free++; else if (v===1) comp++; else blocked++; }
  report[side===1?'正面':'背面'] = {
    元件占用: area(comp)+' mm²',
    被覆盖不能放: area(blocked)+' mm²',
    空余可用: area(free)+' mm²',
    空余占比: (free/g.length*100).toFixed(1)+'%',
  };
}
const boardArea = (BOARD.w*MIL)*(BOARD.h*MIL);
report['整板面积'] = boardArea.toFixed(0)+' mm²';

// 找正面最大的空余矩形（粗找：扫连续空行）
const findGaps = (g) => {
  const rows=[];
  for (let y=0;y<ny;y++){ let s=-1;
    for (let x=0;x<=nx;x++){ const v = x<nx ? g[idx(x,y)] : 1;
      if (v===0 && s<0) s=x; else if (v!==0 && s>=0) { if ((x-s)*MM>=8) rows.push({y,s,e:x,len:(x-s)*MM}); s=-1; } } }
  return rows;
};
report['正面空档（宽≥8mm 的连续空白行）'] = findGaps(grid[1]).slice(0,12)
  .map(r => `y=${(r.y*MM).toFixed(0)}mm  x ${(r.s*MM).toFixed(0)}~${(r.e*MM).toFixed(0)}mm (宽${r.len.toFixed(1)}mm)`);

console.log('═══ 板面空间占用分析 ═══');
console.log('板子尺寸: 58.0 × 50.0 mm   面积 ' + report['整板面积']);
console.log();
for (const side of ['正面','背面']) {
  const r = report[side];
  console.log('【' + side + '】');
  console.log('   元件占用:      ' + r.元件占用);
  console.log('   被覆盖不能用:  ' + r.被覆盖不能放);
  console.log('   空余可用:      ' + r.空余可用 + '   (' + r.空余占比 + ')');
}
console.log();
console.log('【正面空档（可放新元件的地方）】');
for (const s of report['正面空档（宽≥8mm 的连续空白行）']) console.log('   ' + s);

// ── 找最大的连续空白矩形 ──
const largestRect = (g) => {
  const h = new Int32Array(nx);
  let best = { area:0 };
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) h[x] = g[idx(x,y)] === 0 ? h[x] + 1 : 0;
    const stack = [];
    for (let x = 0; x <= nx; x++) {
      const cur = x < nx ? h[x] : 0;
      while (stack.length && h[stack[stack.length-1]] >= cur) {
        const hh = h[stack.pop()];
        const w = stack.length ? x - stack[stack.length-1] - 1 : x;
        const a = hh * w;
        if (a > best.area) best = { area:a, w, h:hh, x: stack.length ? stack[stack.length-1]+1 : 0, y: y-hh+1 };
      }
      stack.push(x);
    }
  }
  return { 宽mm:+(best.w*MM).toFixed(1), 高mm:+(best.h*MM).toFixed(1),
           位置mm:'x '+(best.x*MM).toFixed(1)+'~'+((best.x+best.w)*MM).toFixed(1)+'  y '+(best.y*MM).toFixed(1)+'~'+((best.y+best.h)*MM).toFixed(1) };
};
console.log();
console.log('【最大连续空白区】');
console.log('   正面: ' + JSON.stringify(largestRect(grid[1])));
console.log('   背面: ' + JSON.stringify(largestRect(grid[2])));

// 需要多大的地方？
console.log();
console.log('【V2 新增元件需要的地方】');
console.log('   TF卡座(推推式microSD): 约 16 × 16 mm  = 256 mm²');
console.log('   USB转串口CH340C+外围:  约 10 × 8  mm  =  80 mm²');
console.log('   合计新增需求:          约 336 mm²');
