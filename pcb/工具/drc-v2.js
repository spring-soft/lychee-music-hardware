const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));
let details = null, err = null;
try { details = await eda.pcb_Drc.check(true, false, true); } catch (e) { err = String(e && e.message || e).slice(0, 200); }
if (err) return { err };
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
const leaves = [];
const walk = node => {
  if (!node || typeof node !== 'object') return;
  if (node.errorType && !node.list) { leaves.push(node); return; }
  if (node.list) for (const c of node.list) walk(c);
};
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch (e) {} } else walk(a); }
const out = { 总数: leaves.length };
const byRule = {};
for (const n of leaves) {
  const k = (n.errorType || '?') + '/' + (n.errorObjType || '');
  byRule[k] = byRule[k] || [];
  byRule[k].push(n);
}
out.按类型 = Object.fromEntries(Object.entries(byRule).map(([k, v]) => [k, v.length]));
out.明细 = leaves.map(n => ({
  rule: (n.errorType || '') + '/' + (n.errorObjType || ''),
  layer: n.layer,
  x: n.pos ? Math.round(n.pos.x) : null, y: n.pos ? Math.round(n.pos.y) : null,
  msg: String(n.message || n.errorMsg || n.desc || '').slice(0, 120),
  obj: n.obj1 ? (n.obj1.suffix || n.obj1.typeName) : (n.objs || null),
  obj2: n.obj2 ? (n.obj2.suffix || n.obj2.typeName) : null,
}));
return out;
