const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3500));
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
const leaves = [];
const walk = node => {
  if (!node || typeof node !== 'object') return;
  if (node.errorType && !node.list) { leaves.push(node); return; }
  if (node.list) for (const c of node.list) walk(c);
};
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch(e){} } else walk(a); }
const groups = {};
for (const n of leaves) { const k=(n.errorType||'')+' / '+(n.errorObjType||''); groups[k]=(groups[k]||0)+1; }
return { 违规总数: leaves.length, 分类: groups,
  明细: leaves.slice(0,12).map(n=>({ 规则:(n.errorType||'')+'/'+(n.errorObjType||''),
    对象1:n.obj1?.suffix, 对象2:n.obj2?.suffix, 层:n.layer })) };
