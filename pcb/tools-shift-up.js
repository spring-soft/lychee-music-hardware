const PCB = 'ec13f49100d66f9f';
const SHIFT = 197;   // 整体上移 5mm，让板子下边缘回到 y=0
const out = { done: 0, errs: [] };
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 4500));

// ① 板框
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
const old = pl.filter(x => x.layer === 11);
if (old.length) { await eda.pcb_PrimitivePolyline.delete(old.map(x => x.primitiveId)); }
await new Promise(r => setTimeout(r, 1800));
const H2 = 1969 + SHIFT;
let ok = null, e1 = null;
try {
  ok = await eda.pcb_PrimitivePolyline.create('', 11,
    eda.pcb_MathPolygon.createPolygon([0, 0, 'L', 0, H2, 2283, H2, 2283, 0, 0, 0]), 10, false);
} catch (e) { e1 = e.message.slice(0, 70); }
out.板框 = ok ? ('OK  0 ~ ' + H2 + '   (58.0 × ' + (H2 * 0.0254).toFixed(1) + ' mm)') : ('失败: ' + e1);
await new Promise(r => setTimeout(r, 2000));

// ② 所有元件上移
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
for (const c of comps) {
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y: c.y + SHIFT }); out.done++; }
  catch (e) { out.errs.push(c.designator + ':' + e.message.slice(0, 40)); }
  await new Promise(r => setTimeout(r, 420));
}
await new Promise(r => setTimeout(r, 2500));
let s = null, e = null;
try { s = await eda.pcb_Document.save(); } catch (err) { e = err.message.slice(0, 70); }
out.保存 = e ? ('失败: ' + e) : '成功';

// ③ 复核：有没有元件还在负坐标
const after = await eda.pcb_PrimitiveComponent.getAll() || [];
const neg = after.filter(c => c.y < 0).map(c => c.designator + '@' + Math.round(c.y));
out.仍在负坐标 = neg.length ? neg : '无 ✅';
out.元件Y范围 = Math.round(Math.min(...after.map(c => c.y))) + ' ~ ' + Math.round(Math.max(...after.map(c => c.y)));
return out;
