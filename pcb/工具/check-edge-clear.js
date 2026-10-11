// 检查元件本体到板边的距离（工艺上一般要求 >= 0.5mm，贴片机/分板需要）
const _pcbs = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(_pcbs[0].uuid);
await new Promise(r => setTimeout(r, 3000));

const MIN_CLEAR = 20;   // mil，约 0.5mm
const BODY = {
  U1:[709,1004], U2:[165,165], U3:[118,118], Q1:[118,118], U4:[197,236], L1:[157,157],
  J1:[380,340], J2:[559,244], J3:[402,110], J4:[120,150],
  SW1:[236,236], SW2:[236,236], SW3:[236,236], SW4:[236,236],
  SW5:[197,114], SW6:[197,114], SW7:[236,236],
  C15:[150,115], C16:[150,115], EC1:[311,154],
};
// 边缘连接器按设计允许插口面出界
const EDGE_OK = ['U1','J1','J2'];

const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const B = { l:0, r:2283, b:0, t:1969 };
const rows = [];
for (const c of comps) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId);
  const ps = (pins || []).filter(p => p.x !== undefined);
  if (!ps.length) continue;
  const xs = ps.map(p => p.x), ys = ps.map(p => p.y);
  const pl = Math.min(...xs), pr = Math.max(...xs), pb = Math.min(...ys), pt = Math.max(...ys);
  const BD = BODY[c.designator];
  let box;
  if (BD) {
    const rot = (c.rotation % 180) !== 0;
    const bw = rot ? BD[1] : BD[0], bh = rot ? BD[0] : BD[1];
    box = { l: c.x - bw/2, r: c.x + bw/2, b: c.y - bh/2, t: c.y + bh/2 };
  } else {
    const horiz = (pr - pl) >= (pt - pb);
    const L = 63, S = 31;
    box = horiz
      ? { l:(pl+pr)/2-L/2, r:(pl+pr)/2+L/2, b:(pb+pt)/2-S/2, t:(pb+pt)/2+S/2 }
      : { l:(pl+pr)/2-S/2, r:(pl+pr)/2+S/2, b:(pb+pt)/2-L/2, t:(pb+pt)/2+L/2 };
  }
  const dL = box.l - B.l, dR = B.r - box.r, dB = box.b - B.b, dT = B.t - box.t;
  const minD = Math.min(dL, dR, dB, dT);
  rows.push({
    des: c.designator, layer: c.layer,
    minMil: Math.round(minD),
    minMM: (minD * 0.0254).toFixed(2),
    side: minD === dL ? '左' : minD === dR ? '右' : minD === dB ? '下' : '上',
    exempt: EDGE_OK.includes(c.designator),
  });
}
const risky = rows.filter(r => !r.exempt && r.minMil < MIN_CLEAR).sort((a,b)=>a.minMil-b.minMil);
return {
  threshold: MIN_CLEAR + ' mil (0.5mm)',
  totalComponents: rows.length,
  riskyCount: risky.length,
  risky,
  tightest: rows.filter(r=>!r.exempt).sort((a,b)=>a.minMil-b.minMil).slice(0,8),
};
