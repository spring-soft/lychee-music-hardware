const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
const out = [];
const walk = node => {
  if (!node) return;
  if (node.errorType) {
    out.push({ rule:(node.errorType||'')+'/'+(node.errorObjType||''),
               layer: node.layer, min: node.erData?.minDistance,
               should: node.explanation?.param?.shouldBe,
               id1: node.erData?.obj1, id2: node.erData?.obj2,
               t1: node.erData?.obj1Type, t2: node.erData?.obj2Type,
               s1: node.obj1?.suffix, s2: node.obj2?.suffix });
    return;
  }
  if (node.list) for (const c of node.list) walk(c);
};
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch(e){} } else walk(a); }
return { count: out.length, violations: out };
