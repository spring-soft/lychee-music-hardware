// 验证电池净空区：603048 (30×48mm) 范围内是否只剩矮元件
const HEIGHT = {
  U1: 3.2, U2: 0.9, U3: 1.2, U4: 1.8, L1: 2.0, Q1: 1.2,
  J1: 3.3, J2: 5.0, J3: 2.5, J4: 5.5,
  SW1: 5.0, SW2: 5.0, SW3: 5.0, SW4: 5.0, SW5: 5.0, SW6: 5.0, SW7: 5.0,
  C15: 2.2, C16: 2.2,
};
const DEF_H = 0.6;
const BODY = {
  U1:[709,1004], U2:[165,165], U3:[118,118], Q1:[118,118], U4:[197,236], L1:[157,157],
  J1:[380,340], J2:[559,244], J3:[402,110], J4:[120,150],
  SW1:[236,236], SW2:[236,236], SW3:[236,236], SW4:[236,236],
  SW5:[197,114], SW6:[197,114], SW7:[236,236],
  C15:[150,115], C16:[150,115],
};
const BAT = { l: 800, r: 1981, b: 60, t: 1950 };   // 603048 30×48mm

const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const inside = [];
for (const c of comps) {
  if (c.layer !== 2) continue;
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
  const ov = Math.min(box.r, BAT.r) - Math.max(box.l, BAT.l) > 0 &&
             Math.min(box.t, BAT.t) - Math.max(box.b, BAT.b) > 0;
  if (ov) inside.push({ des: c.designator, h: HEIGHT[c.designator] !== undefined ? HEIGHT[c.designator] : DEF_H });
}

const tall = inside.filter(x => x.h > 2.5);
const outside = comps.filter(c => c.layer === 2 && !inside.some(i => i.des === c.designator))
                     .map(c => c.designator).sort();

return {
  batteryZone: 'x 800..1981, y 60..1950  (603048: 30 x 48 mm)',
  insideCount: inside.length,
  outsideCount: outside.length,
  tallInside: tall,
  tallestInside: inside.length ? Math.max(...inside.map(x => x.h)) : 0,
  outsideList: outside,
  verdict: tall.length === 0
    ? 'OK - 区内全是矮元件，可压在电池下（垫 3mm 泡棉）'
    : 'FAIL - 有元件高于 2.5mm，需加厚泡棉',
};
