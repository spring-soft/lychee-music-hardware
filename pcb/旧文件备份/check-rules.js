const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = { 当前规则集: await eda.pcb_Drc.getCurrentRuleConfigurationName() };
const rules = await eda.pcb_Drc.getNetRules() || [];
out.网络规则 = {};
for (const r of rules) {
  if (['BAT+','VBUS','+5V','SW_NODE','VCC','GND'].includes(r.name)) out.网络规则[r.name] = r['Track'];
}
// 当前板上线宽分布
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const w = {};
for (const l of lines) { const k = l.lineWidth.toFixed(1); w[k] = (w[k]||0)+1; }
out.板上实际线宽分布 = w;
out.线段总数 = lines.length;
return out;
