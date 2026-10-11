const out = {};
for (const uuid of ['197f3e3cc67e949b', 'ec13f49100d66f9f']) {
  await eda.dmt_EditorControl.openDocument(uuid);
  await new Promise(r => setTimeout(r, 4000));
  const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
  const ol = pl.filter(x => x.layer === 11);
  out[uuid] = ol.map(o => ({ keys: Object.keys(o), polygon: o.polygon, pts: o.points }));
}
return out;
