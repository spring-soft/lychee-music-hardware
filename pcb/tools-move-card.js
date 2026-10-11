const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
// 卡座整体向下延伸约 465mil（信号脚 → 插入口），把插入口对齐到板边 -630
const moves = [ ['CARD1', 1100, -165], ['C28', 480, -300], ['C29', 1720, -300] ];
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
for (const [d, x, y] of moves) {
  const c = comps.find(c => c.designator === d);
  if (!c) { out[d] = '未找到'; continue; }
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x, y }); out[d] = '→ '+x+','+y; }
  catch(e){ out[d] = 'ERR '+e.message.slice(0,60); }
  await new Promise(r=>setTimeout(r,900));
}
await new Promise(r=>setTimeout(r,2000));
// 量卡座焊盘的 y 范围，确认落在板内
const c2 = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(c=>c.designator==='CARD1');
if (c2) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c2.primitiveId) || [];
  const ys = pins.filter(p=>p.y!==undefined).map(p=>p.y);
  out.卡座焊盘Y范围 = Math.round(Math.min(...ys))+' ~ '+Math.round(Math.max(...ys));
  out.板范围Y = '-630 ~ 1969';
}
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
return out;
