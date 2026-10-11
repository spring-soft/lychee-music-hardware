await eda.dmt_EditorControl.openDocument('2767acb0652b1dbe');
await new Promise(r=>setTimeout(r,4000));
const comps = await eda.sch_PrimitiveComponent.getAll() || [];
const u1 = comps.find(c => c.designator === 'U1');
const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(u1.primitiveId) || [];
const k = Object.keys(pins[0]);
const rec = {};
for (const key of k) { const v = pins[0][key]; if (typeof v !== 'function' && typeof v !== 'object') rec[key] = v; }
return { pinKeys: k, 第一脚标量字段: rec,
  全部引脚: pins.map(p => { const o = {}; for (const key of k) { const v=p[key];
    if (typeof v==='string'||typeof v==='number') o[key]=v; } return o; }) };
