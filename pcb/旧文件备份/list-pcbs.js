const infos = await eda.dmt_Pcb.getAllPcbsInfo();
const out = [];
for (const info of infos) {
  const rec = { name: info.name, uuid: info.uuid, board: info.parentBoardName };
  try {
    await eda.dmt_EditorControl.openDocument(info.uuid);
    await new Promise(r=>setTimeout(r,2500));
    rec.走线 = (await eda.pcb_PrimitiveLine.getAll()||[]).length;
    rec.过孔 = (await eda.pcb_PrimitiveVia.getAll()||[]).length;
    rec.元件 = (await eda.pcb_PrimitiveComponent.getAll()||[]).length;
    rec.铺铜 = (await eda.pcb_PrimitivePour.getAll()||[]).length;
    rec.填充 = (await eda.pcb_PrimitivePoured.getAll()||[]).length;
  } catch(e) { rec.err = e.message.slice(0,60); }
  out.push(rec);
}
return { 总数: infos.length, 各PCB: out };
