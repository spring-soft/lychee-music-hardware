const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias = await eda.pcb_PrimitiveVia.getAll() || [];
const thin = {};
for (const l of lines) if (l.lineWidth < 9.5) thin[l.net] = (thin[l.net] || 0) + 1;
const out = { 细线网络: thin };
const v = {};
for (const x of vias) { const k = (x.holeDiameter ?? '?') + '孔/' + (x.diameter ?? '?') + '盘'; v[k] = (v[k] || 0) + 1; }
out.过孔规格 = v;
// VCC / GND / +5V / BAT+ / VBUS 的线宽
const power = ['VCC', 'GND', '+5V', 'BAT+', 'VBUS', 'SW_NODE'];
const pw = {};
for (const l of lines) if (power.includes(l.net)) {
  const k = l.net + ' ' + (l.lineWidth < 9.5 ? '细' : '粗') + ' ' + Math.round(l.lineWidth * 100) / 100;
  pw[k] = (pw[k] || 0) + 1;
}
out.电源网络线宽 = pw;
return out;
