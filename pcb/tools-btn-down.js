const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 4500));
const M = async (d, y) => {
  const c = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === d);
  if (!c) { out[d] = '未找到'; return; }
  const old = Math.round(c.y);
  await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y });
  out[d] = old + ' → ' + y;
  await new Promise(r => setTimeout(r, 700));
};
// 按键再往下 82mil，编码器同齐
for (const d of ['SW1', 'SW2', 'SW3', 'SW4']) await M(d, 100);
await M('EC1', 100);
await new Promise(r => setTimeout(r, 2000));
let s = null, e = null;
try { s = await eda.pcb_Document.save(); } catch (err) { e = err.message.slice(0, 70); }
out.保存 = e ? ('失败: ' + e) : '成功';
// 算间距
out.按键本体下边缘 = 100 - 118;
out.到板下边 = ((100 - 118) - (-197)) * 0.0254;
out.到屏幕下边 = (560 - (100 + 118)) * 0.0254;
return out;
