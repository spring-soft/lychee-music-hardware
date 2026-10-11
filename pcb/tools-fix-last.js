const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='C21');
if (c) { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: 1750, y: 1180 }); }
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
return { C21: '1750,1180', 保存: e ? ('失败: '+e) : '成功' };
