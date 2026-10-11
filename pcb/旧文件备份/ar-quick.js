const lines = await eda.pcb_PrimitiveLine.getAll() || [];
return { lines: lines.length, vias: (await eda.pcb_PrimitiveVia.getAll()||[]).length };
