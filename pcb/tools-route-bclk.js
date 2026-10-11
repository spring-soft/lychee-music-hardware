const PCB = 'ec13f49100d66f9f';
const out = { segs: [], vias: [] };
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
out.布前 = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
             过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length };
// 底层三段
const L = [
  [2, 46,1610, 65,1610],
  [2, 65,1610, 93,1639],
  [2, 93,1639, 128,1639],
  // 顶层长横穿
  [1, 128,1639, 1450,1639],
  // 底层接 U2
  [2, 1450,1639, 1468,1621],
  [2, 1468,1621, 1468,1596],
];
for (const [layer,x1,y1,x2,y2] of L) {
  try { const r = await eda.pcb_PrimitiveLine.create('I2S_BCLK', layer, x1,y1,x2,y2, 10, false);
        out.segs.push('L'+layer+' '+x1+','+y1+'→'+x2+','+y2+(r?' ✓':' ✗')); }
  catch(e){ out.segs.push('L'+layer+' ERR '+e.message.slice(0,50)); }
  await new Promise(r=>setTimeout(r,600));
}
// 两个过孔
for (const [x,y] of [[128,1639],[1450,1639]]) {
  try { const r = await eda.pcb_PrimitiveVia.create('I2S_BCLK', x, y, 12, 24);
        out.vias.push(x+','+y+(r?' ✓':' ✗')); }
  catch(e){ out.vias.push(x+','+y+' ERR '+e.message.slice(0,50)); }
  await new Promise(r=>setTimeout(r,600));
}
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
out.布后 = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
             过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length };
return out;
