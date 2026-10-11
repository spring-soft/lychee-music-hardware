// 计算编码器 EC1 周边元件的实际间隙
const BODY = {
  U1:[709,1004], U2:[165,165], U3:[118,118], Q1:[118,118], U4:[197,236], L1:[157,157],
  J1:[380,340], J2:[559,244], J3:[402,110], J4:[120,150],
  SW1:[236,236], SW2:[236,236], SW3:[236,236], SW4:[236,236],
  SW5:[197,114], SW6:[197,114], SW7:[236,236],
  C15:[150,115], C16:[150,115], EC1:[311,154],
};

const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
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
    const rot = (c.rotation % 180) !== 0;
    const bw = rot ? B[1] : B[0], bh = rot ? B[0] : B[1];
    box = { l: c.x - bw/2, r: c.x + bw/2, b: c.y - bh/2, t: c.y + bh/2 };
  } else {
    const horiz = (pr - pl) >= (pt - pb);
    const L = 63, S = 31;
    box = horiz
      ? { l:(pl+pr)/2-L/2, r:(pl+pr)/2+L/2, b:(pb+pt)/2-S/2, t:(pb+pt)/2+S/2 }
      : { l:(pl+pr)/2-S/2, r:(pl+pr)/2+S/2, b:(pb+pt)/2-L/2, t:(pb+pt)/2+L/2 };
  }
  box.des = c.designator;
  box.layer = c.layer;
  boxes.push(box);
}

const ec = boxes.find(b => b.des === 'EC1');
if (!ec) return { error: 'EC1 not found' };

const near = boxes
  .filter(b => b.des !== 'EC1' && b.layer === ec.layer)
  .map(b => {
    const gapX = Math.max(b.l - ec.r, ec.l - b.r);   // >0 表示 x 方向分离
    const gapY = Math.max(b.b - ec.t, ec.b - b.t);
    const gap = Math.max(gapX, gapY);
    return { des: b.des, gapMil: Math.round(gap), gapMM: (gap * 0.0254).toFixed(2) };
  })
  .filter(x => x.gapMil < 300)
  .sort((a, b) => a.gapMil - b.gapMil);

return {
  ecBox: { l: Math.round(ec.l), r: Math.round(ec.r), b: Math.round(ec.b), t: Math.round(ec.t) },
  ecSizeMM: ((ec.r-ec.l)*0.0254).toFixed(1) + ' x ' + ((ec.t-ec.b)*0.0254).toFixed(1),
  neighborsWithin300: near,
  tooClose: near.filter(x => x.gapMil < 120).map(x => x.des + '(' + x.gapMM + 'mm)'),
};
