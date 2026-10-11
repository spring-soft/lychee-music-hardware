const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
const log = {};

// ── 1. 写入线宽规则（单位 mm）──
const WIDTH = { 'BAT+':0.61, 'VBUS':0.61, '+5V':0.61, 'SW_NODE':0.762, 'VCC':0.508, 'GND':0.508 };
const rules = await eda.pcb_Drc.getNetRules() || [];
for (const r of rules) if (WIDTH[r.name] !== undefined) r['Track'] = WIDTH[r.name];
log.writeOk = await eda.pcb_Drc.overwriteNetRules(rules);
await new Promise(r=>setTimeout(r,1200));
const back = await eda.pcb_Drc.getNetRules() || [];
log.规则回读 = {};
for (const r of back) if (WIDTH[r.name] !== undefined) log.规则回读[r.name] = r['Track'];

// ── 2. 清空旧布线 + 铺铜（让自动布线从零开始，避免把旧铜当障碍）──
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
if (lines.length) { await eda.pcb_PrimitiveLine.delete(lines.map(x=>x.primitiveId)); log.删走线 = lines.length; }
await new Promise(r=>setTimeout(r,1500));
const vias = await eda.pcb_PrimitiveVia.getAll() || [];
if (vias.length) { await eda.pcb_PrimitiveVia.delete(vias.map(x=>x.primitiveId)); log.删过孔 = vias.length; }
await new Promise(r=>setTimeout(r,1500));
const pours = await eda.pcb_PrimitivePour.getAll() || [];
if (pours.length) { await eda.pcb_PrimitivePour.delete(pours.map(x=>x.primitiveId)); log.删铺铜 = pours.length; }
await new Promise(r=>setTimeout(r,1500));

// ── 3. 复核规则是否还在（清图元后可能被重置）──
const back2 = await eda.pcb_Drc.getNetRules() || [];
log.清理后规则 = {};
for (const r of back2) if (WIDTH[r.name] !== undefined) log.清理后规则[r.name] = r['Track'];

const fl = await eda.pcb_PrimitiveLine.getAll() || [];
log.剩余走线 = fl.length;
log.剩余过孔 = (await eda.pcb_PrimitiveVia.getAll()||[]).length;
log.剩余铺铜 = (await eda.pcb_PrimitivePour.getAll()||[]).length;
return log;
