const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 2500)); comps = await eda.pcb_PrimitiveComponent.getAll(); if (comps && comps.length) break; }
const out = {};
for (const d of ['C15', 'C16', 'SW1', 'CARD1', 'C28', 'C29']) {
  const c = comps.find(z => z.designator === d);
  if (!c) { out[d] = '无'; continue; }
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  let span = '';
  if (pins.length >= 2) {
    const xs = pins.map(p => p.x), ys = pins.map(p => p.y);
    span = '焊盘跨距 ' + Math.round(Math.max(...xs) - Math.min(...xs)) + ' x ' + Math.round(Math.max(...ys) - Math.min(...ys)) +
           ' mil = ' + ((Math.max(...xs)-Math.min(...xs))*0.0254).toFixed(1) + ' x ' + ((Math.max(...ys)-Math.min(...ys))*0.0254).toFixed(1) + ' mm';
  }
  out[d] = { 封装: c.footprint && c.footprint.name, 焊盘数: pins.length, 跨距: span };
}
return out;
