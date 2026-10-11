const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,4000));
const pours = await eda.pcb_PrimitivePour.getAll()||[];
const poured = await eda.pcb_PrimitivePoured.getAll()||[];
return {
  铜层数: await eda.pcb_Layer.getTheNumberOfCopperLayers(),
  走线: (await eda.pcb_PrimitiveLine.getAll()||[]).length,
  过孔: (await eda.pcb_PrimitiveVia.getAll()||[]).length,
  元件: (await eda.pcb_PrimitiveComponent.getAll()||[]).length,
  铺铜: pours.map(x=>({net:x.net, layer:x.layer, name:x.pourName})),
  填充块数: poured.length,
  填充详情: poured.map(x=>({
    对应铺铜: (pours.find(y=>y.primitiveId===x.pourPrimitiveId)||{}).layer,
   })),
};
