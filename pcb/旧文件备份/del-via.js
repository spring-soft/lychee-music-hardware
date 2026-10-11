const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const target = '2e1ca221d71586e6';
const vias = await eda.pcb_PrimitiveVia.getAll() || [];
const hit = vias.find(v => v.primitiveId === target);
let deleted = false;
if (hit) { await eda.pcb_PrimitiveVia.delete([target]); deleted = true; }
await new Promise(r=>setTimeout(r,2000));
return { 找到并删除: deleted, 该孔位置: hit ? {x:Math.round(hit.x), y:Math.round(hit.y), net:hit.net} : null,
         剩余过孔: (await eda.pcb_PrimitiveVia.getAll()||[]).length };
