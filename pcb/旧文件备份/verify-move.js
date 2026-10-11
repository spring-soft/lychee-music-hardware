const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = {};
let comps = await eda.pcb_PrimitiveComponent.getAll() || [];
for (const d of ['C15','C16','R17','J2','EC1']) {
  const c = comps.find(x => x.designator === d);
  out[d] = c ? { x: c.x, y: c.y, rot: c.rotation, layer: c.layer } : 'not found';
}
const c15 = comps.find(x => x.designator === 'C15');
if (c15) {
  const r = await eda.pcb_PrimitiveComponent.modify(c15.primitiveId, { y: 1340 });
  await new Promise(res=>setTimeout(res,800));
  comps = await eda.pcb_PrimitiveComponent.getAll() || [];
  const after = comps.find(x => x.designator === 'C15');
  out.modifyReturn = r === undefined ? 'undefined' : JSON.stringify(r);
  out.afterRead = after ? { x: after.x, y: after.y } : null;
}
return out;
