const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
const out = { groups: {}, samples: [] };
const walk = node => {
  if (!node) return;
  if (node.errorType) {
    const k = (node.errorType||'')+' / '+(node.errorObjType||'');
    out.groups[k] = (out.groups[k]||0)+1;
    if (out.samples.length < 12) out.samples.push({
      rule: k, o1: node.obj1?.suffix, o2: node.obj2?.suffix, layer: node.layer,
      min: node.erData?.minDistance ?? node.explanation?.param?.minDistance,
      should: node.explanation?.param?.shouldBe,
    });
    return;
  }
  if (node.list) for (const c of node.list) walk(c);
};
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch(e){} } else walk(a); }
out.total = Object.values(out.groups).reduce((a,b)=>a+b,0);
return out;
