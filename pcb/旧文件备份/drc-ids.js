const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3500));
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
const leaves = [];
const walk = n => { if(!n||typeof n!=='object')return;
  if(n.errorType && !n.list){ leaves.push(n); return; }
  if(n.list) for(const c of n.list) walk(c); };
for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch(e){} } else walk(a); }
// 找出违规对象里属于 GND 过孔的那个，打印它的坐标
const vias = await eda.pcb_PrimitiveVia.getAll() || [];
const out = [];
for (const n of leaves) {
  const ids = n.objs || [];
  for (const id of ids) {
    const v = vias.find(x => x.primitiveId === id);
    if (v) out.push({ 规则:n.errorType+'/'+n.errorObjType, 孔id:id, x:Math.round(v.x), y:Math.round(v.y), net:v.net });
  }
}
return { 涉事过孔: out, 违规总数: leaves.length };
