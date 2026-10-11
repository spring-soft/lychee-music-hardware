const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
return { lineKeys: lines[0] ? Object.keys(lines[0]) : null, lineSample: lines[0],
         viaKeys: vias[0] ? Object.keys(vias[0]) : null, viaSample: vias[0] };
