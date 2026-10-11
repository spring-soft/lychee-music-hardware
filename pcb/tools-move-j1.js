const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 4500));
const c = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'J1');
if (!c) return { err: 'J1 not found' };
out.改前 = Math.round(c.x) + ',' + Math.round(c.y) + ' 层' + c.layer;
// 和按键/编码器同一水平线 (y=182)
await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y: 182 });
await new Promise(r => setTimeout(r, 2000));
let s = null, e = null;
try { s = await eda.pcb_Document.save(); } catch (err) { e = err.message.slice(0, 70); }
out.保存 = e ? ('失败: ' + e) : '成功';
const c2 = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'J1');
out.改后 = Math.round(c2.x) + ',' + Math.round(c2.y);
out.本体下边缘 = Math.round(c2.y - 170);
out.距板下边 = (((c2.y - 170) - (-197)) * 0.0254).toFixed(1) + ' mm';
return out;
