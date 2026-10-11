const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,4000));
const c = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'C15');
await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: 1560, y: 1330 });
await new Promise(r=>setTimeout(r,800));
const c2 = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'C15');
return { before: { x: c.x, y: c.y }, after: { x: c2.x, y: c2.y } };
