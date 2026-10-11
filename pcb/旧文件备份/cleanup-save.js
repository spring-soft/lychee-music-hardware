const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x => x.uuid === PCB1);
if (!t) return { err: 'PCB1 未找到' };
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3500));
const log = { 目标: t.name };

const del = async (getter, deleter, label) => {
  const arr = await getter() || [];
  if (arr.length) {
    const ids = arr.map(x=>x.primitiveId).filter(Boolean);
    if (ids.length) { await deleter(ids); log['删'+label] = ids.length; }
    await new Promise(r=>setTimeout(r,2000));
  } else log['删'+label] = 0;
};
await del(()=>eda.pcb_PrimitiveLine.getAll(),   x=>eda.pcb_PrimitiveLine.delete(x),   '走线');
await del(()=>eda.pcb_PrimitiveVia.getAll(),    x=>eda.pcb_PrimitiveVia.delete(x),    '过孔');
await del(()=>eda.pcb_PrimitivePour.getAll(),   x=>eda.pcb_PrimitivePour.delete(x),   '铺铜');
await del(()=>eda.pcb_PrimitiveRegion.getAll(), x=>eda.pcb_PrimitiveRegion.delete(x), '区域');
await del(()=>eda.pcb_PrimitiveFill.getAll(),   x=>eda.pcb_PrimitiveFill.delete(x),   '填充块');

// ★ 保存
let saveOk = null, saveErr = null;
try { saveOk = await eda.pcb_Document.save(); } catch(e){ saveErr = e.message.slice(0,90); }
log.保存 = saveErr ? ('失败: '+saveErr) : '成功';

await new Promise(r=>setTimeout(r,2500));
log.清空后 = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
               过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
               铺铜:(await eda.pcb_PrimitivePour.getAll()||[]).length,
               填充:(await eda.pcb_PrimitivePoured.getAll()||[]).length,
               元件:(await eda.pcb_PrimitiveComponent.getAll()||[]).length };
return log;
