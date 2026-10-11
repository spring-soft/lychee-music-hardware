const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4500));
out.导入前元件数 = (await eda.pcb_PrimitiveComponent.getAll()||[]).length;
// 触发同步
for (let i=1;i<=3;i++) {
  try { await eda.pcb_Document.importChanges(); } catch(e){ out['err'+i]=e.message.slice(0,60); }
  await new Promise(r=>setTimeout(r,3000));
  const n = (await eda.pcb_PrimitiveComponent.getAll()||[]).length;
  out['第'+i+'次后元件数'] = n;
  if (n > out.导入前元件数) break;
}
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
out.新元件 = comps.filter(c => ['CARD1','C28','C29'].includes(c.designator))
  .map(c => ({ 位号:c.designator, x:c.x, y:c.y, layer:c.layer,
               封装:c.footprint && c.footprint.name }));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
return out;
