const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const del = async (getter, deleter, label) => {
  const arr = await getter() || [];
  if (arr.length) { await deleter(arr.map(x=>x.primitiveId).filter(Boolean)); out['删'+label]=arr.length;
    await new Promise(r=>setTimeout(r,2200)); } else out['删'+label]=0;
};
await del(()=>eda.pcb_PrimitiveLine.getAll(),   x=>eda.pcb_PrimitiveLine.delete(x),   '走线');
await del(()=>eda.pcb_PrimitiveVia.getAll(),    x=>eda.pcb_PrimitiveVia.delete(x),    '过孔');
await del(()=>eda.pcb_PrimitivePour.getAll(),   x=>eda.pcb_PrimitivePour.delete(x),   '铺铜');
await new Promise(r=>setTimeout(r,2500));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
out.清空后 = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
               过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
               铺铜:(await eda.pcb_PrimitivePour.getAll()||[]).length,
               元件:(await eda.pcb_PrimitiveComponent.getAll()||[]).length };
return out;
