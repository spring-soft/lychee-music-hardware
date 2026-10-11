const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const allNets = await eda.pcb_Net.getAllNetName() || [];
const perLayer = {}, widths = {}, stat = {};
for (const l of lines) {
  perLayer['L'+l.layer] = (perLayer['L'+l.layer]||0)+1;
  widths[l.lineWidth.toFixed(1)] = (widths[l.lineWidth.toFixed(1)]||0)+1;
  const s = stat[l.net] ||= { segs:0, min:1e9, max:0, len:0, layers:new Set(), vias:0 };
  s.segs++; s.min=Math.min(s.min,l.lineWidth); s.max=Math.max(s.max,l.lineWidth);
  s.len += Math.hypot(l.endX-l.startX, l.endY-l.startY); s.layers.add(l.layer);
}
for (const v of vias) { const s = stat[v.net]; if (s) s.vias++; }
const routed = Object.keys(stat);
const mk = n => { const s=stat[n]; if(!s) return n.padEnd(10)+' 未布线';
  return n.padEnd(10)+String(s.segs).padEnd(6)+(s.min===s.max?s.min.toFixed(1):s.min.toFixed(1)+'~'+s.max.toFixed(1)).padEnd(12)
    +(s.len*0.0254).toFixed(1).padEnd(8)+[...s.layers].sort((a,b)=>a-b).join('/').padEnd(8)+s.vias; };
const rules = await eda.pcb_Drc.getNetRules() || [];
const rw = {}; for (const r of rules) if (['BAT+','VBUS','+5V','SW_NODE'].includes(r.name)) rw[r.name]=r['Track'];
return { 线段: lines.length, 过孔: vias.length, 各层: perLayer, 线宽分布: widths,
  已布: routed.length, 总数: allNets.length, 未布: allNets.filter(n=>!routed.includes(n)),
  规则当前值: rw,
  关键网络: ['SW_NODE','BAT+','VBUS','+5V','VCC','GND','USB_DP','USB_DN','I2S_MCLK','I2S_BCLK','I2S_LRCK','I2S_DOUT','I2C_SDA','I2C_SCL','LOUT1','ROUT1','HP_L','HP_R'].map(mk) };
