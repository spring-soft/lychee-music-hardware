const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const pours = await eda.pcb_PrimitivePour.getAll() || [];
const poured = await eda.pcb_PrimitivePoured.getAll() || [];
const out = [];
for (const x of poured) {
  const pr = pours.find(y => y.primitiveId === x.pourPrimitiveId) || {};
  const fills = x.pourFills || [];
  const rec = { net: pr.net, layer: pr.layer, 区域数: fills.length };
  // 看 poursFills 的结构
  rec.样例结构 = fills[0] ? Object.keys(fills[0]) : (Array.isArray(fills[0]) ? '数组['+fills[0].length+']' : typeof fills[0]);
  rec.样例 = JSON.stringify(fills[0]).slice(0, 300);
  // 统计每块的点数，估算面积
  out.push(rec);
}
return out;
