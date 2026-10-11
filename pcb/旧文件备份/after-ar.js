const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,2500));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const nets = {};
for (const l of lines) { if (l.net) nets[l.net] = (nets[l.net]||0)+1; }
const layers = {};
for (const l of lines) layers['L'+l.layer] = (layers['L'+l.layer]||0)+1;
return {
  lines: lines.length, vias: vias.length,
  netsWithTraces: Object.keys(nets).length,
  perLayer: layers,
  netList: Object.keys(nets).sort(),
  sample: lines.slice(0,3),
};
