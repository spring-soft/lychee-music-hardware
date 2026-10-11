const out = { pads: [], comps: [], padKeys: null, compKeys: null, compSample: null, propNames: null };
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
out.compKeys = comps[0] ? Object.keys(comps[0]) : null;
out.compSample = comps[0] ? JSON.parse(JSON.stringify(comps[0])) : null;
try { out.propNames = await eda.pcb_PrimitiveComponent.getAllPropertyNames(); } catch(e){ out.propNames = 'ERR '+e.message; }

const pads = await eda.pcb_PrimitivePad.getAll() || [];
out.padKeys = pads[0] ? Object.keys(pads[0]) : null;
for (const p of pads) {
  out.pads.push({ n: p.number, x: p.x, y: p.y, l: p.layer, w: p.width, h: p.height,
                  sh: p.shape, hole: p.holeSize ?? p.holeDiameter ?? p.hole,
                  net: p.net, comp: p.designator ?? p.componentDesignator, rot: p.rotation });
}
for (const c of comps) out.comps.push({ d: c.designator, x: c.x, y: c.y, l: c.layer, rot: c.rotation,
  bw: c.width ?? c.bodyWidth, bh: c.height ?? c.bodyHeight, w: c.width, h: c.height });
return out;
