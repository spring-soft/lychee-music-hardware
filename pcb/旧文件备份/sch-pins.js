// 从原理图读 U1 的引脚名（权威的 引脚号→GPIO 对应）
const docs = await eda.dmt_Schematic.getAllSchematicsInfo();
await eda.dmt_EditorControl.openDocument(docs[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const comps = await eda.sch_PrimitiveComponent.getAll() || [];
const u1 = comps.find(c => c.designator === 'U1');
if (!u1) return { err: 'U1 未找到', 现有位号: comps.map(c=>c.designator).slice(0,60) };
const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(u1.primitiveId) || [];
return { U1名称: u1.name,
  引脚: pins.map(p => ({ 号: p.number, 名: p.name, 网络: p.net }))
          .sort((a,b)=>{ const x=parseInt(a.号),y=parseInt(b.号); return (isNaN(x)?999:x)-(isNaN(y)?999:y); }) };
