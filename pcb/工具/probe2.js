const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 2500)); comps = await eda.pcb_PrimitiveComponent.getAll(); if (comps && comps.length) break; }
const out = {};
const c = comps.find(z => z.designator === 'EC1');
const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
out.EC1 = { x: Math.round(c.x), y: Math.round(c.y), L: c.layer,
  pins: pins.map(p => ({ n: p.n ?? p.padNumber, x: Math.round(p.x), y: Math.round(p.y), l: p.layer,
    pad: Array.isArray(p.pad) ? p.pad.slice(0, 3) : p.pad, hole: p.hole, padType: p.padType })) };
const k = comps.find(z => z.designator === 'CARD1');
out.CARD1 = { x: Math.round(k.x), y: Math.round(k.y), L: k.layer };
// 找所有非元件的图元：孔 / 槽 / region
const found = {};
for (const api of Object.keys(eda).filter(s => /^pcb_Primitive/.test(s))) {
  try {
    const g = await eda[api].getAll();
    if (Array.isArray(g) && g.length) found[api] = g.length;
  } catch (e) {}
}
out.可用图元 = found;
// 在 EC1 附近找 e85e43
for (const api of ['pcb_PrimitiveHole', 'pcb_PrimitiveSlot', 'pcb_PrimitiveRegion', 'pcb_PrimitiveKeepout', 'pcb_PrimitiveFill', 'pcb_PrimitivePour']) {
  try {
    const g = await eda[api].getAll() || [];
    const near = g.filter(o => o.primitiveId === 'e85e43' || (Math.abs((o.x ?? 1e9) - 1810) < 400 && Math.abs((o.y ?? 1e9) - 200) < 500));
    if (near.length) out['附近_' + api] = near.map(o => ({ id: o.primitiveId, layer: o.layer, x: Math.round(o.x ?? 0), y: Math.round(o.y ?? 0), w: o.width, h: o.height }));
  } catch (e) {}
}
return out;
