const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 2500)); comps = await eda.pcb_PrimitiveComponent.getAll(); if (comps && comps.length) break; }
const want = ['U3','U1','R6','R17','R1','R2','C2','R4','R5','C26','C27','C23','C24','C25','C21','C22','R15','R16','C15','C16'];
const out = {};
for (const d of want) {
  const c = comps.find(z => z.designator === d);
  if (!c) { out[d] = '无'; continue; }
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  out[d] = pins.map(p => (p.n ?? p.padNumber) + '=' + (p.net || '空')).join('  ');
}
return out;
