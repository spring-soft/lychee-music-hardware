const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const out = { tries: [] };
const T = async (label, fn) => {
  try { const r = await fn(); out.tries.push({ label, ok: !!r }); return r; }
  catch(e) { out.tries.push({ label, err: e.message.slice(0,110) }); return null; }
};
// 先看现在有没有已存在的铺铜（用户可能手动加了）
out.existingPours = (await eda.pcb_PrimitivePour.getAll() || []).map(x => ({ net:x.net, layer:x.layer }));

const poly = eda.pcb_MathPolygon.createPolygon([8, 8, 'L', 2275, 8, 'L', 2275, 1885, 'L', 8, 1885]);
await T("GND/内层二(16) solid", () => eda.pcb_PrimitivePour.create('GND', 16, poly, 'solid', false, 'GND-Inner2', 5, 10, false));
await new Promise(r=>setTimeout(r,1500));
// 再试老写法
const poly2 = eda.pcb_MathPolygon.createPolygon([8, 8, 'L', 2275, 8, 'L', 2275, 1885, 'L', 8, 1885]);
await T("GND/内层一(15) 90grid", () => eda.pcb_PrimitivePour.create('GND', 15, poly2, '90grid', false, 'GND-Inner1', 1, 10, false));
await new Promise(r=>setTimeout(r,1500));
out.afterCount = (await eda.pcb_PrimitivePour.getAll() || []).length;
out.afterPours = (await eda.pcb_PrimitivePour.getAll() || []).map(x => ({ net:x.net, layer:x.layer }));
return out;
