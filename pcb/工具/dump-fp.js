const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i = 0; i < 8; i++) {
  await new Promise(r => setTimeout(r, 2500));
  comps = await eda.pcb_PrimitiveComponent.getAll();
  if (comps && comps.length) break;
}
if (!comps) return { err: '读取失败' };
const out = {};
for (const d of ['U1', 'CARD1', 'J1', 'EC1', 'L1', 'C15', 'C16']) {
  const c = comps.find(z => z.designator === d);
  if (!c) { out[d] = '无'; continue; }
  const rec = { footprint: c.footprint, name: c.name, layer: c.layer, rot: c.rotation };
  try {
    const fp = await eda.lib_Footprint.get(c.footprint);
    if (fp) {
      rec.fpKeys = Object.keys(fp);
      rec.fp = JSON.parse(JSON.stringify(fp));
    } else rec.fp = null;
  } catch (e) { rec.fpErr = e.message.slice(0, 120); }
  out[d] = rec;
}
return out;
