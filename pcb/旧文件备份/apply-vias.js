
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const GND = [{"x":60,"y":60},{"x":348,"y":60},{"x":636,"y":60},{"x":924,"y":60},{"x":1212,"y":60},{"x":1500,"y":60},{"x":1788,"y":60},{"x":2076,"y":60},{"x":1080,"y":312},{"x":1632,"y":312},{"x":2208,"y":312},{"x":156,"y":324},{"x":696,"y":336},{"x":1356,"y":360},{"x":1884,"y":468},{"x":432,"y":516},{"x":900,"y":576},{"x":1536,"y":576},{"x":1188,"y":588},{"x":96,"y":600},{"x":2196,"y":600},{"x":636,"y":708},{"x":1812,"y":780},{"x":300,"y":792},{"x":996,"y":840},{"x":1320,"y":840},{"x":2208,"y":888},{"x":60,"y":948},{"x":684,"y":984},{"x":1956,"y":1032},{"x":1164,"y":1080},{"x":1680,"y":1080},{"x":396,"y":1104},{"x":2208,"y":1176},{"x":1416,"y":1212},{"x":132,"y":1260},{"x":1872,"y":1308},{"x":612,"y":1320},{"x":996,"y":1320},{"x":348,"y":1440},{"x":1248,"y":1452},{"x":2124,"y":1452},{"x":1884,"y":1608},{"x":1548,"y":1620},{"x":864,"y":1692},{"x":96,"y":1704},{"x":1152,"y":1716},{"x":2220,"y":1716},{"x":384,"y":1740},{"x":1716,"y":1848},{"x":636,"y":1872},{"x":1392,"y":1872},{"x":1992,"y":1896}];
const VCC = [{"tag":"U3.5","padX":863,"padY":957,"x":871,"y":986,"len":30},{"tag":"U1.2","padX":735,"padY":1860,"x":764,"y":1868,"len":30}];
const log = { gnd:0, vcc:0, stub:0, errs:[] };
for (const g of GND) {
  try { const r = await eda.pcb_PrimitiveVia.create('GND', g.x, g.y, 12, 24); if (r) log.gnd++; }
  catch(e) { if (log.errs.length<5) log.errs.push('GND '+g.x+','+g.y+': '+e.message.slice(0,40)); }
}
await new Promise(r=>setTimeout(r,2000));
for (const v2 of VCC) {
  try { const r = await eda.pcb_PrimitiveVia.create('VCC', v2.x, v2.y, 12, 24); if (r) log.vcc++; }
  catch(e) { if (log.errs.length<5) log.errs.push('VCC: '+e.message.slice(0,40)); }
  try { await eda.pcb_PrimitiveLine.create('VCC', v2.y===1868?2:2, v2.padX, v2.padY, v2.x, v2.y, 10, false); log.stub++; }
  catch(e) { if (log.errs.length<5) log.errs.push('stub '+v2.tag+': '+e.message.slice(0,40)); }
}
await new Promise(r=>setTimeout(r,2000));
log.总过孔 = (await eda.pcb_PrimitiveVia.getAll()||[]).length;
log.总走线 = (await eda.pcb_PrimitiveLine.getAll()||[]).length;
return log;
