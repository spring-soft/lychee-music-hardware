const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = {};
out.before = (await eda.pcb_Drc.getAllNetClasses() || []);
// 试建网络类
try { out.createOk = await eda.pcb_Drc.createNetClass('POWER'); } catch(e){ out.createErr = e.message; }
try { out.addOk = await eda.pcb_Drc.addNetToNetClass('POWER', ['BAT+','VBUS','+5V','SW_NODE']); } catch(e){ out.addErr = e.message; }
out.after = (await eda.pcb_Drc.getAllNetClasses() || []);
// 试写单网络走线宽度规则，验证格式
const rules = await eda.pcb_Drc.getNetRules() || [];
const batRule = rules.find(r => r.name === 'BAT+');
out.batRuleBefore = batRule ? { ...batRule } : null;
if (batRule) {
  batRule['Track'] = 0.762;   // 30 mil
  try { out.writeOk = await eda.pcb_Drc.overwriteNetRules(rules); } catch(e){ out.writeErr = e.message; }
  const back = (await eda.pcb_Drc.getNetRules() || []).find(r => r.name === 'BAT+');
  out.batRuleAfter = back ? { ...back } : null;
}
return out;
