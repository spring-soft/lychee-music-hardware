const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,3500));
const before = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
                 过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length };
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
const saveResult = e ? ('失败: '+e) : '成功';
await new Promise(r=>setTimeout(r,4000));
// 切走再切回
const other = p.find(x => x.uuid !== PCB1);
if (other) { await eda.dmt_EditorControl.openDocument(other.uuid); await new Promise(r=>setTimeout(r,3000)); }
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,5000));
const after = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
                过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length };
return { 保存前: before, 保存调用: saveResult, 切换后: after,
  判定: (before.走线===after.走线 && before.过孔===after.过孔) ? '持久化正常 ✓' : '持久化失败 ✗' };
