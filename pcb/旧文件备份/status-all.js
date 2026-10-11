const p = await eda.dmt_Pcb.getAllPcbsInfo();
const out = [];
for (const info of p) {
  await eda.dmt_EditorControl.openDocument(info.uuid);
  await new Promise(r=>setTimeout(r,2500));
  out.push({ name: info.name, board: info.parentBoardName,
    走线: (await eda.pcb_PrimitiveLine.getAll()||[]).length,
    过孔: (await eda.pcb_PrimitiveVia.getAll()||[]).length,
    铺铜: (await eda.pcb_PrimitivePour.getAll()||[]).length,
    填充: (await eda.pcb_PrimitivePoured.getAll()||[]).length,
    元件: (await eda.pcb_PrimitiveComponent.getAll()||[]).length,
    其它图元: { 区域:(await eda.pcb_PrimitiveRegion.getAll()||[]).length,
                填充块:(await eda.pcb_PrimitiveFill.getAll()||[]).length,
                折线:(await eda.pcb_PrimitivePolyline.getAll()||[]).length,
                文字:(await eda.pcb_PrimitiveString.getAll()||[]).length } });
}
return out;
