const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = {};
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const pours = await eda.pcb_PrimitivePour.getAll() || [];
const poured= await eda.pcb_PrimitivePoured.getAll() || [];
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];

// ① 单焊盘网络（悬空嫌疑）
const netPads = {};
for (const c of comps) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  for (const pin of pins) if (pin.net) (netPads[pin.net] = netPads[pin.net] || []).push(c.designator+'_'+pin.number);
}
out.单焊盘网络 = Object.entries(netPads).filter(([n,a])=>a.length===1).map(([n,a])=>n+'('+a[0]+')');

// ② 铺铜填充情况
out.铺铜 = pours.map((x,i) => ({ net:x.net, layer:x.layer, name:x.pourName }));
out.填充块数 = poured.length;
out.填充详情 = poured.map(x => ({
  net: (pours.find(y=>y.primitiveId===x.pourPrimitiveId)||{}).net,
  layer: (pours.find(y=>y.primitiveId===x.pourPrimitiveId)||{}).layer,
  填充区域数: Array.isArray(x.pourFills) ? x.pourFills.length : (x.pourFills ? 'non-array' : 0),
}));

// ③ 过孔/走线口径
out.过孔总数 = vias.length;
out.走线总数 = lines.length;
const netSet = new Set([...lines.map(l=>l.net), ...vias.map(v=>v.net)]);
out.有铜的网络数 = netSet.size;

// ④ 元件层分布
const byLayer = {}; for (const c of comps) byLayer['L'+c.layer]=(byLayer['L'+c.layer]||0)+1;
out.元件层分布 = byLayer;
out.旋转非0的元件 = comps.filter(c=>c.rotation%360!==0).map(c=>c.designator+':'+c.rotation);
return out;
