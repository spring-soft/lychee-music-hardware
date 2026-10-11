const PCB = 'ec13f49100d66f9f';
const out = { done: [] };
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const M = async (d, props) => {
  const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator===d);
  if (!c) { out.done.push(d+' 未找到'); return; }
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, props);
        out.done.push(d+' → '+JSON.stringify(props)); }
  catch(e){ out.done.push(d+' ERR '+e.message.slice(0,50)); }
  await new Promise(r=>setTimeout(r,800));
};
// ① U4 退回原位（上移会撞 C16）
await M('U4', { x:1700, y:850 });
// ② R16 挪开（撞到电感 L1）
await M('R16', { x:1450, y:700 });
// ③ 卡座：转 180° + 下移，让本体贴住板下边缘
await M('CARD1', { layer:2, x:1930, y:300, rotation:180 });
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
const c2 = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='CARD1');
if (c2) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c2.primitiveId)||[];
  const ys = pins.filter(p=>p.y!==undefined).map(p=>p.y);
  const xs = pins.filter(p=>p.x!==undefined).map(p=>p.x);
  out.卡座焊盘 = 'x '+Math.round(Math.min(...xs))+'~'+Math.round(Math.max(...xs))+
                 '  y '+Math.round(Math.min(...ys))+'~'+Math.round(Math.max(...ys))+
                 '  旋转'+c2.rotation+'  层'+c2.layer;
}
return out;
