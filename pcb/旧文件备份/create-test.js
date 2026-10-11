const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const out = { tries: [] };
const T = async (label, fn) => {
  try { const r = await fn(); out.tries.push({ label, ok: !!r, id: r?.primitiveId ?? null }); return r; }
  catch(e) { out.tries.push({ label, err: e.message.slice(0,120) }); return null; }
};
// 对照实验：各种 create 接口
await T('画线 Line.create', () => eda.pcb_PrimitiveLine.create('GND', 15, 100, 100, 300, 100, 10, false));
await T('字符串 String.create', () => eda.pcb_PrimitiveString.create('测试', 100, 100, 1, 20, 0, 'GND', false));
await T('区域 Region.create', () => eda.pcb_PrimitiveRegion.create(eda.pcb_MathPolygon.createPolygon([200,200,'L',500,200,'L',500,400,'L',200,400])));
await T('圆弧 Arc.create', () => eda.pcb_PrimitiveArc.create('GND', 15, 600, 600, 700, 700, 700, 600, 10, false));
await T('过孔 Via.create', () => eda.pcb_PrimitiveVia.create('GND', 900, 900, 24, 12, false));
await new Promise(r=>setTimeout(r,1500));
out.counts = {
  lines: (await eda.pcb_PrimitiveLine.getAll()||[]).length,
  vias: (await eda.pcb_PrimitiveVia.getAll()||[]).length,
  regions: (await eda.pcb_PrimitiveRegion.getAll()||[]).length,
  strings: (await eda.pcb_PrimitiveString.getAll()||[]).length,
};
return out;
