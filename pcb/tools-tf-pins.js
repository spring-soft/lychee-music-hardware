await eda.dmt_EditorControl.openDocument('43ecd6bbed92787b');
await new Promise(r=>setTimeout(r,4500));
const comps = await eda.sch_PrimitiveComponent.getAll() || [];
// 找刚放的三个（位号是 ? 的）
const news = comps.filter(c => /\?$/.test(c.designator||''));
const out = { 新元件: news.map(c => ({ 位号:c.designator, 名称:c.name, x:c.x, y:c.y, 封装:c.footprint&&c.footprint.name })) };
for (const c of news) {
  const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  out['引脚_'+c.designator+'_'+(c.footprint&&c.footprint.name)] =
    pins.map(p => p.pinNumber+'='+(p.pinName||'')+'@'+p.x+','+p.y);
}
return out;
