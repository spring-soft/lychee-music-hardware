const PCB1 = '197f3e3cc67e949b';
// 先切到别的文档，再切回来，强制重新加载
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const other = p.find(x => x.uuid !== PCB1);
if (other) { await eda.dmt_EditorControl.openDocument(other.uuid); await new Promise(r=>setTimeout(r,2500)); }
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,4000));
const t = p.find(x=>x.uuid===PCB1);
return { 目标: t.name,
  走线: (await eda.pcb_PrimitiveLine.getAll()||[]).length,
  过孔: (await eda.pcb_PrimitiveVia.getAll()||[]).length,
  铺铜: (await eda.pcb_PrimitivePour.getAll()||[]).length,
  填充: (await eda.pcb_PrimitivePoured.getAll()||[]).length,
  元件: (await eda.pcb_PrimitiveComponent.getAll()||[]).length };
