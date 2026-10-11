const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const all = await eda.pcb_PrimitiveComponent.getAll() || [];
const out = {};
for (const d of ['EC1','SW4','C26']) {
  const c = all.find(x=>x.designator===d);
  out[d] = { x:c.x, y:c.y, rot:c.rotation, layer:c.layer,
             footprint: c.footprint?.name,
             model3D: c.model3D?.name,
             transform: c.otherProperty?.['3D Model Transform'],
             model3DTitle: c.otherProperty?.['3D Model Title'] };
}
return out;
