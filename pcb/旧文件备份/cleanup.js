const PCB1 = '197f3e3cc67e949b';   // 显式锁定 Board1 的 PCB1
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const target = p.find(x => x.uuid === PCB1) || p[0];
await eda.dmt_EditorControl.openDocument(target.uuid);
await new Promise(r=>setTimeout(r,3500));
const log = { 目标: target.name + ' / ' + target.uuid };
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
if (lines.length) { await eda.pcb_PrimitiveLine.delete(lines.map(x=>x.primitiveId)); log.删走线 = lines.length; }
await new Promise(r=>setTimeout(r,1800));
const vias = await eda.pcb_PrimitiveVia.getAll() || [];
if (vias.length) { await eda.pcb_PrimitiveVia.delete(vias.map(x=>x.primitiveId)); log.删过孔 = vias.length; }
await new Promise(r=>setTimeout(r,1800));
const pours = await eda.pcb_PrimitivePour.getAll() || [];
if (pours.length) { await eda.pcb_PrimitivePour.delete(pours.map(x=>x.primitiveId)); log.删铺铜 = pours.length; }
await new Promise(r=>setTimeout(r,2500));
log.剩余走线 = (await eda.pcb_PrimitiveLine.getAll()||[]).length;
log.剩余过孔 = (await eda.pcb_PrimitiveVia.getAll()||[]).length;
log.剩余铺铜 = (await eda.pcb_PrimitivePour.getAll()||[]).length;
log.元件数 = (await eda.pcb_PrimitiveComponent.getAll()||[]).length;
return log;
