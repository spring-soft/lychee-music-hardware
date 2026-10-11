const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const allNets = await eda.pcb_Net.getAllNetName() || [];
const stat = {};
for (const l of lines) {
  const s = stat[l.net] ||= { segs:0, minW:1e9, maxW:0, len:0, layers:new Set(), vias:0 };
  s.segs++; s.minW=Math.min(s.minW,l.lineWidth); s.maxW=Math.max(s.maxW,l.lineWidth);
  s.len += Math.hypot(l.endX-l.startX, l.endY-l.startY); s.layers.add(l.layer);
}
for (const v of vias) { const s = stat[v.net]; if (s) s.vias++; }
const perLayer = {}; for (const l of lines) perLayer['L'+l.layer]=(perLayer['L'+l.layer]||0)+1;
const routed = Object.keys(stat);
const missing = allNets.filter(n => !routed.includes(n));
const mk = n => { const s=stat[n]; if(!s) return n.padEnd(10)+' 未布线'; 
  return n.padEnd(10)+String(s.segs).padEnd(6)+(s.minW===s.maxW?s.minW.toFixed(1):s.minW.toFixed(1)+'~'+s.maxW.toFixed(1)).padEnd(12)
    +(s.len*0.0254).toFixed(1).padEnd(8)+[...s.layers].sort((a,b)=>a-b).join('/').padEnd(8)+s.vias; };
const WATCH=['SW_NODE','BAT+','VBUS','+5V','VCC','GND','USB_DP','USB_DN',
  'I2S_MCLK','I2S_BCLK','I2S_LRCK','I2S_DOUT','I2C_SDA','I2C_SCL','LOUT1','ROUT1','HP_L','HP_R'];
return { 线段总数: lines.length, 过孔总数: vias.length, 各层线段: perLayer,
  已布网络数: routed.length, 网络总数: allNets.length, 未布网络: missing,
  关键网络: WATCH.map(mk) };
