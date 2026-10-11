const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3500));
const pours = await eda.pcb_PrimitivePour.getAll()||[];
const poured = await eda.pcb_PrimitivePoured.getAll()||[];
return { 铺铜边框: pours.length, 填充结果: poured.length,
  走线: (await eda.pcb_PrimitiveLine.getAll()||[]).length,
  过孔: (await eda.pcb_PrimitiveVia.getAll()||[]).length,
  元件: (await eda.pcb_PrimitiveComponent.getAll()||[]).length };
