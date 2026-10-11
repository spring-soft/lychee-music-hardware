const lines = await eda.pcb_PrimitiveLine.getAll() || [];
return { count: lines.length, nets: [...new Set(lines.map(l=>l.net))], sample: lines.slice(0,5) };
