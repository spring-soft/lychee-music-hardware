const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const stat = {};
for (const l of lines) {
  const s = stat[l.net] ||= { segs:0, minW:1e9, maxW:0, len:0, layers:new Set(), vias:0 };
  s.segs++; s.minW = Math.min(s.minW, l.lineWidth); s.maxW = Math.max(s.maxW, l.lineWidth);
  s.len += Math.hypot(l.endX-l.startX, l.endY-l.startY); s.layers.add(l.layer);
}
for (const v of vias) { const s = stat[v.net]; if (s) s.vias++; }
const mk = n => { const s = stat[n]; if (!s) return {net:n, missing:true};
  return { net:n, segs:s.segs, w:+(s.minW).toFixed(1) + (s.maxW-s.minW>0.5 ? '~'+s.maxW.toFixed(1):''),
           lenMM:+(s.len*0.0254).toFixed(1), layers:[...s.layers].sort((a,b)=>a-b).join('/'), vias:s.vias }; };
const WATCH = ['SW_NODE','BAT+','VBUS','+5V','VCC','USB_DP','USB_DN',
               'I2S_MCLK','I2S_BCLK','I2S_LRCK','I2S_DOUT','I2C_SDA','I2C_SCL',
               'LOUT1','ROUT1','HP_L','HP_R','AVDD','HPVDD','VREF','VMID'];
const table = WATCH.map(mk);
// 层占用统计
const perLayer = {};
for (const l of lines) perLayer['L'+l.layer] = (perLayer['L'+l.layer]||0)+1;
const viaPerLayer = {};
// 该网络在哪些层有线（用于判断交叉）
return { table, perLayer, totalLines: lines.length, totalVias: vias.length };
