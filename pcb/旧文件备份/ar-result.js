const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3500));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const nets  = await eda.pcb_Net.getAllNetName() || [];
const stat = {};
for (const l of lines) {
  const s = stat[l.net] ||= { segs:0, min:1e9, max:0, len:0, layers:new Set(), vias:0 };
  s.segs++; s.min=Math.min(s.min,l.lineWidth); s.max=Math.max(s.max,l.lineWidth);
  s.len += Math.hypot(l.endX-l.startX, l.endY-l.startY); s.layers.add(l.layer);
}
for (const v of vias) { const s = stat[v.net]; if (s) s.vias++; }
const perLayer={}; for(const l of lines) perLayer['L'+l.layer]=(perLayer['L'+l.layer]||0)+1;
const widths={}; for(const l of lines) widths[l.lineWidth.toFixed(1)]=(widths[l.lineWidth.toFixed(1)]||0)+1;
const routed = Object.keys(stat);
const mk = n => { const s=stat[n]; if(!s) return {net:n,segs:0};
  return { net:n, segs:s.segs, 线宽:+(s.min).toFixed(1)+(s.max-s.min>0.5?'~'+s.max.toFixed(1):''),
           长度mm:+(s.len*0.0254).toFixed(1), 层:[...s.layers].sort((a,b)=>a-b).join('/'), 过孔:s.vias }; };
// 保存本次结果
let saved = null; try { saved = await eda.pcb_Document.save(); } catch(e){ saved = 'ERR'; }
return { 走线: lines.length, 过孔: vias.length, 各层: perLayer, 线宽分布: widths,
  已布网络: routed.length, 总网络: nets.length, 未布网络: nets.filter(n=>!routed.includes(n)),
  已保存: saved === undefined ? true : saved,
  关键网络: ['SW_NODE','BAT+','VBUS','+5V','VCC','GND','USB_DP','USB_DN','I2S_MCLK','I2S_BCLK','I2S_LRCK','I2S_DOUT','I2C_SDA','I2C_SCL','LOUT1','ROUT1','HP_L','HP_R'].map(mk) };
