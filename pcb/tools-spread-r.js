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
  const old = Math.round(c.x) + ',' + Math.round(c.y);
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x, y });
        out.done.push(d + ': ' + old + ' → ' + x + ',' + y); }
  catch (e) { out.done.push(d + ' ERR'); }
  await new Promise(r => setTimeout(r, 550));
};
// 背面下方空区 y≈150，避开按键直插脚(x340~1360)的下方 → 放到 y=150
// 这些是"去哪都行"的电阻：按键上拉 + 背光
await M('R7',  600, 150);   // KEY_K2 上拉
await M('R8',  700, 150);   // KEY_K3 上拉
await M('R9',  800, 150);   // KEY_K4 上拉
await M('R12', 950, 150);   // 背光
await M('R13', 1100, 150);  // 背光
await M('R14', 1250, 150);  // 背光
await new Promise(r => setTimeout(r, 2500));
let s = null, e = null;
try { s = await eda.pcb_Document.save(); } catch (err) { e = err.message.slice(0, 70); }
out.保存 = e ? ('失败: ' + e) : '成功';
return out;
