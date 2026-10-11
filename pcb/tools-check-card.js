const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const MIL=0.0254; const out = {};
// 收集所有元件的焊盘
const all = [];
for (const c of comps) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  for (const p of pins) if (p.x !== undefined)
    all.push({ d:c.designator, n:p.number, x:p.x, y:p.y, l:p.layer, thru:(p.layer===12) });
}
const card = all.filter(p => p.d === 'CARD1');
const cx = card.map(p=>p.x), cy = card.map(p=>p.y);
out.CARD1 = {
  焊盘数: card.length,
  X: Math.round(Math.min(...cx))+' ~ '+Math.round(Math.max(...cx))+'  ('+((Math.max(...cx)-Math.min(...cx))*MIL).toFixed(1)+' mm)',
  Y: Math.round(Math.min(...cy))+' ~ '+Math.round(Math.max(...cy))+'  ('+((Math.max(...cy)-Math.min(...cy))*MIL).toFixed(1)+' mm)',
  到板下边: ((Math.min(...cy)-0)*MIL).toFixed(2)+' mm',
  到板右边: ((2283-Math.max(...cx))*MIL).toFixed(2)+' mm',
};
// 冲突检测：CARD1 焊盘 vs 其他元件的焊盘/本体
const cl = Math.min(...cx)-30, cr = Math.max(...cx)+30, cb = Math.min(...cy)-30, ct = Math.max(...cy)+30;
const hits = new Set();
for (const p of all) {
  if (p.d === 'CARD1' || p.d === 'C28' || p.d === 'C29') continue;
  if (p.x > cl && p.x < cr && p.y > cb && p.y < ct) hits.add(p.d+'(焊盘'+p.n+', '+(p.thru?'直插★':'贴片')+')');
}
out.卡座范围内其他元件焊盘 = [...hits];
out.结论 = hits.size === 0 ? '✅ 范围内无其他元件' : '⚠️ 有 ' + hits.size + ' 处需要确认';
// 板框
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
out.板框 = pl.filter(x=>x.layer===11).map(x=>JSON.stringify(x.polygon).slice(0,80));
return out;
