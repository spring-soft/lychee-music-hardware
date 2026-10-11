const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3500));
// GND/VCC 回到 10mil（靠铺铜导通）；四条电源主干保持粗线
const WIDTH = { 'BAT+':0.61, 'VBUS':0.61, '+5V':0.61, 'SW_NODE':0.762, 'VCC':0.254, 'GND':0.254 };
const rules = await eda.pcb_Drc.getNetRules() || [];
for (const r of rules) if (WIDTH[r.name] !== undefined) r['Track'] = WIDTH[r.name];
const ok = await eda.pcb_Drc.overwriteNetRules(rules);
await new Promise(r=>setTimeout(r,1200));
const back = await eda.pcb_Drc.getNetRules() || [];
const v = {};
for (const r of back) if (WIDTH[r.name] !== undefined) v[r.name] = r['Track'] + ' mm = ' + Math.round(r['Track']*39.37) + ' mil';
return { writeOk: ok, 最终线宽: v,
  说明: 'BAT+/VBUS/+5V=24mil(0.61mm)  SW_NODE=30mil(0.762mm)  GND/VCC=10mil(靠铺铜)' };
