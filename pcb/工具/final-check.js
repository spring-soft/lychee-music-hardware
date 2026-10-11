const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));
const out = {};
out.铺铜边框 = (await eda.pcb_PrimitivePour.getAll() || []).length;
const poured = await eda.pcb_PrimitivePoured.getAll() || [];
out.填充体 = poured.length;
const byLayer = {};
for (const p of poured) byLayer['层' + p.layer] = (byLayer['层' + p.layer] || 0) + 1;
out.填充分层 = byLayer;
out.走线 = (await eda.pcb_PrimitiveLine.getAll() || []).length;
out.过孔 = (await eda.pcb_PrimitiveVia.getAll() || []).length;
// DRC
let details = null;
try { details = await eda.pcb_Drc.check(true, false, true); } catch (e) { out.DRCerr = String(e && e.message || e).slice(0, 120); }
if (details !== null) {
  const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
  const leaves = [];
  const walk = n => { if (!n || typeof n !== 'object') return;
    if (n.errorType && !n.list) { leaves.push(n); return; } if (n.list) for (const c of n.list) walk(c); };
  for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch (e) {} } else walk(a); }
  out.DRC总报错 = leaves.length;
  const cls = {};
  for (const n of leaves) { const k = (n.errorType || '?') + '/' + (n.errorObjType || ''); cls[k] = (cls[k] || 0) + 1; }
  out.DRC分类 = cls;
  out.明细 = leaves.slice(0, 10).map(n => ({ rule: (n.errorType||'')+'/'+(n.errorObjType||''), layer: n.layer,
    x: n.pos ? Math.round(n.pos.x) : null, y: n.pos ? Math.round(n.pos.y) : null,
    a: n.obj1 ? (n.obj1.suffix || n.obj1.typeName) : null, b: n.obj2 ? (n.obj2.suffix || n.obj2.typeName) : null }));
}
return out;
