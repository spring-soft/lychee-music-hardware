const PCB = 'ec13f49100d66f9f';
const out = { done: [] };
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const M = async (d, x, y) => {
  const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x2=>x2.designator===d);
  if (!c) { out.done.push(d+' 未找到'); return; }
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x, y });
        out.done.push(d+' → '+x+','+y); }
  catch(e){ out.done.push(d+' ERR'); }
  await new Promise(r=>setTimeout(r,800));
};
// C21/C22 挪到 J4 上方（原 y=1080 正好堵在插线通道上）
await M('C21', 1750, 1240);
await M('C22', 1870, 1240);
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
// 复查：J4 插线通道 x1720~2114, y975~1125 内还有什么
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const blockers = comps.filter(c => {
  if (c.designator === 'J4') return false;
  if (c.layer !== 2) return false;                 // 只查背面的（同面才会挡住）
  return c.x > 1700 && c.x < 2130 && c.y > 950 && c.y < 1150;
}).map(c => c.designator+'@'+Math.round(c.x)+','+Math.round(c.y));
out.插线通道内剩余元件 = blockers.length ? blockers : '✅ 已清空';
return out;
