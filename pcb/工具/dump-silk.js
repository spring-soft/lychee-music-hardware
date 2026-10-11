const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 5000));
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
const byLayer = {};
for (const o of pl) {
  const L = o.layer;
  const pg = o.polygon && o.polygon.polygon ? o.polygon.polygon : o.polygon;
  if (!Array.isArray(pg)) continue;
  let l = 1e9, r = -1e9, b = 1e9, t = -1e9, n = 0;
  for (let i = 0; i + 1 < pg.length; i += 2) {
    if (typeof pg[i] !== 'number' || typeof pg[i + 1] !== 'number') continue;
    l = Math.min(l, pg[i]); r = Math.max(r, pg[i]); b = Math.min(b, pg[i+1]); t = Math.max(t, pg[i+1]); n++;
  }
  if (!n) continue;
  (byLayer[L] = byLayer[L] || []).push({ l: Math.round(l), r: Math.round(r), b: Math.round(b), t: Math.round(t),
     w: Math.round(r-l), h: Math.round(t-b), id: o.primitiveId });
}
const out = {};
for (const L of Object.keys(byLayer)) out['层' + L] = { 条数: byLayer[L].length, 前30条: byLayer[L].slice(0, 30) };
return out;
