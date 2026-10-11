const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const log = {};
log.重建前_poured = (await eda.pcb_PrimitivePoured.getAll()||[]).length;
const old = await eda.pcb_PrimitivePour.getAll() || [];
if (old.length) { await eda.pcb_PrimitivePour.delete(old.map(x=>x.primitiveId)); log.删除 = old.length; }
await new Promise(r=>setTimeout(r,2500));
const RECT = ['R', 8, 8, 2267, 1877, 0, 0];
const PLAN = [
  { net:'GND', layer:16, name:'GND-内层二' },
  { net:'VCC', layer:15, name:'VCC-内层一' },
  { net:'GND', layer:1,  name:'GND-顶层' },
  { net:'GND', layer:2,  name:'GND-底层' },
];
log.created = [];
for (const pl of PLAN) {
  let r=null, err=null;
  try { r = await eda.pcb_PrimitivePour.create(pl.net, pl.layer,
        eda.pcb_MathPolygon.createPolygon(RECT), 'solid', false, pl.name, 5, 10, false); }
  catch(e){ err = e.message.slice(0,60); }
  log.created.push({ net:pl.net, layer:pl.layer, ok:!!r, err });
  await new Promise(x=>setTimeout(x,2500));
}
await new Promise(x=>setTimeout(x,5000));
log.最终_pour = (await eda.pcb_PrimitivePour.getAll()||[]).length;
log.最终_poured = (await eda.pcb_PrimitivePoured.getAll()||[]).length;
return log;
