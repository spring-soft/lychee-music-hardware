const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));

// 单位 mm。1 mil = 0.0254 mm
const WIDTH = {
  'BAT+':    0.61,   // 24mil — 2A 电池主路
  'VBUS':    0.61,   // 24mil — 1A 充电
  '+5V':     0.61,   // 24mil — 1A 系统5V
  'SW_NODE': 0.762,  // 30mil — IP5306 开关节点，必须短而粗
  'VCC':     0.508,  // 20mil — 3.3V，另有内层铺铜加持
  'GND':     0.508,  // 20mil — 另有铺铜
};
const rules = await eda.pcb_Drc.getNetRules() || [];
const applied = [];
for (const r of rules) {
  if (WIDTH[r.name] !== undefined) { r['Track'] = WIDTH[r.name]; applied.push(r.name); }
}
const ok = await eda.pcb_Drc.overwriteNetRules(rules);
const back = await eda.pcb_Drc.getNetRules() || [];
const verify = {};
for (const r of back) if (WIDTH[r.name] !== undefined) verify[r.name] = r['Track'];
return { writeOk: ok, applied, 已生效: verify,
        说明: 'Track 单位 mm；0.61mm=24mil, 0.762mm=30mil, 0.508mm=20mil' };
