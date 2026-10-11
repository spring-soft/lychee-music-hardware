const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
// 目标线宽（mil）：1mm=39.37mil
const TARGET = { 'BAT+':24, 'VBUS':24, '+5V':24, 'SW_NODE':30 };
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const backup = [];
let changed = 0;
for (const l of lines) {
  const t = TARGET[l.net];
  if (!t) continue;
  if (Math.abs(l.lineWidth - t) < 0.5) continue;
  backup.push({ id: l.primitiveId, net: l.net, w: l.lineWidth });
  try { await eda.pcb_PrimitiveLine.modify(l.primitiveId, { lineWidth: t }); changed++; } catch(e) {}
}
await new Promise(r=>setTimeout(r,1500));
const after = await eda.pcb_PrimitiveLine.getAll() || [];
const stat = {};
for (const l of after) { if (TARGET[l.net]) (stat[l.net] ||= []).push(l.lineWidth); }
const summary = {};
for (const [n, arr] of Object.entries(stat)) summary[n] = { 段数: arr.length, 最小: Math.min(...arr), 最大: Math.max(...arr) };
return { 改动段数: changed, 结果: summary,
         备份: backup.length + ' 段的原始线宽已记录' };
