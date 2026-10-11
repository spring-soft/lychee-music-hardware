const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 4000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
// V1 那条顶层通道: y 约 1639, x 128~1450
const band = lines.filter(l => l.layer === 1 &&
  Math.min(l.startY, l.endY) < 1700 && Math.max(l.startY, l.endY) > 1580 &&
  Math.min(l.startX, l.endX) < 1500 && Math.max(l.startX, l.endX) > 100);
const byNet = {};
for (const l of band) {
  const k = l.net;
  if (!byNet[k]) byNet[k] = [];
  byNet[k].push([Math.round(l.startX), Math.round(l.startY), Math.round(l.endX), Math.round(l.endY)].join(','));
}
const top = {};
for (const l of lines) if (l.layer === 1) top[l.net] = (top[l.net] || 0) + 1;
const topSorted = Object.keys(top).sort((a, b) => top[b] - top[a]).slice(0, 8)
  .map(n => n + ':' + top[n]);
return {
  顶层走线总数: lines.filter(l => l.layer === 1).length,
  V1通道带内顶层走线: byNet,
  顶层段数最多: topSorted,
};
