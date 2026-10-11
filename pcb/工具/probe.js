const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 2500)); comps = await eda.pcb_PrimitiveComponent.getAll(); if (comps && comps.length) break; }
const out = {};
for (const d of ['J1', 'SW1', 'EC1', 'CARD1']) {
  const c = comps.find(z => z.designator === d);
  if (!c) { out[d] = '无'; continue; }
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  out[d] = { x: Math.round(c.x), y: Math.round(c.y), L: c.layer,
    pins: pins.map(p => ({ n: p.n ?? p.padNumber, x: Math.round(p.x), y: Math.round(p.y),
      l: p.layer, pad: p.pad, hole: p.hole, padType: p.padType })) };
}
// 槽/孔类图元
for (const api of ['pcb_PrimitiveHole', 'pcb_PrimitiveSlot', 'pcb_PrimitiveRegion', 'pcb_PrimitiveKeepout', 'pcb_PrimitiveBoardOutline']) {
  try {
    const g = await eda[api].getAll();
    if (g && g.length) out[api] = g.map(o => ({ id: o.primitiveId, layer: o.layer, x: Math.round(o.x ?? 0), y: Math.round(o.y ?? 0), w: o.width, h: o.height, keys: Object.keys(o) }));
  } catch (e) { }
}
return out;
