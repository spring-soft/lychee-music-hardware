#!/usr/bin/env node
/**
 * 找 TF 卡座能放的位置
 * 需求：15.5 × 11 mm（含焊盘），且卡片插入方向要能通到板边
 * 约束：正面/背面的元件本体、另一面的直插焊脚（穿透）
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);
const MIL = 0.0254, CELL = 20;                 // 20mil 栅格
const BOARD = { l: 0, r: 2283, b: 0, t: 1969 };

const BODY = {
  U1:{w:709,h:1004,anchor:'bottom'}, U2:{w:165,h:165}, U3:{w:118,h:118}, Q1:{w:118,h:118},
  U4:{w:197,h:236}, L1:{w:157,h:157},
  J1:{w:380,h:340}, J2:{w:559,h:244}, J3:{w:402,h:110}, J4:{w:120,h:150},
  SW1:{w:236,h:236}, SW2:{w:236,h:236}, SW3:{w:236,h:236}, SW4:{w:236,h:236},
  SW5:{w:197,h:114}, SW6:{w:197,h:114}, SW7:{w:236,h:236},
  C15:{w:150,h:115}, C16:{w:150,h:115}, EC1:{w:311,h:154},
};
const SCREEN = { l:100, r:1904, b:560, t:1899 };   // 正面屏幕覆盖区
const ANT    = { l:15,  r:765,  b:1898, t:1969 };  // 天线禁布区
const TF_W = 611, TF_H = 416;                       // TF 卡座焊盘尺寸（mil）

const pads  = JSON.parse(fs.readFileSync(HERE('./数据/pads.raw.json'), 'utf8')).rows;
const comps = JSON.parse(fs.readFileSync(HERE('./数据/geom.raw.json'), 'utf8')).comps;
const compInfo = new Map(comps.map(c => [c.d, c]));

const nx = Math.ceil(BOARD.r / CELL), ny = Math.ceil(BOARD.t / CELL);
const idx = (x,y) => y*nx + x;
// occ[side] = 占用（元件本体）  thru = 直插焊脚（穿透两层）
const occ = { 1: new Uint8Array(nx*ny), 2: new Uint8Array(nx*ny) };
const thru = new Uint8Array(nx*ny);

const mark = (g, l, r, b, t) => {
  for (let y=Math.max(0,Math.floor(b/CELL)); y<=Math.min(ny-1,Math.ceil(t/CELL)); y++)
    for (let x=Math.max(0,Math.floor(l/CELL)); x<=Math.min(nx-1,Math.ceil(r/CELL)); x++) g[idx(x,y)] = 1;
};

// 元件本体
for (const [d, B] of Object.entries(BODY)) {
  const c = compInfo.get(d); if (!c) continue;
  const rot = (c.rot % 180) !== 0;
  const bw = rot ? B.h : B.w, bh = rot ? B.w : B.h;
  let l,r,b,t;
  if (B.anchor === 'bottom' && !rot) { const ys = pads.filter(p=>p.d===d).map(p=>p.y);
    b = Math.min(...ys); t = b+bh; l = c.x-bw/2; r = c.x+bw/2; }
  else { l=c.x-bw/2; r=c.x+bw/2; b=c.y-bh/2; t=c.y+bh/2; }
  mark(occ[c.l], l, r, b, t);
}
// 小元件按焊盘包围盒
const byDes = {};
for (const p of pads) (byDes[p.d] = byDes[p.d] || []).push(p);
for (const [d, ps] of Object.entries(byDes)) {
  if (BODY[d]) continue;
  const c = compInfo.get(d); if (!c) continue;
  const xs = ps.map(p=>p.x), ys = ps.map(p=>p.y);
  mark(occ[c.l], Math.min(...xs)-25, Math.max(...xs)+25, Math.min(...ys)-25, Math.max(...ys)+25);
  // 直插焊脚（layer 12）穿透
  for (const p of ps) if (p.l === 12) mark(thru, p.x-40, p.x+40, p.y-40, p.y+40);
}
// 屏幕区、天线区
mark(occ[1], SCREEN.l, SCREEN.r, SCREEN.b, SCREEN.t);
mark(thru, ANT.l, ANT.r, ANT.b, ANT.t);

// 逐个候选位置测试：卡座靠边，四条边分别试
const CANDS = [];
const tryPlace = (side, x, y) => {
  // x,y = 卡座焊盘范围的左下角
  const l = x, r = x + TF_W, b = y, t = y + TF_H;
  if (l < 20 || r > BOARD.r-20 || b < 20 || t > BOARD.t-20) return false;
  for (let yy=Math.floor(b/CELL); yy<=Math.ceil(t/CELL); yy++)
    for (let xx=Math.floor(l/CELL); xx<=Math.ceil(r/CELL); xx++) {
      const i = idx(Math.min(xx,nx-1), Math.min(yy,ny-1));
      if (thru[i]) return false;
      if (occ[side][i]) return false;
    }
  return true;
};
for (let y = 20; y + TF_H < BOARD.t - 20; y += CELL)
  for (const [side, x] of [[1,20],[2,20],[1,BOARD.r-20-TF_W],[2,BOARD.r-20-TF_W]])
    if (tryPlace(side, x, y)) CANDS.push({ 层: side===1?'正面':'背面', 靠边: x<100?'左边':'右边', y:mm(y), 宽高:'15.5 × 10.6' });
for (let x = 20; x + TF_W < BOARD.r - 20; x += CELL)
  for (const [side, y] of [[1,20],[2,20],[1,BOARD.t-20-TF_H],[2,BOARD.t-20-TF_H]])
    if (tryPlace(side, x, y)) CANDS.push({ 层: side===1?'正面':'背面', 靠边: y<100?'下边':'上边', x:mm(x), 宽高:'15.5 × 10.6' });

function mm(v){ return +(v*MIL).toFixed(1); }
console.log('═══ TF 卡座可放位置扫描 ═══');
console.log('板子: 58.0 × 50.0 mm   卡座需求: 15.5 × 10.6 mm，必须靠板边');
console.log();
if (!CANDS.length) {
  console.log('❌ 现有 58×50mm 板子上【没有任何位置】能放下 TF 卡座');
} else {
  // 合并相邻的连续区段
  const merged = [];
  for (const c of CANDS) {
    const last = merged[merged.length-1];
    if (last && last.层===c.层 && last.靠边===c.靠边 && Math.abs((last.起||last.x)-(c.x||c.y)) <= CELL*MIL*1.5) { last.止 = c.x||c.y; }
    else merged.push({ 层:c.层, 靠边:c.靠边, 起:c.x||c.y, 止:c.x||c.y });
  }
  console.log('✅ 找到 ' + merged.length + ' 段可行区间:');
  for (const m of merged.slice(0,20))
    console.log('   ' + m.层 + ' ' + m.靠边 + '边  ' + m.起 + ' ~ ' + m.止 + ' mm');
}
