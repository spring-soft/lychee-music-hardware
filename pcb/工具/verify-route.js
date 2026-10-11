const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));
const out = {};
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias = await eda.pcb_PrimitiveVia.getAll() || [];
out.走线数 = lines.length;
out.过孔数 = vias.length;
const byLayer = {}; for (const l of lines) byLayer['层' + l.layer] = (byLayer['层' + l.layer] || 0) + 1;
out.走线分层 = byLayer;
// 线宽：找出真正的字段名
out.走线字段 = lines[0] ? Object.keys(lines[0]) : null;
const wOf = l => l.width ?? l.lineWidth ?? l.trackWidth ?? l.w;
const widths = {};
for (const l of lines) { const w = wOf(l); widths[w] = (widths[w] || 0) + 1; }
out.线宽分布 = widths;
// 过孔
out.过孔字段 = vias[0] ? Object.keys(vias[0]) : null;
if (vias[0]) out.过孔样本 = JSON.parse(JSON.stringify(vias[0]));
// 长走线（可能绕远）
const len = [];
for (const l of lines) {
  const p = l.polygon && l.polygon.polygon ? l.polygon.polygon : l.polygon;
  if (!Array.isArray(p)) continue;
  let d = 0;
  for (let i = 0; i + 3 < p.length; i += 2)
    if (typeof p[i] === 'number' && typeof p[i+2] === 'number') d += Math.hypot(p[i+2]-p[i], p[i+3]-p[i+1]);
  len.push([Math.round(d), wOf(l), l.layer, p[0], p[1]]);
}
len.sort((a, b) => b[0] - a[0]);
out.最长走线 = len.slice(0, 6).map(x => x[0] + 'mil 宽' + x[1] + ' 层' + x[2] + ' @' + Math.round(x[3]) + ',' + Math.round(x[4]));
return out;
