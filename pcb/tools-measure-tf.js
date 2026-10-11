const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const out = {};
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const card = comps.find(c => c.designator === 'CARD1');
if (card) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(card.primitiveId) || [];
  const ps = pins.filter(p => p.x !== undefined);
  if (ps.length) {
    const xs = ps.map(p=>p.x), ys = ps.map(p=>p.y);
    out.CARD1 = { 焊盘数: ps.length, 元件中心: {x:Math.round(card.x), y:Math.round(card.y)},
      焊盘X范围: Math.round(Math.min(...xs))+'~'+Math.round(Math.max(...xs))+'  (跨度'+Math.round(Math.max(...xs)-Math.min(...xs))+'mil = '+((Math.max(...xs)-Math.min(...xs))*0.0254).toFixed(1)+'mm)',
      焊盘Y范围: Math.round(Math.min(...ys))+'~'+Math.round(Math.max(...ys))+'  (跨度'+Math.round(Math.max(...ys)-Math.min(...ys))+'mil = '+((Math.max(...ys)-Math.min(...ys))*0.0254).toFixed(1)+'mm)',
      焊盘列表: ps.map(p=>p.number+'@'+Math.round(p.x)+','+Math.round(p.y)+'/L'+p.layer).slice(0,20) };
  }
}
// 板框
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
out.板框 = pl.filter(x=>x.layer===11).map(x => ({ layer:x.layer, 线宽:x.lineWidth,
  点数: (x.polygon||[]).length/2 || (x.polygon||[]).length }));
out.板框原始 = pl.filter(x=>x.layer===11).map(x => JSON.stringify(x.polygon).slice(0,300));
return out;
