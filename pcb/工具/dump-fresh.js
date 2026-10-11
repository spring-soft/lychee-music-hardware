const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) {
  await new Promise(r => setTimeout(r, 2500));
  comps = await eda.pcb_PrimitiveComponent.getAll();
  if (comps && comps.length) break;
}
if (!comps) return { err: '组件读取失败' };

// 板框
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
const outline = pl.filter(x => x.layer === 11).map(x => x.polygon);

const out = { n: comps.length, compKeys: Object.keys(comps[0]), pinKeys: null, comps: [], outline,
              boardRect: null };

// 板框包围盒
let bl = 1e9, br = -1e9, bb = 1e9, bt = -1e9;
for (const o of outline) {
  if (!Array.isArray(o)) continue;
  for (let i = 0; i + 1 < o.length; i += 2) {
    if (typeof o[i] !== 'number') continue;
    bl = Math.min(bl, o[i]); br = Math.max(br, o[i]);
    bb = Math.min(bb, o[i + 1]); bt = Math.max(bt, o[i + 1]);
  }
}
if (br > bl) out.boardRect = { l: Math.round(bl), r: Math.round(br), b: Math.round(bb), t: Math.round(bt) };

for (const c of comps) {
  let pins = [];
  try { pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || []; } catch (e) {}
  if (pins.length && !out.pinKeys) out.pinKeys = Object.keys(pins[0]);
  out.comps.push({
    d: c.designator, x: +c.x.toFixed(1), y: +c.y.toFixed(1), l: c.layer, rot: c.rotation || 0,
    w: c.width, h: c.height, pid: c.primitiveId,
    pins: pins.map(p => ({
      n: p.number ?? p.padNumber ?? p.name,
      x: +(p.x ?? 0).toFixed(1), y: +(p.y ?? 0).toFixed(1), l: p.layer,
      w: p.width, h: p.height, pad: p.pad, hole: p.hole ?? p.holeSize, net: p.net ?? p.netName,
    })),
  });
}
return out;
