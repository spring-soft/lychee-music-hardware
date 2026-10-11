const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,3500));
const before = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
                 过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
                 铺铜:(await eda.pcb_PrimitivePour.getAll()||[]).length,
                 填充:(await eda.pcb_PrimitivePoured.getAll()||[]).length };
let s=null,e=null; try { s=await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
await new Promise(r=>setTimeout(r,4000));
const other = p.find(x=>x.uuid!==PCB1);
if (other) { await eda.dmt_EditorControl.openDocument(other.uuid); await new Promise(r=>setTimeout(r,3000)); }
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,5000));
const after = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
                过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
                铺铜:(await eda.pcb_PrimitivePour.getAll()||[]).length,
                填充:(await eda.pcb_PrimitivePoured.getAll()||[]).length };
return { 保存前: before, 保存: e?('失败:'+e):'成功', 切换后: after,
  判定: JSON.stringify(before)===JSON.stringify(after) ? '✅ 全部持久' : '❌ 有变化' };
