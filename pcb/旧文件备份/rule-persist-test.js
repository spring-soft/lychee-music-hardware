const out = {};
const W = { 'BAT+':0.61,'VBUS':0.61,'+5V':0.61,'SW_NODE':0.762,'VCC':0.254,'GND':0.254 };
const read = async () => { const rs = await eda.pcb_Drc.getNetRules() || [];
  const o = {}; for (const r of rs) if (W[r.name] !== undefined) o[r.name] = r['Track']; return o; };

out.不openDocument时读取 = await read();          // 当前状态

// 写规则（不 openDocument）
const rules = await eda.pcb_Drc.getNetRules() || [];
for (const r of rules) if (W[r.name] !== undefined) r['Track'] = W[r.name];
await eda.pcb_Drc.overwriteNetRules(rules);
await new Promise(r=>setTimeout(r,1000));
out.写入后 = await read();

// 再开一次文档，看是否被重置
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
out.openDocument之后 = await read();

// 再写一次，然后尝试用配置保存
const rules2 = await eda.pcb_Drc.getNetRules() || [];
for (const r of rules2) if (W[r.name] !== undefined) r['Track'] = W[r.name];
await eda.pcb_Drc.overwriteNetRules(rules2);
await new Promise(r=>setTimeout(r,1000));
const cfg = await eda.pcb_Drc.getCurrentRuleConfiguration();
out.配置里有没有网络规则 = cfg ? Object.keys(cfg.config || {}).join(', ') : null;
out.配置里有NetRules吗 = cfg ? ('NetworkRules' in (cfg.config||{}) || 'NetRules' in (cfg.config||{})) : null;
return out;
