const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const nets  = await eda.pcb_Net.getAllNetName() || [];
const routed = new Set(lines.map(l=>l.net));
const perLayer = {}; for(const l of lines) perLayer['L'+l.layer]=(perLayer['L'+l.layer]||0)+1;
// 每个网络有多少段
const seg = {}; for(const l of lines) seg[l.net]=(seg[l.net]||0)+1;
return {
  走线: lines.length, 过孔: vias.length, 各层: perLayer,
  已布网络: routed.size, 总网络: nets.length,
  未布网络: nets.filter(n=>!routed.has(n)),
  新网络状态: ['TF_CS','TF_MISO','TF_CD'].map(n=>n+': '+(routed.has(n)?(seg[n]+'段'):'❌未布')),
  各网络段数: Object.entries(seg).sort((a,b)=>a[1]-b[1]).slice(0,10),
};
