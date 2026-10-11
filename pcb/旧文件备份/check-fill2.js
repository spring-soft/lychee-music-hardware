const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const pours = await eda.pcb_PrimitivePour.getAll() || [];
const poured = await eda.pcb_PrimitivePoured.getAll() || [];
return {
  铺铜边框数: pours.length,
  填入结果数: poured.length,
  各铺铜: pours.map(x => ({ net:x.net, layer:x.layer, name:x.pourName })),
  填充块: poured.map(x => ({ 区域数: Array.isArray(x.pourFills)?x.pourFills.length:0 })),
  走线: (await eda.pcb_PrimitiveLine.getAll()||[]).length,
  过孔: (await eda.pcb_PrimitiveVia.getAll()||[]).length,
};
