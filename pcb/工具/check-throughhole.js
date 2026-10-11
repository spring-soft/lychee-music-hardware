// 直插件引脚 vs 对面元件本体的干涉检查
// 直插件引脚穿过板子后，焊接面会留 ~1.5mm 焊脚；若对面正好有元件本体，就会顶住
//
// 判定方式改为「动态」：焊盘 layer=12(Multi-Layer) 即直插，layer=1/2 即单面贴片。
// 之前手写的 TH_PARTS 清单在 SW5/SW6 改成贴片后忘了同步，导致漏判/误判。
const SOLDER_TAIL = 60;      // 焊脚长度 mil（约 1.5mm）
const MULTI_LAYER = 12;      // 直插焊盘的 layer 值

const BODY = {
  U1:{w:709,h:1004,anchor:'bottom'}, U2:{w:165,h:165}, U3:{w:118,h:118}, Q1:{w:118,h:118},
  U4:{w:197,h:236}, L1:{w:157,h:157},
  J1:{w:380,h:340}, J2:{w:559,h:244}, J3:{w:402,h:110}, J4:{w:120,h:150},
  SW1:{w:236,h:236}, SW2:{w:236,h:236}, SW3:{w:236,h:236}, SW4:{w:236,h:236},
  SW5:{w:197,h:114}, SW6:{w:197,h:114},        // 贴片轻触开关 4.0×2.9mm(跨距5.0)，不是直插的 6×6
  SW7:{w:236,h:236},
  C15:{w:150,h:115}, C16:{w:150,h:115},
};

const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const info = {};
const thParts = new Set();
for (const c of comps) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId);
  const ps = (pins || []).filter(p => p.x !== undefined);
  if (!ps.length) continue;

  // 该元件是否含直插焊盘（layer=12）
  for (const p of ps) if (p.layer === MULTI_LAYER) thParts.add(c.designator);

  const xs = ps.map(p => p.x), ys = ps.map(p => p.y);
  const pl = Math.min(...xs), pr = Math.max(...xs), pb = Math.min(...ys), pt = Math.max(...ys);
  const B = BODY[c.designator];
  let box;
  if (B) {
    const rot = (c.rotation % 180) !== 0;
    const bw = rot ? B.h : B.w, bh = rot ? B.w : B.h;
    box = { l: c.x - bw/2, r: c.x + bw/2, b: c.y - bh/2, t: c.y + bh/2 };
    if (B.anchor === 'bottom' && !rot) box = { l: c.x - bw/2, r: c.x + bw/2, b: pb, t: pb + bh };
  } else {
    const horiz = (pr - pl) >= (pt - pb);
    const L = 63, S = 31;
    box = horiz
      ? { l:(pl+pr)/2-L/2, r:(pl+pr)/2+L/2, b:(pb+pt)/2-S/2, t:(pb+pt)/2+S/2 }
      : { l:(pl+pr)/2-S/2, r:(pl+pr)/2+S/2, b:(pb+pt)/2-L/2, t:(pb+pt)/2+L/2 };
  }
  info[c.designator] = { layer: c.layer, box, pads: ps.map(p => ({ x: p.x, y: p.y, l: p.layer })) };
}

const TH_PARTS = [...thParts].sort();

const clashes = [];
for (const th of TH_PARTS) {
  const src = info[th];
  if (!src) continue;
  const oppLayer = src.layer === 1 ? 2 : 1;
  for (const p of src.pads) {
    if (p.l !== MULTI_LAYER) continue;          // 只检查直插焊脚
    for (const [des, o] of Object.entries(info)) {
      if (des === th || o.layer !== oppLayer) continue;
      const inX = p.x > o.box.l - SOLDER_TAIL && p.x < o.box.r + SOLDER_TAIL;
      const inY = p.y > o.box.b - SOLDER_TAIL && p.y < o.box.t + SOLDER_TAIL;
      if (inX && inY) {
        clashes.push({
          th, thLayer: src.layer === 1 ? '正面' : '背面',
          pad: Math.round(p.x) + ',' + Math.round(p.y),
          hit: des, hitLayer: o.layer === 1 ? '正面' : '背面',
        });
      }
    }
  }
}

// 正/背面直插件本体正面投影是否重叠（两个直插件背靠背）
const thBoxes = TH_PARTS.map(d => info[d] ? { des: d, ...info[d] } : null).filter(Boolean);
const bodyOverlap = [];
for (let i = 0; i < thBoxes.length; i++) for (let j = i + 1; j < thBoxes.length; j++) {
  const a = thBoxes[i], b = thBoxes[j];
  if (a.layer === b.layer) continue;
  const ox = Math.min(a.box.r, b.box.r) - Math.max(a.box.l, b.box.l);
  const oy = Math.min(a.box.t, b.box.t) - Math.max(a.box.b, b.box.b);
  if (ox > 0 && oy > 0) bodyOverlap.push(a.des + '(层' + a.layer + ') ↔ ' + b.des + '(层' + b.layer + ') 正面投影重叠 ' + Math.round(ox) + '×' + Math.round(oy));
}

return {
  直插件清单_自动识别: TH_PARTS,
  焊脚干涉数: clashes.length,
  焊脚干涉明细: clashes,
  正背面直插件本体投影重叠: bodyOverlap,
  结论: (clashes.length === 0 && bodyOverlap.length === 0) ? 'OK - 无干涉' : 'FAIL - 存在干涉',
};
