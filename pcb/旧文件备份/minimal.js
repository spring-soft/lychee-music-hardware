const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const out = { tries: [] };
const T = async (label, fn) => { try { const r = await fn(); out.tries.push({label, OK:!!r}); return r; }
  catch(e) { out.tries.push({label, err:e.message.slice(0,70)}); return null; } };

await T('Via 最小5参', () => eda.pcb_PrimitiveVia.create('GND', 900, 900, 12, 24));
await T('Via 加viaType=0', () => eda.pcb_PrimitiveVia.create('GND', 950, 900, 12, 24, 0));
await T('Line 对照', () => eda.pcb_PrimitiveLine.create('GND', 15, 100, 100, 300, 100, 10, false));
await T('Pour 最小3参(层1)', () => eda.pcb_PrimitivePour.create('GND', 1, eda.pcb_MathPolygon.createPolygon(['R',300,300,800,600,0,0])));

// 测 modify：能不能改已存在的走线宽度
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const target = lines.find(l => l.net === 'BAT+');
if (target) {
  out.batWidthBefore = target.lineWidth;
  await T('modify 改线宽', () => eda.pcb_PrimitiveLine.modify(target.primitiveId, { lineWidth: 24 }));
  await new Promise(r=>setTimeout(r,800));
  const after = (await eda.pcb_PrimitiveLine.getAll() || []).find(x => x.primitiveId === target.primitiveId);
  out.batWidthAfter = after ? after.lineWidth : 'gone';
}
out.counts = { vias:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
               pours:(await eda.pcb_PrimitivePour.getAll()||[]).length };
return out;
