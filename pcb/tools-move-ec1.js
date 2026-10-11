const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='EC1');
if (!c) return { err:'EC1 未找到' };
out.改前 = Math.round(c.x)+','+Math.round(c.y);
// 往按键方向（左）挪 270mil
await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: 1800, y: c.y });
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
const c2 = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='EC1');
out.改后 = Math.round(c2.x)+','+Math.round(c2.y);
// 本体右边缘到板边距离（本体 311 宽）
out.到板右边 = (((2283 - (c2.x + 311/2)) * 0.0254)).toFixed(1)+'mm';
out.到SW4间距 = Math.round(c2.x - 311/2 - (1300 + 236/2))+'mil = '+
  (((c2.x - 311/2) - (1300 + 236/2))*0.0254).toFixed(1)+'mm';
return out;
