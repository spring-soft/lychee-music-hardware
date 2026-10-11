#!/usr/bin/env node
/**
 * 自研 PCB 布线器（A* + 过孔换层）
 *
 * 为什么自己写：嘉立创 EDA 的 autoRouting API 调用后永不返回（挂死）；
 * 外部 Freerouting 需要 Java（本机没装）；DSN 导出是坏的（所有元件坐标都被写成 0）。
 *
 * 坐标系：单位 mil，y 向上（与 EDA 数据一致）。
 * 布线层：1=顶层，2=底层。内层 15/16 保留给地平面。
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);

// ─── 参数 ────────────────────────────────────────────────────────────
const GRID   = 5;                       // 栅格 mil
const BOARD  = { l: 0, r: 2283, b: 0, t: 1969 };
const EDGE   = 8;                       // 铜到板边最小距离
const CLR    = 8;                       // 最小间距
const H_NARROW = 5;                     // 普通线半宽 (10mil)
const H_WIDE   = 15;                    // 电源线半宽 (30mil)
const VIA_R    = 12;                    // 过孔半径 (24mil 外径)
const VIA_COST = 40;                    // 换层代价（等效栅格步数）
const MAX_ESC  = 16;                    // 焊盘逃逸搜索半径（栅格）

const W = Math.floor(BOARD.r / GRID) + 1;
const H = Math.floor(BOARD.t / GRID) + 1;
const NC = W * H;
const idx = (ix, iy) => iy * W + ix;
const inB = (ix, iy) => ix >= 0 && ix < W && iy >= 0 && iy < H;

const B_NARROW = 1, B_WIDE = 2, B_VIA = 4;

// ─── 元件本体尺寸（mil，已按实物核对）─────────────────────────────────
const BODY = {
  U1:{w:709,h:1004,anchor:'bottom'}, U2:{w:165,h:165}, U3:{w:118,h:118}, Q1:{w:118,h:118},
  U4:{w:197,h:236}, L1:{w:157,h:157},
  J1:{w:380,h:340}, J2:{w:559,h:244}, J3:{w:402,h:110}, J4:{w:120,h:150},
  SW1:{w:236,h:236}, SW2:{w:236,h:236}, SW3:{w:236,h:236}, SW4:{w:236,h:236},
  SW5:{w:197,h:114}, SW6:{w:197,h:114}, SW7:{w:236,h:236},
  C15:{w:150,h:115}, C16:{w:150,h:115}, EC1:{w:311,h:154},
};

const WIDE_NETS = new Set(['VBUS','+5V','BAT+','SW_NODE']);
const SKIP_NETS = new Set(['GND','VCC']);      // GND/VCC 走铺铜

// ─── 读入几何 ────────────────────────────────────────────────────────
const rawPads = JSON.parse(fs.readFileSync(HERE('./数据/padshape.raw.json'), 'utf8')).all;
const comps   = JSON.parse(fs.readFileSync(HERE('./数据/geom.raw.json'), 'utf8')).comps;

const pads = [];
for (const p of rawPads) {
  if (p.x === undefined || !p.net) continue;
  const sh = p.pad || [];
  let w = 0, h = 0, rot = 0;
  if (sh[0] === 'RECT' || sh[0] === 'OVAL' || sh[0] === 'ELLIPSE') {
    w = sh[1]; h = sh[2]; rot = sh[3] ?? 0;
  } else if (sh[0] === 'POLYGON' && Array.isArray(sh[1])) {
    const xs = sh[1].map(q => q[0]), ys = sh[1].map(q => q[1]);
    w = Math.max(...xs) - Math.min(...xs);
    h = Math.max(...ys) - Math.min(...ys);
  }
  if (!w || !h) { w = 32; h = 32; }
  if (Math.abs(rot % 180) === 90) { const t = w; w = h; h = t; }
  const layers = p.l === 12 ? [1, 2] : [p.l];
  pads.push({ comp: p.comp, n: p.n, x: p.x, y: p.y, net: p.net, w, h, layers });
}

const nets = new Map();
for (const p of pads) {
  if (SKIP_NETS.has(p.net)) continue;
  if (!nets.has(p.net)) nets.set(p.net, []);
  nets.get(p.net).push(p);
}

// ─── 元件本体阻挡盒 ──────────────────────────────────────────────────
const compInfo = new Map(comps.map(c => [c.d, c]));
const compBox = [];
for (const [d, B] of Object.entries(BODY)) {
  const c = compInfo.get(d);
  if (!c) continue;
  const rot = (c.rot % 180) !== 0;
  const bw = rot ? B.h : B.w, bh = rot ? B.w : B.h;
  let l, r, b, t;
  if (B.anchor === 'bottom' && !rot) {
    const ys = pads.filter(p => p.comp === d).map(p => p.y);
    b = Math.min(...ys); t = b + bh;
    l = c.x - bw / 2; r = c.x + bw / 2;
  } else {
    l = c.x - bw / 2; r = c.x + bw / 2;
    b = c.y - bh / 2; t = c.y + bh / 2;
  }
  compBox.push({ d, l, r, b, t, layer: c.l });
}

// 天线禁布区（所有层，含板上方悬出部分）
const ANTENNA = { l: 15, r: 765, b: 1898, t: 1969 };

// ─── 阻挡图 ──────────────────────────────────────────────────────────
function markRect(blk, layerIdx, l, r, b, t, dil, flag) {
  const ix0 = Math.max(0, Math.floor((l - dil) / GRID));
  const ix1 = Math.min(W - 1, Math.ceil((r + dil) / GRID));
  const iy0 = Math.max(0, Math.floor((b - dil) / GRID));
  const iy1 = Math.min(H - 1, Math.ceil((t + dil) / GRID));
  for (let iy = iy0; iy <= iy1; iy++) {
    const base = layerIdx * NC + iy * W;
    for (let ix = ix0; ix <= ix1; ix++) blk[base + ix] |= flag;
  }
}

/** 预计算板边禁布掩码（所有层通用） */
const edgeMask = new Uint8Array(NC);
for (let iy = 0; iy < H; iy++) for (let ix = 0; ix < W; ix++) {
  const x = ix * GRID, y = iy * GRID;
  if (x < EDGE || x > BOARD.r - EDGE || y < EDGE || y > BOARD.t - EDGE)
    edgeMask[idx(ix, iy)] = B_NARROW | B_WIDE | B_VIA;
}

/**
 * 建阻挡图。hTrace = 本网络线半宽。
 * 阻挡膨胀量 = 本网络半宽 + 障碍物铜半宽 + 间距。
 */
function buildBlock(ownPads, hTrace, routed) {
  const blk = new Uint8Array(NC * 2);
  blk.set(edgeMask, 0); blk.set(edgeMask, NC);

  /** 盖一个「铜」矩形，hO = 其自身铜半宽 */
  const stampCopper = (l, r, b, t, layerIdx, hO) => {
    markRect(blk, layerIdx, l, r, b, t, hTrace + hO + CLR,       B_NARROW);
    markRect(blk, layerIdx, l, r, b, t, H_WIDE + hO + CLR,       B_WIDE);
    markRect(blk, layerIdx, l, r, b, t, VIA_R  + hO + CLR,       B_VIA);
  };

  for (const p of pads) {
    const key = p.comp + '.' + p.n + '@' + Math.round(p.x) + ',' + Math.round(p.y);
    if (ownPads.has(key)) continue;
    for (const L of p.layers)
      stampCopper(p.x - p.w/2, p.x + p.w/2, p.y - p.h/2, p.y + p.h/2, L - 1, 0);
  }

  // 元件本体：无铜，但仍需留出间距，额外加 6mil 余量
  for (const c of compBox) {
    markRect(blk, c.layer - 1, c.l, c.r, c.b, c.t, hTrace + CLR + 6, B_NARROW);
    markRect(blk, c.layer - 1, c.l, c.r, c.b, c.t, H_WIDE + CLR + 6, B_WIDE);
    markRect(blk, c.layer - 1, c.l, c.r, c.b, c.t, VIA_R  + CLR + 6, B_VIA);
  }

  for (const li of [0, 1]) {
    markRect(blk, li, ANTENNA.l, ANTENNA.r, ANTENNA.b, ANTENNA.t, 0, B_NARROW | B_WIDE);
    markRect(blk, li, ANTENNA.l, ANTENNA.r, ANTENNA.b, ANTENNA.t, VIA_R + CLR, B_VIA);
  }

  for (const s of routed) {
    if (s.type === 'line') {
      const hO = s.h;
      const li = s.layer - 1;
      const l = Math.min(s.x1, s.x2), r = Math.max(s.x1, s.x2);
      // 线段宽度算进边界
      const b = Math.min(s.y1, s.y2) - hO, t = Math.max(s.y1, s.y2) + hO;
      markRect(blk, li, l - hO, r + hO, b, t, hTrace + hO + CLR, B_NARROW);
      markRect(blk, li, l - hO, r + hO, b, t, H_WIDE + hO + CLR, B_WIDE);
      markRect(blk, li, l - hO, r + hO, b, t, VIA_R  + hO + CLR, B_VIA);
    } else if (s.type === 'via') {
      for (const li of [0, 1]) {
        markRect(blk, li, s.x - VIA_R, s.x + VIA_R, s.y - VIA_R, s.y + VIA_R,
                 hTrace + VIA_R + CLR, B_NARROW);
        markRect(blk, li, s.x - VIA_R, s.x + VIA_R, s.y - VIA_R, s.y + VIA_R,
                 H_WIDE + VIA_R + CLR, B_WIDE);
        markRect(blk, li, s.x - VIA_R, s.x + VIA_R, s.y - VIA_R, s.y + VIA_R,
                 VIA_R + VIA_R + CLR, B_VIA);
      }
    }
  }
  return blk;
}

// ─── 逃逸点 ──────────────────────────────────────────────────────────
function escapeCells(p, blk, flag) {
  const gx0 = Math.round(p.x / GRID), gy0 = Math.round(p.y / GRID);
  const rx = Math.ceil(p.w / 2 / GRID) + 1, ry = Math.ceil(p.h / 2 / GRID) + 1;
  for (let r = 0; r <= MAX_ESC; r++) {
    const out = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const ix = gx0 + dx, iy = gy0 + dy;
      if (!inB(ix, iy)) continue;
      const near = Math.abs(dx) <= rx && Math.abs(dy) <= ry;   // 焊盘自身范围内无条件放行
      for (const L of p.layers) {
        if (near || !(blk[(L - 1) * NC + idx(ix, iy)] & flag))
          out.push({ ix, iy, L });
      }
    }
    if (out.length) return out;
  }
  return [];
}

// ─── A* ──────────────────────────────────────────────────────────────
function astar(blk, starts, goals, hTrace) {
  const flag = hTrace > H_NARROW ? B_WIDE : B_NARROW;
  const N = NC * 2;
  const g = new Float64Array(N).fill(Infinity);
  const from = new Int32Array(N).fill(-1);
  const seen = new Uint8Array(N);
  const goalHits = new Uint8Array(N);
  for (const o of goals) goalHits[(o.L - 1) * NC + idx(o.ix, o.iy)] = 1;

  let gl = Infinity, gr = -Infinity, gb = Infinity, gt = -Infinity;
  for (const o of goals) {
    gl = Math.min(gl, o.ix); gr = Math.max(gr, o.ix);
    gb = Math.min(gb, o.iy); gt = Math.max(gt, o.iy);
  }
  const hcost = (ix, iy) => {
    const dx = ix < gl ? gl - ix : ix > gr ? ix - gr : 0;
    const dy = iy < gb ? gb - iy : iy > gt ? gt - iy : 0;
    return dx + dy;
  };

  const heap = [];
  const push = (n, f) => {
    heap.push([f, n]);
    let i = heap.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (heap[par][0] <= heap[i][0]) break;
      const t = heap[par]; heap[par] = heap[i]; heap[i] = t; i = par;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r2 = l + 1; let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r2 < heap.length && heap[r2][0] < heap[m][0]) m = r2;
        if (m === i) break;
        const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m;
      }
    }
    return top;
  };

  for (const s of starts) {
    const n = (s.L - 1) * NC + idx(s.ix, s.iy);
    if (g[n] > 0) { g[n] = 0; push(n, hcost(s.ix, s.iy)); }
  }

  const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
  let found = -1;
  while (heap.length) {
    const cur = pop()[1];
    if (seen[cur]) continue;
    seen[cur] = 1;
    if (goalHits[cur]) { found = cur; break; }
    const li = cur >= NC ? 1 : 0;
    const rest = cur - li * NC;
    const ix = rest % W, iy = (rest / W) | 0;
    const gcur = g[cur];

    for (const [dx, dy] of DIRS) {
      const nx = ix + dx, ny = iy + dy;
      if (!inB(nx, ny)) continue;
      const ni = li * NC + idx(nx, ny);
      if (blk[ni] & flag) continue;
      const ng = gcur + 1;
      if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; push(ni, ng + hcost(nx, ny)); }
    }
    const other = (1 - li) * NC + rest;
    if (!(blk[cur] & B_VIA) && !(blk[other] & B_VIA) && !(blk[other] & flag)) {
      const ng = gcur + VIA_COST;
      if (ng < g[other]) { g[other] = ng; from[other] = cur; push(other, ng + hcost(ix, iy)); }
    }
  }
  if (found < 0) return null;
  const path = [];
  for (let n = found; n >= 0; n = from[n]) {
    const li = n >= NC ? 1 : 0, rest = n - li * NC;
    path.push({ ix: rest % W, iy: (rest / W) | 0, L: li + 1 });
  }
  return path.reverse();
}

// ─── 路径 → 线段 + 过孔 ───────────────────────────────────────────────
function pathToSegs(path, hTrace) {
  const segs = [];
  let i = 0;
  while (i < path.length - 1) {
    const a = path[i], b = path[i + 1];
    if (a.L !== b.L) {
      segs.push({ type:'via', x: a.ix * GRID, y: a.iy * GRID });
      i++; continue;
    }
    const dx = b.ix - a.ix, dy = b.iy - a.iy;
    let j = i + 1;
    while (j + 1 < path.length && path[j + 1].L === a.L) {
      const ndx = path[j + 1].ix - path[j].ix, ndy = path[j + 1].iy - path[j].iy;
      if (ndx !== dx || ndy !== dy) break;
      j++;
    }
    const e = path[j];
    segs.push({ type:'line', layer: a.L, h: hTrace,
                x1: a.ix * GRID, y1: a.iy * GRID, x2: e.ix * GRID, y2: e.iy * GRID });
    i = j;
  }
  return segs;
}

// ─── 网络顺序 ────────────────────────────────────────────────────────
const PRIORITY = [
  'USB_DP','USB_DN',
  'I2S_MCLK','I2S_BCLK','I2S_LRCK','I2S_DOUT',
  'I2C_SDA','I2C_SCL',
  'LOUT1','ROUT1','HP_L','HP_R','VREF','VMID','AVDD','HPVDD',
  'SW_NODE','BAT+','VBUS','+5V',
];

function mstEdges(plist) {
  const n = plist.length;
  if (n < 2) return [];
  const used = new Set([0]), edges = [];
  while (used.size < n) {
    let best = null;
    for (const i of used) for (let j = 0; j < n; j++) {
      if (used.has(j)) continue;
      const d = Math.abs(plist[i].x - plist[j].x) + Math.abs(plist[i].y - plist[j].y);
      if (!best || d < best.d) best = { d, i, j };
    }
    edges.push([plist[best.i], plist[best.j]]);
    used.add(best.j);
  }
  return edges;
}
const netSpan = pl => mstEdges(pl).reduce((s, e) =>
  s + Math.abs(e[0].x - e[1].x) + Math.abs(e[0].y - e[1].y), 0);

const names = [...nets.keys()].sort((a, b) => {
  const pa = PRIORITY.indexOf(a), pb = PRIORITY.indexOf(b);
  if (pa >= 0 && pb >= 0) return pa - pb;
  if (pa >= 0) return -1;
  if (pb >= 0) return 1;
  return netSpan(nets.get(a)) - netSpan(nets.get(b));
});

// ─── 主流程 ──────────────────────────────────────────────────────────
const routed = [];
const result = new Map();
const failed = [];

for (const net of names) {
  const plist = nets.get(net);
  const hTrace = WIDE_NETS.has(net) ? H_WIDE : H_NARROW;
  const flag = hTrace > H_NARROW ? B_WIDE : B_NARROW;
  const ownPads = new Set(plist.map(p => p.comp + '.' + p.n + '@' + Math.round(p.x) + ',' + Math.round(p.y)));
  const edges = mstEdges(plist);
  const segs = [];
  let ok = true;

  for (const [A, B] of edges) {
    const blk = buildBlock(ownPads, hTrace, [...routed, ...segs]);
    const sa = escapeCells(A, blk, flag);
    const sb = escapeCells(B, blk, flag);
    if (!sa.length || !sb.length) { ok = false; break; }
    const p = astar(blk, sa, sb, hTrace);
    if (!p) { ok = false; break; }
    const f = p[0], l = p[p.length - 1];
    segs.push({ type:'line', layer: f.L, h: hTrace, x1: A.x, y1: A.y, x2: f.ix*GRID, y2: f.iy*GRID });
    segs.push(...pathToSegs(p, hTrace));
    segs.push({ type:'line', layer: l.L, h: hTrace, x1: l.ix*GRID, y1: l.iy*GRID, x2: B.x, y2: B.y });
  }

  if (ok) { result.set(net, segs); routed.push(...segs); }
  else failed.push(net);
}

let nl = 0, nv = 0;
for (const s of result.values()) for (const x of s) { if (x.type === 'line') nl++; else nv++; }

fs.writeFileSync(HERE('./数据/routes.json'),
  JSON.stringify({ ok: [...result.keys()], failed, lineCount: nl, viaCount: nv,
                   routes: Object.fromEntries(result) }, null, 1));

console.log('布线完成');
console.log('  成功网络:', result.size, '/', nets.size);
console.log('  失败网络:', failed.length, failed.join(', '));
console.log('  线段:', nl, ' 过孔:', nv);
