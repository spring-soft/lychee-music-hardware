// 注意：不调用 openDocument，避免触发文档重载丢掉未保存的布线
const out = { 图元: {} };
for (const api of ['pcb_PrimitiveLine', 'pcb_PrimitiveVia', 'pcb_PrimitiveArc', 'pcb_PrimitivePour',
                   'pcb_PrimitivePoured', 'pcb_PrimitiveFill', 'pcb_PrimitiveRegion', 'pcb_PrimitivePolyline']) {
  try { const g = await eda[api].getAll(); if (Array.isArray(g)) out.图元[api] = g.length; } catch (e) {}
}
// 走线按层统计
try {
  const lines = await eda.pcb_PrimitiveLine.getAll() || [];
  const byLayer = {};
  for (const l of lines) byLayer[l.layer] = (byLayer[l.layer] || 0) + 1;
  out.走线分层 = byLayer;
  out.线宽样本 = [...new Set(lines.slice(0, 400).map(l => l.width))].sort((a, b) => a - b);
} catch (e) { out.走线err = String(e); }
// 过孔尺寸
try {
  const v = await eda.pcb_PrimitiveVia.getAll() || [];
  out.过孔尺寸 = [...new Set(v.map(x => (x.holeSize ?? x.hole) + '/' + (x.diameter ?? x.size)))];
} catch (e) {}
return out;
