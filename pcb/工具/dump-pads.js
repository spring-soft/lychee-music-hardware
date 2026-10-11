const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const rows = [];
for (const c of comps) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  for (const p of pins) {
    if (p.x === undefined) continue;
    rows.push({
      d: c.designator, lay: c.layer, rot: c.rotation,
      cx: Math.round(c.x), cy: Math.round(c.y),
      n: p.number ?? p.padNumber ?? p.name ?? '?',
      x: Math.round(p.x), y: Math.round(p.y), l: p.layer,
      net: p.net ?? p.netName ?? '',
    });
  }
}
rows.sort((a,b)=> a.d.localeCompare(b.d, undefined, {numeric:true}) || String(a.n).localeCompare(String(b.n), undefined, {numeric:true}));
return { count: rows.length, rows };
