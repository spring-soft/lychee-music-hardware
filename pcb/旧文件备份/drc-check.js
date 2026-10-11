const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
// 先看实时DRC状态
let rt = null; try { rt = await eda.pcb_Drc.getRealTimeDrcStatus(); } catch(e){ rt='ERR'; }
// 详细模式
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
// 完整展平（含所有层级）
const leaves = [];
const walk = (node, path) => {
  if (!node || typeof node !== 'object') return;
  if (node.errorType) { leaves.push({ path, node }); return; }
  if (node.list) { for (const c of node.list) walk(c, path.concat(node.name || '')); return; }
  if (Array.isArray(node)) { for (const c of node) walk(c, path); return; }
};
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a), []); } catch(e){} } else walk(a, []); }
// 也跑一遍布尔模式
let pass = null; try { pass = await eda.pcb_Drc.check(true, false, false); } catch(e){ pass='ERR '+e.message; }
return {
  实时DRC: rt,
  布尔模式结果: pass,
  违规叶子数: leaves.length,
  违规分类: leaves.map(l => ({ 路径: l.path.filter(Boolean).join(' / '),
                              规则: l.node.errorType, 对象: l.node.errorObjType,
                              层: l.node.layer,
                              对象1: l.node.obj1?.suffix, 对象2: l.node.obj2?.suffix })),
};
