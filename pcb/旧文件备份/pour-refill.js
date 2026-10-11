const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const pours = await eda.pcb_PrimitivePour.getAll() || [];
const log = { pours: pours.length, modified: [] };
for (const pr of pours) {
  try {
    // 改一下属性，逼 EDA 重新计算填充
    await eda.pcb_PrimitivePour.modify(pr.primitiveId, { pourFillMethod: 'solid', preserveSilos: false });
    log.modified.push(pr.net + '/L' + pr.layer);
  } catch(e) { log.modified.push('ERR ' + pr.net + ': ' + e.message.slice(0,50)); }
  await new Promise(r=>setTimeout(r,1200));
}
await new Promise(r=>setTimeout(r,4000));
log.回读 = (await eda.pcb_PrimitivePour.getAll()||[]).map(x=>({net:x.net,layer:x.layer}));
// 有没有孤岛/填充相关字段
const p0 = (await eda.pcb_PrimitivePour.getAll()||[])[0];
log.字段 = p0 ? Object.keys(p0) : null;
try { log.铺铜后图元 = (await eda.pcb_PrimitivePoured.getAll()||[]).length; } catch(e){ log.铺铜后图元='ERR'; }
return log;
