const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,3500));
const log = {};
const old = await eda.pcb_PrimitivePour.getAll() || [];
if (old.length) { await eda.pcb_PrimitivePour.delete(old.map(x=>x.primitiveId)); log.删除旧的=old.length;
  await new Promise(r=>setTimeout(r,2000)); }
const PTS = [8, 8, 'L', 2275, 8, 'L', 2275, 1885, 'L', 8, 1885, 'L', 8, 8];
const PLAN = [
  { net:'GND', layer:16, name:'GND-内层二' },
  { net:'VCC', layer:15, name:'VCC-内层一' },
  { net:'GND', layer:1,  name:'GND-顶层' },
  { net:'GND', layer:2,  name:'GND-底层' },
];
log.created = [];
for (const pl of PLAN) {
  let r=null,err=null;
  try { r = await eda.pcb_PrimitivePour.create(pl.net, pl.layer,
        eda.pcb_MathPolygon.createPolygon(PTS), 'solid', false, pl.name, 5, 10, false); }
  catch(e){ err=e.message.slice(0,70); }
  log.created.push({ net:pl.net, layer:pl.layer, ok:!!r, err });
  await new Promise(x=>setTimeout(x,2500));
}
let s=null,e2=null; try { s=await eda.pcb_Document.save(); } catch(err){ e2=err.message.slice(0,70); }
log.保存 = e2 ? ('失败: '+e2) : '成功';
// 验证持久
await new Promise(r=>setTimeout(r,3500));
const other = p.find(x=>x.uuid!==PCB1);
if (other) { await eda.dmt_EditorControl.openDocument(other.uuid); await new Promise(r=>setTimeout(r,3000)); }
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,5000));
log.验证 = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
             过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
             铺铜:(await eda.pcb_PrimitivePour.getAll()||[]).length,
             填充:(await eda.pcb_PrimitivePoured.getAll()||[]).length };
return log;
