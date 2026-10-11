const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const log = { cleanup: [], created: [] };

// ── 1. 清掉刚才的测试图元 ──
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const testLines = lines.filter(l => l.layer === 15 && Math.abs(l.startX-100)<1 && Math.abs(l.startY-100)<1);
if (testLines.length) { await eda.pcb_PrimitiveLine.delete(testLines.map(l=>l.primitiveId)); log.cleanup.push('测试线 x'+testLines.length); }
const vias = await eda.pcb_PrimitiveVia.getAll() || [];
const testVias = vias.filter(v => (Math.abs(v.x-900)<1 || Math.abs(v.x-950)<1) && Math.abs(v.y-900)<1);
if (testVias.length) { await eda.pcb_PrimitiveVia.delete(testVias.map(v=>v.primitiveId)); log.cleanup.push('测试过孔 x'+testVias.length); }
const pours = await eda.pcb_PrimitivePour.getAll() || [];
if (pours.length) { await eda.pcb_PrimitivePour.delete(pours.map(x=>x.primitiveId)); log.cleanup.push('测试铺铜 x'+pours.length); }
await new Promise(r=>setTimeout(r,1500));

// ── 2. 建 4 块铺铜 ──
// 矩形 x=8, y=8, 宽 2267, 高 1877  →  覆盖 x 8..2275, y 8..1885
// 上边缘留出 84mil(约2.1mm) 是 WiFi 天线禁布区
const RECT = ['R', 8, 8, 2267, 1877, 0, 0];
const PLAN = [
  { net:'GND', layer:16, name:'GND-内层二', desc:'地平面（最关键）' },
  { net:'VCC', layer:15, name:'VCC-内层一', desc:'3.3V 电源平面' },
  { net:'GND', layer:1,  name:'GND-顶层',   desc:'顶层地' },
  { net:'GND', layer:2,  name:'GND-底层',   desc:'底层地' },
];
for (const pl of PLAN) {
  const poly = eda.pcb_MathPolygon.createPolygon(RECT);
  let r = null, err = null;
  try { r = await eda.pcb_PrimitivePour.create(pl.net, pl.layer, poly, 'solid', false, pl.name, 5, 10, false); }
  catch(e) { err = e.message.slice(0,80); }
  log.created.push({ ...pl, ok: !!r, err });
  await new Promise(r2=>setTimeout(r2,1800));
}
await new Promise(r2=>setTimeout(r2,2500));
const all = await eda.pcb_PrimitivePour.getAll() || [];
log.finalPours = all.map(x => ({ net:x.net, layer:x.layer, id:x.primitiveId }));
log.finalCount = all.length;
return log;
