const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x => x.uuid === PCB1) || p[0];
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,3000));
const W = { 'BAT+':0.61, 'VBUS':0.61, '+5V':0.61, 'SW_NODE':0.762, 'VCC':0.254, 'GND':0.254 };
const rules = await eda.pcb_Drc.getNetRules() || [];
for (const r of rules) if (W[r.name] !== undefined) r['Track'] = W[r.name];
await eda.pcb_Drc.overwriteNetRules(rules);
await new Promise(r=>setTimeout(r,1200));
const back = await eda.pcb_Drc.getNetRules() || [];
const v = {}; for (const r of back) if (W[r.name] !== undefined) v[r.name] = Math.round(r['Track']*39.37)+'mil';
return { 目标: t.name, 线宽规则: v,
         板面状态: { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
                     过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
                     元件:(await eda.pcb_PrimitiveComponent.getAll()||[]).length } };
