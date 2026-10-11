const out = {};
const all = await eda.dmt_Pcb.getAllPcbsInfo() || [];
out.所有PCB = all.map(p => ({ name: p.name, uuid: p.uuid || p.id || p.pcbUuid }));
for (const uuid of ['197f3e3cc67e949b', 'ec13f49100d66f9f']) {
  const rec = { uuid };
  try {
    await eda.dmt_EditorControl.openDocument(uuid);
    let comps = null;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 2500));
      comps = await eda.pcb_PrimitiveComponent.getAll();
      if (comps && comps.length) break;
    }
    rec.元件数 = comps ? comps.length : 0;
    const xs = (comps || []).map(c => c.x), ys = (comps || []).map(c => c.y);
    rec.元件范围 = comps ? { x: Math.round(Math.min(...xs)) + '~' + Math.round(Math.max(...xs)),
                             y: Math.round(Math.min(...ys)) + '~' + Math.round(Math.max(...ys)) } : null;
    // 板框
    const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
    const ol = pl.filter(x => x.layer === 11);
    rec.板框线条数 = ol.length;
    let bb = null;
    for (const o of ol) {
      const pg = o.polygon;
      if (!Array.isArray(pg)) continue;
      let l = 1e9, r = -1e9, b = 1e9, t = -1e9, n = 0;
      for (let i = 0; i + 1 < pg.length; i += 2) {
        if (typeof pg[i] !== 'number' || typeof pg[i + 1] !== 'number') continue;
        l = Math.min(l, pg[i]); r = Math.max(r, pg[i]);
        b = Math.min(b, pg[i + 1]); t = Math.max(t, pg[i + 1]); n++;
      }
      if (!n) continue;
      if (!bb) bb = { l, r, b, t }; else {
        bb.l = Math.min(bb.l, l); bb.r = Math.max(bb.r, r);
        bb.b = Math.min(bb.b, b); bb.t = Math.max(bb.t, t);
      }
    }
    if (bb) {
      rec.板框 = { x: Math.round(bb.l) + '~' + Math.round(bb.r), y: Math.round(bb.b) + '~' + Math.round(bb.t),
                   尺寸: ((bb.r - bb.l) * 0.0254).toFixed(1) + '×' + ((bb.t - bb.b) * 0.0254).toFixed(1) + 'mm' };
    }
  } catch (e) { rec.err = String(e.message || e).slice(0, 100); }
  out[uuid] = rec;
}
return out;
