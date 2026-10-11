/**
 * 基于【真实焊盘几何】的间距检查
 *
 * 之前几个检查脚本用手写的「元件本体尺寸表」估算，结果编码器/耳机座的焊盘
 * 伸到本体轮廓之外，被漏判（DRC 抓出来 4 处）。本脚本直接用 EDA 导出的
 * 焊盘形状 + 元件旋转角，算出每个焊盘的真实矩形，检查：
 *   1. 不同元件之间的焊盘重叠/过近
 *   2. 焊盘到板边距离
 */
const MIN_PAD_GAP = 6;    // mil，焊盘间最小间隙（对应 DRC 的 6mil 规则）
const MIN_EDGE    = 11.8; // mil，焊盘到板边最小距离

const BOARD = { l: 0, r: 2283, b: 0, t: 1969 };

// ── 读焊盘 ──
const rawPads = JSON.parse(await (async () => {
  const fs = await import('fs');
  return fs.readFileSync('E:/program/esp-music-pcb/padshape.raw.json', 'utf8');
})()).all;
const comps = JSON.parse(await (async () => {
  const fs = await import('fs');
  return fs.readFileSync('E:/program/esp-music-pcb/geom.raw.json', 'utf8');
})()).comps;
const compRot = new Map(comps.map(c => [c.d, c.rot || 0]));
const compLayer = new Map(comps.map(c => [c.d, c.l]));

const pads = [];
for (const p of rawPads) {
  if (p.x === undefined) continue;
  const sh = p.pad || [];
  let w, h, prot = 0;
  if (sh[0] === 'RECT' || sh[0] === 'OVAL' || sh[0] === 'ELLIPSE') { w = sh[1]; h = sh[2]; prot = sh[3] ?? 0; }
  else if (sh[0] === 'POLYGON' && Array.isArray(sh[1])) {
    const xs = sh[1].map(q => q[0]), ys = sh[1].map(q => q[1]);
    w = Math.max(...xs) - Math.min(...xs); h = Math.max(...ys) - Math.min(...ys);
  } else { w = 32; h = 32; }
  const rot = ((compRot.get(p.comp) || 0) + prot) % 360;
  if (Math.abs(rot % 180) === 90) { const t = w; w = h; h = t; }
  const th = p.l === 12;
  const layers = th ? [1, 2] : [p.l];
  pads.push({ comp: p.comp, n: p.n, x: p.x, y: p.y, w, h, layers, th, hole: p.hole });
}

const box = p => ({ l: p.x - p.w/2, r: p.x + p.w/2, b: p.y - p.h/2, t: p.y + p.h/2 });

// ── 1. 焊盘互相靠太近（不同元件、共层）──
const near = [];
for (let i = 0; i < pads.length; i++) for (let j = i + 1; j < pads.length; j++) {
  const A = pads[i], B = pads[j];
  if (A.comp === B.comp) continue;
  if (!A.layers.some(L => B.layers.includes(L))) continue;
  const a = box(A), b = box(B);
  const gx = Math.max(a.l - b.r, b.l - a.r);   // >0 表示 x 方向分离
  const gy = Math.max(a.b - b.t, b.b - a.t);
  // 矩形最近距离：两轴都分离时取斜边，否则取较大的那个负值
  let gap;
  if (gx >= 0 && gy >= 0) gap = Math.hypot(gx, gy);
  else gap = Math.max(gx, gy);
  if (gap < MIN_PAD_GAP) {
    near.push({ a: A.comp+'_'+A.n, b: B.comp+'_'+B.n, gap: +gap.toFixed(1),
                layer: A.layers.filter(L=>B.layers.includes(L)).join('/') });
  }
}
near.sort((x,y) => x.gap - y.gap);

// ── 2. 焊盘到板边 ──
const edge = [];
for (const p of pads) {
  const b = box(p);
  const d = Math.min(b.l - BOARD.l, BOARD.r - b.r, b.b - BOARD.b, BOARD.t - b.t);
  if (d < MIN_EDGE) {
    const side = d === b.l - BOARD.l ? '左' : d === BOARD.r - b.r ? '右' : d === b.b - BOARD.b ? '下' : '上';
    edge.push({ pad: p.comp+'_'+p.n, distMil: +d.toFixed(1), distMM: +(d*0.0254).toFixed(2), side,
                x: Math.round(p.x), y: Math.round(p.y), w: p.w, h: p.h });
  }
}
edge.sort((a,b) => a.distMil - b.distMil);

return {
  参数: { 最小焊盘间隙mil: MIN_PAD_GAP, 最小距板边mil: MIN_EDGE },
  焊盘总数: pads.length,
  焊盘过近数: near.length,
  焊盘过近: near.slice(0, 20),
  距板边不足数: edge.length,
  距板边不足: edge.slice(0, 20),
  结论: (near.length === 0 && edge.length === 0) ? 'OK' : 'FAIL - 需修正',
};
