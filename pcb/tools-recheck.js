const p = await eda.dmt_Pcb.getAllPcbsInfo();
const out = { 所有PCB: p.map(x=>x.name+' / '+x.uuid) };
const PCB = 'ec13f49100d66f9f';
const t = p.find(x=>x.uuid===PCB);
out.目标 = t ? t.name : '未找到';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,5000));
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const perLayer = {}; for(const l of lines) perLayer['L'+l.layer]=(perLayer['L'+l.layer]||0)+1;
return { ...out, 走线: lines.length, 过孔: vias.length, 元件: comps.length, 各层: perLayer,
         铺铜: (await eda.pcb_PrimitivePour.getAll()||[]).length };
