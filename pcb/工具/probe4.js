const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) { await new Promise(r => setTimeout(r, 2500)); comps = await eda.pcb_PrimitiveComponent.getAll(); if (comps && comps.length) break; }
const out = {};
for (const d of ['EC1', 'U1', 'C26']) {
  const c = comps.find(z => z.designator === d);
  if (!c) { out[d] = '无'; continue; }
  const rec = {};
  for (const k of ['component', 'model3D', 'pads', 'otherProperty', 'name', 'footprint']) {
    try { const v = c[k]; rec[k] = v === undefined ? 'undefined' : JSON.parse(JSON.stringify(v)); }
    catch (e) { rec[k] = 'ERR'; }
  }
  out[d] = rec;
}
// 试 lib_Device.get
try {
  const c = comps.find(z => z.designator === 'EC1');
  const dev = await eda.lib_Device.get(c.component && c.component.uuid, c.component && c.component.libraryUuid);
  out.EC1器件 = dev ? JSON.parse(JSON.stringify(dev)) : null;
} catch (e) { out.EC1器件 = 'ERR ' + String(e && e.message || e).slice(0, 80); }
return out;
