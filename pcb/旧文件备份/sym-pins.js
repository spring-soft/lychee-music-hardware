const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const u1 = comps.find(c => c.designator === 'U1');
if (!u1) return { err: 'U1 not found' };
const out = { U1器件: u1.component, 封装: u1.footprint };
// 用器件的 symbol uuid 拿符号源文件
try {
  const symUuid = u1.component?.uuid?.uuid;
  out.symbolUuid = symUuid;
  const dev = await eda.lib_Device.get(u1.component.uuid);
  out.deviceKeys = dev ? Object.keys(dev) : null;
  out.device = JSON.stringify(dev).slice(0, 600);
} catch(e) { out.devErr = e.message.slice(0,80); }
return out;
