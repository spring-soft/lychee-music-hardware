// 不 openDocument，避免重载
let details = null, err = null;
try { details = await eda.pcb_Drc.check(true, false, true); } catch (e) { err = String(e && e.message || e).slice(0, 200); }
if (err) return { err };
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
const leaves = [];
const walk = n => { if (!n || typeof n !== 'object') return;
  if (n.errorType && !n.list) { leaves.push(n); return; }
  if (n.list) for (const c of n.list) walk(c); };
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch (e) {} } else walk(a); }
const byRule = {};
for (const n of leaves) { const k = (n.errorType || '?') + '/' + (n.errorObjType || ''); (byRule[k] = byRule[k] || []).push(n); }
const out = { 总报错: leaves.length, 分类: {} };
for (const [k, v] of Object.entries(byRule)) out.分类[k] = v.length;
out.非连接类明细 = leaves.filter(n => !/Connection/.test(n.errorType || '')).slice(0, 20).map(n => ({
  rule: (n.errorType || '') + '/' + (n.errorObjType || ''), layer: n.layer,
  x: n.pos ? Math.round(n.pos.x) : null, y: n.pos ? Math.round(n.pos.y) : null,
  a: n.obj1 ? (n.obj1.suffix || n.obj1.typeName) : null,
  b: n.obj2 ? (n.obj2.suffix || n.obj2.typeName) : null }));
out.未连网络的样本 = leaves.filter(n => /Connection/.test(n.errorType || '')).slice(0, 12)
  .map(n => (n.obj1 ? n.obj1.suffix : '?'));
return out;
