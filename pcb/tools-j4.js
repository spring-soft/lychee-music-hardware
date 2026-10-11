const MIL = 0.0254;
const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const j4 = comps.find(c => c.designator === 'J4');
const out = {};
if (!j4) return { err:'J4 未找到' };
out.J4 = { 中心: Math.round(j4.x)+','+Math.round(j4.y), 旋转: j4.rotation, 层: j4.layer,
           封装: j4.footprint && j4.footprint.name };
const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(j4.primitiveId) || [];
out.J4焊盘 = pins.filter(p=>p.x!==undefined).map(p => '脚'+(p.number||'?')+'@'+Math.round(p.x)+','+Math.round(p.y)+'/L'+p.layer);
// J4 周围的元件（400mil 内）
const near = [];
for (const c of comps) {
  if (c.designator === 'J4') continue;
  const d = Math.hypot(c.x - j4.x, c.y - j4.y);
  if (d < 400) near.push({ d: c.designator, x: Math.round(c.x), y: Math.round(c.y),
    层: c.layer, 距离: Math.round(d)+'mil ('+(d*MIL).toFixed(1)+'mm)',
    方向: (c.x > j4.x ? '右' : '左') + (c.y > j4.y ? '上' : '下') });
}
near.sort((a,b)=>parseInt(a.距离)-parseInt(b.距离));
out.J4周围400mil内 = near;
return out;
