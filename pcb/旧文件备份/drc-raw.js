const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
// 展平成「叶子」节点并保留完整字段
const leaves = [];
const walk = node => {
  if (!node || typeof node !== 'object') return;
  if (node.errorType && !node.list) { leaves.push(node); return; }
  if (node.list) for (const c of node.list) walk(c);
  else if (Array.isArray(node)) for (const c of node) walk(c);
};
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch(e){} } else walk(a); }
return { count: leaves.length, leaves: leaves.slice(0, 4) };
