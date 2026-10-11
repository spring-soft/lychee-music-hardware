const out = { enums: {}, layers: [], counts: {} };
for (const n of ['EPCB_AutoRoutingCornerStyle','EPCB_AutoRoutingExistingPrimitiveMode','EPCB_AutoRoutingOptimization','EPCB_LayerId','EPCB_LayerType']) {
  try {
    const e = eda[n];
    out.enums[n] = e ? Object.keys(e).map(k => k + '=' + JSON.stringify(e[k])).slice(0, 80) : 'undefined';
  } catch (err) { out.enums[n] = 'ERR ' + err.message; }
}
try {
  const L = await eda.pcb_Layer.getAll();
  out.layers = (L || []).map(l => ({ id: l.id, name: l.name, type: l.type, status: l.status }));
} catch (e) { out.layers = 'ERR ' + e.message; }
try { out.counts.traces = (await eda.pcb_PrimitiveLine.getAll())?.length ?? -1; } catch(e){ out.counts.traces = 'ERR '+e.message; }
try { out.counts.vias = (await eda.pcb_PrimitiveVia.getAll())?.length ?? -1; } catch(e){ out.counts.vias = 'ERR '+e.message; }
try { out.counts.pours = (await eda.pcb_PrimitivePour.getAll())?.length ?? -1; } catch(e){ out.counts.pours = 'ERR '+e.message; }
try { out.counts.components = (await eda.pcb_PrimitiveComponent.getAll())?.length ?? -1; } catch(e){ out.counts.components = 'ERR '+e.message; }
try { const n = await eda.pcb_Net.getAll(); out.netCount = (n||[]).length; out.netNames = (n||[]).map(x=>x.name||x).slice(0,80); } catch(e){ out.netCount = 'ERR '+e.message; }
return out;
