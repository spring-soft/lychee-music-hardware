const PCB1 = '197f3e3cc67e949b';   // V1
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,4000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const bl = lines.filter(l => l.net === 'I2S_BCLK');
// 按层分组，列出每段的起止
const byLayer = {};
for (const l of bl) (byLayer[l.layer] = byLayer[l.layer] || []).push(
  Math.round(l.startX)+','+Math.round(l.startY)+' → '+Math.round(l.endX)+','+Math.round(l.endY));
const vias = (await eda.pcb_PrimitiveVia.getAll()||[]).filter(v=>v.net==='I2S_BCLK');
return { 段数: bl.length, 按层: byLayer,
         过孔: vias.map(v=>Math.round(v.x)+','+Math.round(v.y)) };
