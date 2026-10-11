const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = { tries: [] };
const rect = [8, 8, 'L', 2275, 8, 'L', 2275, 1961, 'L', 8, 1961];
const polyR = eda.pcb_MathPolygon.createPolygon(rect);
out.polyShape = polyR ? JSON.stringify(polyR).slice(0,300) : 'null';
out.polyKeys = polyR ? Object.keys(polyR) : null;

const T = async (label, fn) => {
  try { const r = await fn(); out.tries.push({ label, ok: !!r, r: r ? JSON.stringify(r).slice(0,150) : null }); }
  catch(e) { out.tries.push({ label, err: e.message }); }
};
// 变体1：最小参数，层16
await T('layer16 最小参数', () => eda.pcb_PrimitivePour.create('GND', 16, polyR));
// 变体2：层15
await T('layer15 最小参数', () => eda.pcb_PrimitivePour.create('GND', 15, polyR));
// 变体3：顶层
await T('layer1 最小参数', () => eda.pcb_PrimitivePour.create('GND', 1, polyR));
// 变体4：带全部参数
await T('layer16 全参数', () => eda.pcb_PrimitivePour.create('GND', 16, polyR, '90grid', false, 'G16', 1, 10, false));
// 变体5：先 delete 已建的，避免重复
await new Promise(r=>setTimeout(r,1000));
const created = await eda.pcb_PrimitivePour.getAll() || [];
out.createdCount = created.length;
return out;
