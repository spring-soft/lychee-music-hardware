#!/usr/bin/env node
/**
 * 计算过孔位置
 *
 * 1) GND 缝合孔：在顶层/底层 GND 铺铜区域里，找与「所有其他网络铜皮」距离
 *    ≥ 过孔半径+间距 的空位，均匀撒点，把上下层地和内层地平面缝合起来
 * 2) VCC 平面接入孔：在 U3(LDO输出)/U1(ESP32)/U2(音频芯片)/J3(屏幕) 的
 *    VCC 焊盘附近找空位打孔，再用一小段短线连过去 —— 让 VCC 平面真正接到
 *    大电流节点上（比只靠自动布线顺手打的那几个孔强得多）
 *
 * 输入：routing.raw.json、padshape.raw.json、geom.raw.json
 * 输出：vias.json
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);

const VIA_D = 24, VIA_HOLE = 12;
const VIA_R = VIA_D / 2;
const CLR   = 8;
const NEED  = VIA_R + CLR;          // 过孔中心到其他网络铜皮的最小距离
const EDGE  = 16;                   // 过孔中心到板边
const BOARD = { l: 0, r: 2283, b: 0, t: 1969 };
const STAIR_STEP = 12;              // 网格步长（mil）
const MIN_GAP_BETWEEN_VIAS = 280;    // 缝合孔之间的最小间距

const routing = JSON.parse(fs.readFileSync(HERE('./数据/routing.raw.json'), 'utf8'));
const rawPads = JSON.parse(fs.readFileSync(HERE('./数据/padshape.raw.json'), 'utf8')).all;
const comps   = JSON.parse(fs.readFileSync(HERE('./数据/geom.raw.json'), 'utf8')).comps;
const compRot = new Map(comps.map(c => [c.d, c.rot || 0]));

// ─── 铜皮障碍 ───
const lines = routing.lines.map(l => ({ net: l.net, layer: l.layer,
  x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, h: l.w / 2 }));
const vias = routing.vias.map(v => ({ net: v.net, x: v.x, y: v.y, rad: v.d / 2 }));

// pcb_PrimitivePad.getAll() 不含元件位号 —— 用 (焊盘号,x,y) 与 pads.raw.json 关联，
// 否则 compRot 永远取到 0，旋转过的元件（如 90° 的 J3）焊盘方向会算错。
const refRows = JSON.parse(fs.readFileSync(HERE('./数据/pads.raw.json'), 'utf8')).rows;
const designatorOf = new Map();
for (const r of refRows) designatorOf.set(r.n + '|' + Math.round(r.x) + '|' + Math.round(r.y), r.d);

const pads = [];
for (const p of rawPads) {
  if (p.x === undefined) continue;
  p.comp = designatorOf.get(p.n + '|' + Math.round(p.x) + '|' + Math.round(p.y));
  const sh = p.pad || [];
  let w = 32, h = 32, prot = 0;
  if (sh[0] === 'RECT' || sh[0] === 'OVAL' || sh[0] === 'ELLIPSE') { w = sh[1]; h = sh[2]; prot = sh[3] ?? 0; }
  else if (sh[0] === 'POLYGON' && Array.isArray(sh[1])) {
    const xs = sh[1].map(q => q[0]), ys = sh[1].map(q => q[1]);
    w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys);
  }
  const rot = ((compRot.get(p.comp) || 0) + prot) % 360;
  if (Math.abs(rot % 180) === 90) { const t = w; w = h; h = t; }
  pads.push({ net: p.net, l: p.x - w/2, r: p.x + w/2, b: p.y - h/2, t: p.y + h/2,
              layers: p.l === 12 ? [1, 2] : [p.l] });
}

// ─── 距离工具 ───
const ptSeg = (p, a, b) => {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  const L2 = dx*dx + dy*dy;
  let t = L2 > 0 ? ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0]-(a[0]+t*dx), p[1]-(a[1]+t*dy));
};
const ptRect = (p, rc) => {
  const dx = Math.max(rc.l - p[0], 0, p[0] - rc.r);
  const dy = Math.max(rc.b - p[1], 0, p[1] - rc.t);
  if (dx > 0 || dy > 0) return Math.hypot(dx, dy);
  return -Math.min(p[0]-rc.l, rc.r-p[0], p[1]-rc.b, rc.t-p[1]);
};

/** 某个点是否够空（对其他网络铜皮） */
function isFree(x, y, ownNet) {
  if (x < BOARD.l+EDGE || x > BOARD.r-EDGE || y < BOARD.b+EDGE || y > BOARD.t-EDGE) return false;
  for (const l of lines) {
    if (l.net === ownNet) continue;
    if (ptSeg([x,y], [l.x1,l.y1], [l.x2,l.y2]) < NEED + l.h) return false;
  }
  for (const p of pads) {
    if (p.net === ownNet) continue;
    if (ptRect([x,y], p) < NEED) return false;
  }
  for (const v of vias) {
    if (v.net === ownNet) continue;
    if (Math.hypot(x-v.x, y-v.y) < NEED + v.rad) return false;
  }
  return true;
}

// ─── 1. GND 缝合孔 ───
const gnd = [];
for (let y = 60; y < BOARD.t - 60; y += STAIR_STEP) {
  for (let x = 60; x < BOARD.r - 60; x += STAIR_STEP) {
    if (!isFree(x, y, 'GND')) continue;
    if (gnd.some(g => Math.hypot(g.x-x, g.y-y) < MIN_GAP_BETWEEN_VIAS)) continue;
    gnd.push({ x, y });
  }
}

// ─── 2. VCC 平面接入孔 ───
const VCC_PADS = [
  ['U3.5',  863, 957], ['U3.1', 863,1043], ['U3.3', 937,1043],
  ['U1.2',  735,1860],
  ['U2.2', 1415,1596], ['U2.3', 1432,1596], ['U2.26',1374,1538],
  ['J3.10', 273, 899], ['J3.11',273, 919],
  ['C12.1',1040,1592], ['C6.1',  950,1592],
];
const vcc = [];
for (const [tag, px, py] of VCC_PADS) {
  let best = null;
  for (let r = 30; r <= 110 && !best; r += 6) {
    for (let a = 0; a < 360; a += 15) {
      const x = Math.round(px + r*Math.cos(a*Math.PI/180));
      const y = Math.round(py + r*Math.sin(a*Math.PI/180));
      if (!isFree(x, y, 'VCC')) continue;
      if (vcc.some(v => Math.hypot(v.x-x, v.y-y) < MIN_GAP_BETWEEN_VIAS)) continue;
      if (gnd.some(g => Math.hypot(g.x-x, g.y-y) < 60)) continue;
      // 焊盘中心 → 过孔的直线必须也是空的
      let ok = true;
      for (let s = 0; s <= 1.0001 && ok; s += 0.1) {
        const mx = px + (x-px)*s, my = py + (y-py)*s;
        for (const l of lines) { if (l.net === 'VCC') continue;
          if (ptSeg([mx,my],[l.x1,l.y1],[l.x2,l.y2]) < l.h + 5) { ok = false; break; } }
        if (!ok) break;
        for (const p2 of pads) { if (p2.net === 'VCC') continue;
          if (ptRect([mx,my], p2) < 5) { ok = false; break; } }
      }
      if (ok) { best = { tag, padX: px, padY: py, x, y, len: Math.round(Math.hypot(x-px, y-py)) }; break; }
    }
  }
  if (best) vcc.push(best);
}

fs.writeFileSync(HERE('./数据/vias.json'), JSON.stringify({ gnd, vcc }, null, 1));
console.log('GND 缝合孔:', gnd.length, '个');
console.log('VCC 接入孔:', vcc.length, '/', VCC_PADS.length, '个');
for (const v of vcc) console.log('  ', v.tag, '→ 孔(' + v.x + ',' + v.y + ')  短线', v.len, 'mil');
const miss = VCC_PADS.filter(([t]) => !vcc.some(v => v.tag === t)).map(([t]) => t);
if (miss.length) console.log('  未找到空位的焊盘:', miss.join(', '));
