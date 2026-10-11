await eda.dmt_EditorControl.openDocument('2767acb0652b1dbe');
await new Promise(r=>setTimeout(r,4000));
const comps = await eda.sch_PrimitiveComponent.getAll() || [];
const u1 = comps.find(c => c.designator === 'U1');
const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(u1.primitiveId) || [];
// PCB 里的网络（原理图 pin 上没有 net，从 PCB 侧对齐）
const list = pins.map(p => ({ n: parseInt(p.pinNumber), name: p.pinName }))
  .filter(p=>!isNaN(p.n)).sort((a,b)=>a.n-b.n);
return list.map(p => p.n + '|' + p.name).join('\n');
