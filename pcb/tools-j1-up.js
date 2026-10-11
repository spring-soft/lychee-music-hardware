const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 4500));
const c = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'J1');
if (!c) return { err: 'J1 not found' };
const old = Math.round(c.y);
// 往上移，错开按键那一行（按键在 y=182）
await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y: 380 });
await new Promise(r => setTimeout(r, 2000));
let s = null, e = null;
try { s = await eda.pcb_Document.save(); } catch (err) { e = err.message.slice(0, 70); }
out.保存 = e ? ('失败: ' + e) : '成功';
const c2 = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'J1');
out.J1 = old + ' → ' + Math.round(c2.y);
out.与按键错开 = Math.abs(c2.y - 182) + ' mil = ' + (Math.abs(c2.y - 182) * 0.0254).toFixed(1) + ' mm';
return out;
