// 不 openDocument，用当前文档
const out = {};
out.状态 = {
  走线: (await eda.pcb_PrimitiveLine.getAll() || []).length,
  过孔: (await eda.pcb_PrimitiveVia.getAll() || []).length,
  铺铜边框: (await eda.pcb_PrimitivePour.getAll() || []).length,
  已填充: (await eda.pcb_PrimitivePoured.getAll() || []).length,
};
let d = null;
try { d = await eda.pcb_Drc.check(true, false, true); } catch (e) { out.DRCerr = String(e && e.message || e).slice(0,120); }
if (d !== null && d !== undefined) {
  const arr = Array.isArray(d) ? d : (d === true ? [] : [d]);
  const leaves = []; const walk = n => { if (!n || typeof n !== 'object') return;
    if (n.errorType && !n.list) { leaves.push(n); return; } if (n.list) for (const c of n.list) walk(c); };
  for (const a of arr) { if (typeof a === 'string') { try { walk(JSON.parse(a)); } catch (e) {} } else walk(a); }
  out.DRC = { 总数: leaves.length };
  const cls = {}; for (const n of leaves) { const k=(n.errorType||'?')+'/'+(n.errorObjType||''); cls[k]=(cls[k]||0)+1; }
  out.DRC.分类 = cls;
}
let f = null;
try { f = await eda.pcb_ManufactureData.getGerberFile(); } catch (e) { out.gerberErr = String(e && e.message || e).slice(0,120); }
if (f) {
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = ''; const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
  out.文件 = { name: f.name, 字节: buf.length };
  out.b64 = btoa(bin);
}
return out;
