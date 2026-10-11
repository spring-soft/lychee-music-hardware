const out = {};
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];

// 按网络统计：线宽、长度、层、过孔
const stat = {};
const need = {};
for (const l of lines) {
  const w = l.lineWidth ?? l.width ?? 0;
  const len = Math.abs(l.x1-l.x2) + Math.abs(l.y1-l.y2);
  const s = stat[l.net] ||= { segs:0, minW:1e9, maxW:0, len:0, layers:new Set(), vias:0 };
  s.segs++; s.minW = Math.min(s.minW, w); s.maxW = Math.max(s.maxW, w);
  s.len += len; s.layers.add(l.layer);
}
for (const v of vias) { const s = stat[v.net]; if (s) s.vias++; }
const POWER = ['VBUS','+5V','BAT+','SW_NODE','VCC','GND'];
const rows = Object.entries(stat).map(([n,s]) => ({
  net: n, segs: s.segs, widthMil: s.minW === s.maxW ? s.minW : s.minW+'-'+s.maxW,
  lengthMM: (s.len*0.0254).toFixed(1), layers: [...s.layers].sort((a,b)=>a-b).join('/'), vias: s.vias,
}));
rows.sort((a,b) => POWER.includes(b.net) - POWER.includes(a.net) || a.net.localeCompare(b.net));
out.powerNets = rows.filter(r => POWER.includes(r.net));
out.criticalNets = rows.filter(r => ['USB_DP','USB_DN','I2S_MCLK','I2S_BCLK','I2S_LRCK','I2S_DOUT','I2C_SDA','I2C_SCL','LOUT1','ROUT1','HP_L','HP_R'].includes(r.net));
out.keys = lines[0] ? Object.keys(lines[0]) : null;
out.totalLines = lines.length; out.totalVias = vias.length;
return out;
