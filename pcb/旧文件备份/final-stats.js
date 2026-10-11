const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const pours = await eda.pcb_PrimitivePour.getAll() || [];
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const nets  = await eda.pcb_Net.getAllNetName() || [];
const stat = {};
for (const l of lines) {
  const s = stat[l.net] ||= { segs:0, min:1e9, max:0, len:0, layers:new Set(), vias:0 };
  s.segs++; s.min=Math.min(s.min,l.lineWidth); s.max=Math.max(s.max,l.lineWidth);
  s.len += Math.hypot(l.endX-l.startX, l.endY-l.startY); s.layers.add(l.layer);
}
for (const v of vias) { const s = stat[v.net]; if (s) s.vias++; }
const perLayer={}; for(const l of lines) perLayer['L'+l.layer]=(perLayer['L'+l.layer]||0)+1;
const viaByLayer={}; 
const byNetVias={}; for(const v of vias) byNetVias[v.net]=(byNetVias[v.net]||0)+1;
const mk = n => { const s=stat[n]; if(!s) return {net:n,segs:0};
  return { net:n, segs:s.segs, 线宽mil:+(s.min).toFixed(1)+(s.max-s.min>0.5?'~'+s.max.toFixed(1):''),
           长度mm:+(s.len*0.0254).toFixed(1), 层:[...s.layers].sort((a,b)=>a-b).join('/'), 过孔:s.vias }; };
return {
  板框: '2283 x 1969 mil = 58.0 x 50.0 mm',
  元件数: comps.length,
  正面元件: comps.filter(c=>c.layer===1).length,
  背面元件: comps.filter(c=>c.layer===2).length,
  网络总数: nets.length,
  走线段数: lines.length,
  走线各层: perLayer,
  过孔总数: vias.length,
  过孔按网络: byNetVias,
  铺铜: pours.map(x=>({net:x.net, 层:x.layer, 名称:x.pourName, 填充法:x.pourFillMethod})),
  关键网络: ['BAT+','VBUS','+5V','SW_NODE','VCC','GND','USB_DP','USB_DN','I2S_MCLK','I2S_BCLK','I2S_LRCK','I2S_DOUT','I2C_SDA','I2C_SCL','LOUT1','ROUT1','HP_L','HP_R','VREF','VMID','AVDD','HPVDD'].map(mk),
};
