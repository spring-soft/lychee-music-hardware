const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const out = { tries: [] };
const T = async (label, fn) => {
  try { const r = await fn(); out.tries.push({ label, OK:true }); return r; }
  catch(e) { out.tries.push({ label, err: e.message.slice(0,70) }); return null; }
};
const poly = () => eda.pcb_MathPolygon.createPolygon([300,300,'L',1500,300,'L',1500,1200,'L',300,1200]);

// 对照组：修正参数后的 Via / Region
await T('Via (12,24) 正确顺序', () => eda.pcb_PrimitiveVia.create('GND', 900, 900, 12, 24, false));
await T('Region (layer,poly)', () => eda.pcb_PrimitiveRegion.create(16, poly()));

// 铺铜：逐步加参数
await T('pour 3参', () => eda.pcb_PrimitivePour.create('GND', 16, poly()));
await T('pour 4参', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), 'solid'));
await T('pour 5参', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), 'solid', false));
await T('pour 6参', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), 'solid', false, 'P1'));
await T('pour 7参', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), 'solid', false, 'P1', 5));
await T('pour 8参', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), 'solid', false, 'P1', 5, 10));
await T('pour 9参', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), 'solid', false, 'P1', 5, 10, false));
// 换层/换填充法
await T('pour 层1 solid', () => eda.pcb_PrimitivePour.create('GND', 1, poly(), 'solid', false, 'P2', 5, 10, false));
await T('pour 层16 90grid', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), '90grid', false, 'P3', 5, 10, false));
await T('pour 层16 45grid', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), '45grid', false, 'P4', 5, 10, false));
await T('pour 空网络', () => eda.pcb_PrimitivePour.create('', 16, poly(), 'solid', false, 'P5', 5, 10, false));
await T('pour 名空', () => eda.pcb_PrimitivePour.create('GND', 16, poly(), 'solid', false, '', 5, 10, false));
await new Promise(r=>setTimeout(r,1500));
out.counts = { vias:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
               regions:(await eda.pcb_PrimitiveRegion.getAll()||[]).length,
               pours:(await eda.pcb_PrimitivePour.getAll()||[]).length };
return out;
