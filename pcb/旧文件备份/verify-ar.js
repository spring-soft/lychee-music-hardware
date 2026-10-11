const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x=>x.uuid===PCB1);
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,4000));
const lines = await eda.pcb_PrimitiveLine.getAll()||[];
const vias  = await eda.pcb_PrimitiveVia.getAll()||[];
const nets  = await eda.pcb_Net.getAllNetName()||[];
const routed = new Set(lines.map(l=>l.net));
const perLayer={}; for(const l of lines) perLayer['L'+l.layer]=(perLayer['L'+l.layer]||0)+1;
return { 走线: lines.length, 过孔: vias.length, 各层: perLayer,
         已布网络: routed.size, 总网络: nets.length,
         未布: nets.filter(n=>!routed.has(n)) };
