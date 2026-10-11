const PCB = '197f3e3cc67e949b';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) {
  await new Promise(r => setTimeout(r, 2500));
  comps = await eda.pcb_PrimitiveComponent.getAll();
  if (comps && comps.length) break;
}
if (!comps) return { err: '读取失败' };
const rows = [];
for (const c of comps) {
  let pads = [];
  try { pads = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || []; } catch (e) {}
  const xs = pads.map(p => p.x), ys = pads.map(p => p.y);
  rows.push({ d: c.designator, x: Math.round(c.x), y: Math.round(c.y), l: c.layer, rot: c.rotation || 0,
    padX: pads.length ? Math.round(Math.min(...xs)) + '~' + Math.round(Math.max(...xs)) : '',
    padY: pads.length ? Math.round(Math.min(...ys)) + '~' + Math.round(Math.max(...ys)) : '' });
}
rows.sort((a, b) => a.y - b.y || a.x - b.x);
return { n: rows.length, rows };
