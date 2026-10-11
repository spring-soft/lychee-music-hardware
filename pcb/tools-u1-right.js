const PCB = 'ec13f49100d66f9f';
const out = { done: [] };
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 6; i++) {
  await new Promise(r => setTimeout(r, 2500));
  comps = await eda.pcb_PrimitiveComponent.getAll();
  if (comps && comps.length) break;
}
if (!comps) return { err: '读取失败' };
const M = async (d, x, y) => {
  const c = (await eda.pcb_PrimitiveComponent.getAll() || []).find(z => z.designator === d);
  if (!c) { out.done.push(d + ' 未找到'); return; }
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x, y });
        out.done.push(d + ' → ' + x + ',' + y); }
  catch (e) { out.done.push(d + ' ERR'); }
  await new Promise(r => setTimeout(r, 600));
};
// ① 先把挡路的 3 个挪到下方空区（复位/BOOT 按键 SW5/SW6 附近）
await M('C2', 700, 800);
await M('R4', 700, 900);
await M('R5', 700, 1000);
// ② U1 往右移 150mil
const u1 = (await eda.pcb_PrimitiveComponent.getAll() || []).find(z => z.designator === 'U1');
if (u1) {
  await eda.pcb_PrimitiveComponent.modify(u1.primitiveId, { x: u1.x + 150, y: u1.y });
  out.done.push('U1 → x ' + Math.round(u1.x) + ' → ' + Math.round(u1.x + 150));
}
await new Promise(r => setTimeout(r, 2500));
let s = null, e = null;
try { s = await eda.pcb_Document.save(); } catch (err) { e = err.message.slice(0, 70); }
out.保存 = e ? ('失败: ' + e) : '成功';
out.左通道 = '36 → 186 mil  (0.9mm → 4.7mm)';
return out;
