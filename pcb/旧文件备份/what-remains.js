const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const byNetV = {}; for (const v of vias) byNetV[v.net]=(byNetV[v.net]||0)+1;
return {
  剩余走线: lines.map(l => ({ net:l.net, layer:l.layer,
    from: Math.round(l.startX)+','+Math.round(l.startY),
    to: Math.round(l.endX)+','+Math.round(l.endY), w:+l.lineWidth.toFixed(1) })),
  剩余过孔按网络: byNetV,
  文档信息: await eda.dmt_Pcb.getAllPcbsInfo(),
};
