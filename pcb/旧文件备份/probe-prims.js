const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = {};
const g = async (fn, name) => { try { const v = await fn(); out[name] = Array.isArray(v) ? v.length : v; } catch(e){ out[name] = 'ERR '+e.message; } };
await g(()=>eda.pcb_PrimitiveFill.getAll(), 'fills');
await g(()=>eda.pcb_PrimitiveRegion.getAll(), 'regions');
await g(()=>eda.pcb_PrimitivePour.getAll(), 'pours');
await g(()=>eda.pcb_PrimitivePolyline.getAll(), 'polylines');
await g(()=>eda.pcb_PrimitiveLine.getAll(), 'lines');
await g(()=>eda.pcb_PrimitiveVia.getAll(), 'vias');
await g(()=>eda.pcb_PrimitiveArc.getAll(), 'arcs');
await g(()=>eda.pcb_PrimitiveString.getAll(), 'strings');
await g(()=>eda.pcb_PrimitiveDimension.getAll(), 'dims');
// 列出 polyline 的层和包围盒
try {
  const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
  out.polylineDetail = pl.slice(0,15).map(x => ({ layer:x.layer, points: (x.polyline||x.points||[]).length,
    net:x.net, first: (x.polyline||x.points||[]).slice(0,4) }));
} catch(e){ out.polylineDetail = 'ERR '+e.message; }
return out;
