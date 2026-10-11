const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));
const out = { counts: {}, hit: null };
for (const api of Object.keys(eda).filter(s => /^pcb_Primitive|^pcb_/i.test(s))) {
  let g = null;
  try { g = await eda[api].getAll(); } catch (e) { continue; }
  if (!Array.isArray(g) || !g.length) continue;
  out.counts[api] = g.length;
  const h = g.find(o => o && o.primitiveId === 'e85e43');
  if (h) out.hit = { api, obj: JSON.parse(JSON.stringify(h)) };
}
if (!out.hit) {
  // 退一步：列出所有 layer 非 1/2/11 的图元
  const odd = [];
  for (const api of Object.keys(eda).filter(s => /^pcb_Primitive/i.test(s))) {
    let g = null;
    try { g = await eda[api].getAll(); } catch (e) { continue; }
    if (!Array.isArray(g)) continue;
    for (const o of g) if (o && ![1, 2, 11].includes(o.layer)) odd.push({ api, id: o.primitiveId, layer: o.layer });
  }
  out.非信号层图元 = odd.slice(0, 40);
}
return out;
