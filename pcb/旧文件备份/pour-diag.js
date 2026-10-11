const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = {};
const pours = await eda.pcb_PrimitivePour.getAll() || [];
out.pourKeys = pours[0] ? Object.keys(pours[0]) : null;
out.pours = pours.map(x => {
  const o = { net:x.net, layer:x.layer, id:x.primitiveId };
  try { const b = x.getBoundingBox?.(); o.bbox = b; } catch(e){}
  o.data = JSON.stringify(x).slice(0, 400);
  return o;
});
out.counts = {
  lines: (await eda.pcb_PrimitiveLine.getAll()||[]).length,
  vias: (await eda.pcb_PrimitiveVia.getAll()||[]).length,
  polylines: (await eda.pcb_PrimitivePolyline.getAll()||[]).length,
  regions: (await eda.pcb_PrimitiveRegion.getAll()||[]).length,
  fills: (await eda.pcb_PrimitiveFill.getAll()||[]).length,
};
// 板框
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
out.polylineInfo = pl.map(x => ({ layer:x.layer, keys:Object.keys(x), poly: JSON.stringify(x.polyline||x.points||[]).slice(0,200) }));
return out;
