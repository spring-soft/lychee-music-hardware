const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const ec = comps.find(c => c.designator === 'EC1');
if (!ec) return { err:'EC1 not found' };
const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(ec.primitiveId) || [];
return {
  器件: ec.component && ec.component.uuid && ec.component.uuid.name,
  封装: ec.footprint && ec.footprint.name,
  模型3D: ec.model3D && ec.model3D.name,
  立创编号: ec.supplierId,
  引脚: pins.filter(p=>p.x!==undefined).map(p => 'pin'+p.number+' net='+p.net),
};
