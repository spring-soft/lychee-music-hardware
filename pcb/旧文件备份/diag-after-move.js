const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const nets = {};
for (const l of lines) nets[l.net] = (nets[l.net]||0)+1;
const all = await eda.pcb_Net.getAllNetName() || [];
const routed = Object.keys(nets);
const unrouted = all.filter(n => !routed.includes(n));
return {
  totalLines: lines.length,
  routedNetCount: routed.length,
  unroutedNets: unrouted,
  gndSegs: nets['GND'] || 0,
};
