const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,5000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const nets  = await eda.pcb_Net.getAllNetName() || [];
const routed = new Set(lines.map(l=>l.net));
const perLayer = {}; for(const l of lines) perLayer['L'+l.layer]=(perLayer['L'+l.layer]||0)+1;
// 每个网络段数
const seg = {}; for(const l of lines) seg[l.net]=(seg[l.net]||0)+1;
// 找出「只布了一部分」的网络：有焊盘但走线很少
return {
  走线: lines.length, 过孔: vias.length, 各层: perLayer,
  已布网络: routed.size, 总网络: nets.length,
  未布网络: nets.filter(n=>!routed.has(n)),
  段数最少的网络: Object.entries(seg).sort((a,b)=>a[1]-b[1]).slice(0,8).map(x=>x[0]+':'+x[1]),
  BCLK: seg['I2S_BCLK'] || 0,
};
