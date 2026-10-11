const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3500));
const out = { 目标: t.name };
out.铺铜边框 = (await eda.pcb_PrimitivePour.getAll()||[]).length;
out.填充结果 = (await eda.pcb_PrimitivePoured.getAll()||[]).length;
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e = err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
return out;
