await eda.dmt_EditorControl.openDocument('43ecd6bbed92787b');
await new Promise(r=>setTimeout(r,4500));
const comps = await eda.sch_PrimitiveComponent.getAll() || [];
const u1 = comps.find(c => c.designator === 'U1');
const out = {};
const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(u1.primitiveId) || [];
out['U1_空闲候选(IO12/13/14/21/47/48)'] = pins
  .filter(p => ['IO12','IO13','IO14','IO21','IO47','IO48','IO3','IO46','IO45'].includes(p.pinName))
  .map(p => ({ 名:p.pinName, 脚号:p.pinNumber, x:p.x, y:p.y, 已连:p.noConnected === false }));
// 现在 LCD 的 IO4/IO5 在哪，确认能共用
out['U1_LCD相关'] = pins.filter(p => ['IO4','IO5','IO15'].includes(p.pinName))
  .map(p => ({ 名:p.pinName, 脚号:p.pinNumber, x:p.x, y:p.y }));
// 两个新电容的引脚
const caps = comps.filter(c => c.designator === 'C?');
out['新电容'] = [];
for (const c of caps) {
  const cp = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  out['新电容'].push({ x:c.x, y:c.y, pins: cp.map(p=>p.pinNumber+'@'+p.x+','+p.y) });
}
return out;
