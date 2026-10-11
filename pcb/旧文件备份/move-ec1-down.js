const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,4000));
const c = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'EC1');
await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y: 195 });
await new Promise(r=>setTimeout(r,800));
const c2 = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'EC1');
return { 改前: { x: c.x, y: c.y }, 改后: { x: c2.x, y: c2.y } };
