const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const log = {};
const old = await eda.pcb_PrimitivePour.getAll() || [];
if (old.length) { await eda.pcb_PrimitivePour.delete(old.map(x=>x.primitiveId)); log.删除 = old.length; }
await new Promise(r=>setTimeout(r,2500));

// 闭合点串格式（已验证中心点计算正确）
// 板框 x 8..2275, y 8..1885；上边缘 84mil 留空 = WiFi 天线禁布区
const PTS = [8, 8, 'L', 2275, 8, 'L', 2275, 1885, 'L', 8, 1885, 'L', 8, 8];
const poly = eda.pcb_MathPolygon.createPolygon(PTS);
log.多边形源 = poly.getSource();
try { log.多边形中心 = await poly.getCenter(); } catch(e){ log.多边形中心 = 'ERR'; }

const PLAN = [
  { net:'GND', layer:16, name:'GND-内层二' },
  { net:'VCC', layer:15, name:'VCC-内层一' },
  { net:'GND', layer:1,  name:'GND-顶层' },
  { net:'GND', layer:2,  name:'GND-底层' },
];
log.created = [];
for (const pl of PLAN) {
  const pg = eda.pcb_MathPolygon.createPolygon(PTS);
  let r=null, err=null;
  try { r = await eda.pcb_PrimitivePour.create(pl.net, pl.layer, pg, 'solid', false, pl.name, 5, 10, false); }
  catch(e){ err = e.message.slice(0,70); }
  log.created.push({ net:pl.net, layer:pl.layer, ok:!!r, err });
  await new Promise(x=>setTimeout(x,2500));
}
await new Promise(x=>setTimeout(x,5000));
log.最终铺铜 = (await eda.pcb_PrimitivePour.getAll()||[]).length;
return log;
