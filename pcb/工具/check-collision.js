// PCB 碰撞 / 出界 / 屏幕禁布区检查（按层分别判断，本体尺寸方向感知）
const BODY = {
  U1:{w:709,h:1004,anchor:'bottom'},   // ESP32 模组，天线在上方
  U2:{w:165,h:165}, U3:{w:118,h:118}, Q1:{w:118,h:118},
  U4:{w:197,h:236},                    // IP5306 ESOP-8
  L1:{w:157,h:157},                    // 2.2µH 4×4mm
  J1:{w:380,h:340}, J2:{w:559,h:244}, J3:{w:402,h:110},
  J4:{w:120,h:150},                    // 电池座 2P
  SW1:{w:236,h:236}, SW2:{w:236,h:236}, SW3:{w:236,h:236},
  SW4:{w:236,h:236}, SW5:{w:197,h:114}, SW6:{w:197,h:114},   // 贴片轻触开关 4.0×2.9mm(跨距5.0)
  SW7:{w:236,h:236},
  C15:{w:150,h:115}, C16:{w:150,h:115},
  EC1:{w:311,h:154},   // HYCW03 旋转编码器 7.9×3.9mm   // 换成矮钽电容 3.5×2.8mm
};
const PAD063 = { long: 63, short: 31 };
const BOARD = { l: 0, r: 2283, b: 0, t: 1969 };
// 正面屏幕禁布区（屏幕模组 45.83 × 34 mm = 1804 × 1339 mil）
const SCREEN = { l: 100, r: 1904, b: 560, t: 1899, layer: 1 };

const comps = await eda.pcb_PrimitiveComponent.getAll();
const boxes = [];
for (const c of comps) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId);
  const ps = (pins || []).filter(p => p.x !== undefined);
  if (!ps.length) continue;
  const xs = ps.map(p => p.x), ys = ps.map(p => p.y);
  const pl = Math.min(...xs), pr = Math.max(...xs), pb = Math.min(...ys), pt = Math.max(...ys);
  const B = BODY[c.designator];
  let box;
  if (B) {
    const rotated = (c.rotation % 180) !== 0;
    const bw = rotated ? B.h : B.w, bh = rotated ? B.w : B.h;
    box = { l: c.x - bw/2, r: c.x + bw/2, b: c.y - bh/2, t: c.y + bh/2 };
    if (B.anchor === 'bottom' && !rotated) box = { l: c.x - bw/2, r: c.x + bw/2, b: pb, t: pb + bh };
  } else {
    const horiz = (pr - pl) >= (pt - pb);
    const L = PAD063.long, S = PAD063.short;
    box = horiz
      ? { l:(pl+pr)/2-L/2, r:(pl+pr)/2+L/2, b:(pb+pt)/2-S/2, t:(pb+pt)/2+S/2 }
      : { l:(pl+pr)/2-S/2, r:(pl+pr)/2+S/2, b:(pb+pt)/2-L/2, t:(pb+pt)/2+L/2 };
  }
  box.des = c.designator;
  box.layer = c.layer;
  boxes.push(box);
}

// 同层碰撞
const over = [];
for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
  const a = boxes[i], c = boxes[j];
  if (a.layer !== c.layer) continue;
  const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l);
  const oy = Math.min(a.t, c.t) - Math.max(a.b, c.b);
  if (ox > 2 && oy > 2) over.push('[层' + a.layer + '] ' + a.des + '↔' + c.des + ' 重叠 ' + Math.round(ox) + '×' + Math.round(oy));
}

// 出界（U1 天线允许向上出界）
const EDGE_OK = ['U1','J1','J2'];  // U1天线、J1/J2边缘连接器允许插口面出界
const oob = boxes.filter(x => {
  if (EDGE_OK.includes(x.des)) return x.b < BOARD.b - 1;
  return x.l < BOARD.l-1 || x.r > BOARD.r+1 || x.b < BOARD.b-1 || x.t > BOARD.t+1;
}).map(x => x.des + '(层' + x.layer + ')');

// 正面元件是否侵入屏幕禁布区
const inScreen = boxes.filter(x => x.layer === SCREEN.layer &&
  Math.min(x.r, SCREEN.r) - Math.max(x.l, SCREEN.l) > 2 &&
  Math.min(x.t, SCREEN.t) - Math.max(x.b, SCREEN.b) > 2).map(x => x.des);

const front = boxes.filter(b => b.layer === 1).length;
const back  = boxes.filter(b => b.layer === 2).length;
return {
  total: boxes.length, front, back,
  overlapCount: over.length, overlaps: over,
  outOfBoard: oob,
  intrudingScreenKeepout: inScreen,
  bounds: {
    l: Math.round(Math.min(...boxes.map(b=>b.l))), r: Math.round(Math.max(...boxes.map(b=>b.r))),
    b: Math.round(Math.min(...boxes.map(b=>b.b))), t: Math.round(Math.max(...boxes.map(b=>b.t))),
  },
};
