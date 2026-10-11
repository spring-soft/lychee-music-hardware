const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const power = ['VCC', 'GND', '+5V', 'BAT+', 'VBUS'];
const rows = [];
for (const l of lines) {
  if (l.lineWidth >= 9.5) continue;
  if (!power.includes(l.net)) continue;
  const d = Math.hypot(l.endX - l.startX, l.endY - l.startY);
  rows.push({ net: l.net, len: +d.toFixed(0), x: Math.round(l.startX), y: Math.round(l.startY) });
}
rows.sort((a, b) => b.len - a.len);
return { 细电源段数: rows.length, 最长几段: rows.slice(0, 12),
  合计长度: rows.reduce((s, r) => s + r.len, 0), 平均: Math.round(rows.reduce((s, r) => s + r.len, 0) / rows.length) };
