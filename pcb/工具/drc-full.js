const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
const leaves = [];
const walk = node => {
  if (!node || typeof node !== 'object') return;
  if (node.errorType && !node.list) { leaves.push(node); return; }
  if (node.list) for (const c of node.list) walk(c);
};
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch(e){} } else walk(a); }
return leaves.map(n => ({
  rule: (n.errorType||'')+'/'+(n.errorObjType||''),
  layer: n.layer,
  pos: n.pos ? { x: Math.round(n.pos.x*1000)/1000, y: Math.round(n.pos.y*1000)/1000 } : null,
  objs: n.objs || null,
  o1: n.obj1 ? { t: n.obj1.typeName, s: n.obj1.suffix } : null,
  o2: n.obj2 ? { t: n.obj2.typeName, s: n.obj2.suffix } : null,
}));
