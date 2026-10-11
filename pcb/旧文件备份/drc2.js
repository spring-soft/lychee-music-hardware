const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
// 展平统计
const out = { rawTop: arr.length };
const walk = (node, path) => {
  if (!node) return;
  if (node.errorType) {
    const k = (node.errorType||'') + ' | ' + (node.errorObjType||'');
    out[k] = (out[k]||0)+1;
    (out.samples ||= []).push({ rule:(node.errorType||'')+' / '+(node.errorObjType||''),
      o1: node.obj1?.suffix, o2: node.obj2?.suffix, layer: node.layer,
      minDist: node.erData?.minDistance ?? node.explanation?.param?.minDistance,
      shouldBe: node.explanation?.param?.shouldBe });
    return;
  }
  if (node.list) for (const c of node.list) walk(c, path);
};
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch(e) {} } else walk(a); }
out.count = (out.samples||[]).length;
return out;
