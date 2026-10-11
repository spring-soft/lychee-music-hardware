const PCB = 'ec13f49100d66f9f';
const out = { moved: [] };
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const M = async (d, x, y) => {
  const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(cc=>cc.designator===d);
  if (!c) { out.moved.push(d+' 未找到'); return; }
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x, y });
        out.moved.push(d+' → '+x+','+y); }
  catch(e){ out.moved.push(d+' ERR '+e.message.slice(0,50)); }
  await new Promise(r=>setTimeout(r,700));
};
// ① 按键左移
await M('SW1', 400, 250);  await M('SW2', 700, 250);
await M('SW3', 1000, 250); await M('SW4', 1300, 250);
// ② 背面 5 个元件挪到电池区左侧
await M('C23', 1250, 640); await M('C24', 1400, 640); await M('C25', 1550, 640);
await M('R15', 1250, 760); await M('R16', 1400, 760);
// ③ TF 卡座（背面，插卡口朝下）
const c1 = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(c=>c.designator==='CARD1');
if (c1) { await eda.pcb_PrimitiveComponent.modify(c1.primitiveId, { layer:2, x:1930, y:465 });
  out.moved.push('CARD1 → 1930,465 背面'); await new Promise(r=>setTimeout(r,1200)); }
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
return out;
