// 注意：故意不调用 openDocument —— 当前文档就是 V2，避免重载丢掉未保存的布线
const out = { 前置检查: {} };
const lines0 = await eda.pcb_PrimitiveLine.getAll() || [];
const vias0 = await eda.pcb_PrimitiveVia.getAll() || [];
out.前置检查 = { 走线: lines0.length, 过孔: vias0.length,
                元件: (await eda.pcb_PrimitiveComponent.getAll() || []).length };
if (lines0.length < 900) {
  out.中止 = '❌ 走线数异常（' + lines0.length + '），疑似未保存或丢失，已停止铺铜';
  return out;
}

// 先清掉残留铺铜
try {
  const pf = await eda.pcb_PrimitivePoured.getAll() || [];
  const pb = await eda.pcb_PrimitivePour.getAll() || [];
  if (pf.length) await eda.pcb_PrimitivePoured.delete(pf.map(o => o.primitiveId));
  if (pb.length) await eda.pcb_PrimitivePour.delete(pb.map(o => o.primitiveId));
  out.清残留 = (pf.length + pb.length) + ' 个';
  await new Promise(r => setTimeout(r, 2000));
} catch (e) { out.清残留 = 'ERR'; }

const M = 15, B = { l: 0, r: 2283, b: 0, t: 1969 };
const NL = 186, NR = 895, NT = 1900;      // 模组天线避空口（模组 x186~895，顶部无铜）
const pts = [
  B.l+M, B.b+M, 'L',
  B.r-M, B.b+M, 'L',
  B.r-M, B.t-M, 'L',
  NR,    B.t-M, 'L',
  NR,    NT,    'L',
  NL,    NT,    'L',
  NL,    B.t-M, 'L',
  B.l+M, B.t-M, 'L',
  B.l+M, B.b+M,
];
const poly = eda.pcb_MathPolygon.createPolygon(pts);

const PLAN = [
  { net: 'VCC', layer: 15, name: 'VCC_PLANE' },
  { net: 'GND', layer: 16, name: 'GND_PLANE' },
  { net: 'GND', layer: 1,  name: 'GND_TOP'   },
  { net: 'GND', layer: 2,  name: 'GND_BOT'   },
];
out.结果 = [];
for (const p of PLAN) {
  let r = null, err = null;
  try { r = await eda.pcb_PrimitivePour.create(p.net, p.layer, poly, 'solid', false, p.name, 1, 8, false); }
  catch (e) { err = String(e && e.message || e).slice(0, 90); }
  out.结果.push(p.name + '@层' + p.layer + ' → ' + (r ? 'OK' : '失败 ' + err));
  await new Promise(r => setTimeout(r, 1500));
}
await new Promise(r => setTimeout(r, 2500));
try { await eda.pcb_Document.save(); out.保存 = '成功'; } catch (e) { out.保存 = '失败 ' + String(e.message || e).slice(0, 60); }

out.复核 = {
  铺铜边框: (await eda.pcb_PrimitivePour.getAll() || []).length,
  已填充: (await eda.pcb_PrimitivePoured.getAll() || []).length,
  走线: (await eda.pcb_PrimitiveLine.getAll() || []).length,
  过孔: (await eda.pcb_PrimitiveVia.getAll() || []).length,
};
return out;
