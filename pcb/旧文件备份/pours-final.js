const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3500));
const log = {};
const old = await eda.pcb_PrimitivePour.getAll() || [];
if (old.length) { await eda.pcb_PrimitivePour.delete(old.map(x=>x.primitiveId)); log.删除旧的 = old.length;
  await new Promise(r=>setTimeout(r,2000)); }

// 闭合点串格式（唯一可用的格式；'R' 矩形格式算出的多边形是畸形的）
// 板框 x 8..2275, y 8..1885；上方留 84mil = WiFi 天线禁布区
const PTS = [8, 8, 'L', 2275, 8, 'L', 2275, 1885, 'L', 8, 1885, 'L', 8, 8];
const chk = eda.pcb_MathPolygon.createPolygon(PTS);
try { log.多边形中心 = await chk.getCenter(); } catch(e){ log.多边形中心='ERR'; }

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
        eda.pcb_MathPolygon.createPolygon(PTS), 'solid', false, pl.name, 5, 10, false); }
  catch(e){ err = e.message.slice(0,70); }
  log.created.push({ net:pl.net, layer:pl.layer, ok:!!r, err });
  await new Promise(x=>setTimeout(x,2500));
}
let saveOk=null, saveErr=null;
try { saveOk = await eda.pcb_Document.save(); } catch(e){ saveErr = e.message.slice(0,80); }
log.保存 = saveErr ? ('失败: '+saveErr) : '成功';
await new Promise(x=>setTimeout(x,2500));
log.铺铜数 = (await eda.pcb_PrimitivePour.getAll()||[]).length;
log.填充数 = (await eda.pcb_PrimitivePoured.getAll()||[]).length;
return log;
