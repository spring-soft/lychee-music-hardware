const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,4000));
const lines = await eda.pcb_PrimitiveLine.getAll()||[];
const vias  = await eda.pcb_PrimitiveVia.getAll()||[];
const byNet={}; for(const l of lines) byNet[l.net]=(byNet[l.net]||0)+1;
const vByNet={}; for(const v of vias) vByNet[v.net]=(vByNet[v.net]||0)+1;
return { 走线: lines.length, 过孔: vias.length,
  走线按网络: byNet, 过孔按网络: vByNet,
  铺铜: (await eda.pcb_PrimitivePour.getAll()||[]).length,
  填充: (await eda.pcb_PrimitivePoured.getAll()||[]).length,
  元件: (await eda.pcb_PrimitiveComponent.getAll()||[]).length };
