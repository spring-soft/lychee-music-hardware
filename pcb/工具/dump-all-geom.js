const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3500));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
return {
  routing: { lines: lines.map(l=>({id:l.primitiveId,net:l.net,layer:l.layer,x1:l.startX,y1:l.startY,x2:l.endX,y2:l.endY,w:l.lineWidth})),
             vias: vias.map(v=>({id:v.primitiveId,net:v.net,x:v.x,y:v.y,d:v.diameter,hole:v.holeDiameter})) },
};
