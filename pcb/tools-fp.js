const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,3500));
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const want = ['J4','J3','SW1','SW5','D1','U3','U4'];
const out = {};
for (const d of want) {
  const c = comps.find(x => x.designator === d);
  if (c) out[d] = { 器件: (c.component.uuid && c.component.uuid.name) || c.component.name,
                    封装: c.footprint && c.footprint.name, 立创: c.supplierId };
}
return out;
