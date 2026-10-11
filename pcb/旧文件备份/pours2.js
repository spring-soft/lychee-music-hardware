const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const log = { created: [], existed: 0 };

const old = await eda.pcb_PrimitivePour.getAll() || [];
log.existed = old.length;
if (old.length) await eda.pcb_PrimitivePour.delete(old.map(x=>x.primitiveId));
await new Promise(r=>setTimeout(r,1500));

// 矩形 x=8, y=8, 宽 2267, 高 1877 → x 8..2275, y 8..1885
// 上边缘留 84mil 不盖 = WiFi 天线禁布区
const RECT = ['R', 8, 8, 2267, 1877, 0, 0];
const PLAN = [
  { net:'GND', layer:16, name:'GND-内层二', desc:'地平面' },
  { net:'VCC', layer:15, name:'VCC-内层一', desc:'3.3V 电源平面' },
  { net:'GND', layer:1,  name:'GND-顶层',   desc:'顶层地' },
  { net:'GND', layer:2,  name:'GND-底层',   desc:'底层地' },
];
for (const pl of PLAN) {
  let r = null, err = null;
  try { r = await eda.pcb_PrimitivePour.create(pl.net, pl.layer,
        eda.pcb_MathPolygon.createPolygon(RECT), 'solid', false, pl.name, 5, 10, false); }
  catch(e) { err = e.message.slice(0,70); }
  log.created.push({ ...pl, ok: !!r, err });
  await new Promise(x=>setTimeout(x,1800));
}
await new Promise(x=>setTimeout(x,2500));
log.finalCount = (await eda.pcb_PrimitivePour.getAll()||[]).length;
log.pours = (await eda.pcb_PrimitivePour.getAll()||[]).map(x=>({net:x.net, layer:x.layer}));
log.走线数 = (await eda.pcb_PrimitiveLine.getAll()||[]).length;
log.过孔数 = (await eda.pcb_PrimitiveVia.getAll()||[]).length;
return log;
