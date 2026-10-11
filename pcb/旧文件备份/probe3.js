const out = {};
out.copperLayers = await eda.pcb_Layer.getTheNumberOfCopperLayers();
const L = await eda.pcb_Layer.getAllLayers();
out.layers = (L||[]).map(l => ({ id:l.id, name:l.name, type:l.type, status:l.status }));
out.stackup = await eda.pcb_Layer.getCurrentPhysicalStackingConfiguration?.() ?? 'n/a';
return out;
