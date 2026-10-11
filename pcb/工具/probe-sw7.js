const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 2500)); comps = await eda.pcb_PrimitiveComponent.getAll(); if (comps && comps.length) break; }
const out = {};
for (const d of ['SW7', 'SW5', 'SW6', 'U4', 'D1', 'D2', 'D3', 'Q1', 'L1', 'J4', 'J1', 'R18', 'R19', 'R20', 'R17', 'R6']) {
  const c = comps.find(z => z.designator === d);
  if (!c) { out[d] = '无'; continue; }
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  out[d] = pins.map(p => (p.n ?? p.padNumber) + '=' + (p.net || '(空)'));
}
return out;
