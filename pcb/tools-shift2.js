const PCB = 'ec13f49100d66f9f';
const SHIFT = 197;   // 上移 5mm，把板框下边缘从 -197 拉到 0
const out = { errs: [] };

// 开文档 + 重试等 getAll 不为 null
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 6; i++) {
  await new Promise(r => setTimeout(r, 2500));
  comps = await eda.pcb_PrimitiveComponent.getAll();
  if (comps && comps.length) break;
}
if (!comps || !comps.length) return { err: '元件列表读取失败' };
out.开工前 = { 元件数: comps.length, Y最小: Math.round(Math.min(...comps.map(c => c.y))) };

// ① 板框 → y 0 ~ 2166
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
const oldB = pl.filter(x => x.layer === 11);
if (oldB.length) { await eda.pcb_PrimitivePolyline.delete(oldB.map(x => x.primitiveId)); }
await new Promise(r => setTimeout(r, 2000));
const H2 = 1969 + SHIFT;
let ok = null, e1 = null;
try {
  ok = await eda.pcb_PrimitivePolyline.create('', 11,
    eda.pcb_MathPolygon.createPolygon([0, 0, 'L', 0, H2, 2283, H2, 2283, 0, 0, 0]), 10, false);
} catch (e) { e1 = e.message.slice(0, 70); }
out.板框 = ok ? ('OK  0 ~ ' + H2 + '  58.0 × ' + (H2 * 0.0254).toFixed(1) + ' mm') : ('失败: ' + e1);
await new Promise(r => setTimeout(r, 2000));

// ② 元件整体上移
let n = 0;
for (const c of comps) {
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y: c.y + SHIFT }); n++; }
  catch (e) { out.errs.push(c.designator); }
  await new Promise(r => setTimeout(r, 350));
}
out.已移动 = n + '/' + comps.length;
await new Promise(r => setTimeout(r, 2500));

// ③ 保存
let s = null, e = null;
try { s = await eda.pcb_Document.save(); } catch (err) { e = err.message.slice(0, 70); }
out.保存 = e ? ('失败: ' + e) : '成功';

// ④ 复核
const after = await eda.pcb_PrimitiveComponent.getAll() || [];
const ys = after.map(c => c.y);
out.平移后 = { 元件Y范围: Math.round(Math.min(...ys)) + ' ~ ' + Math.round(Math.max(...ys)),
               负坐标元件: after.filter(c => c.y < 0).length };
return out;
