const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 4000));
const out = {};
try { out.当前规则名 = await eda.pcb_Drc.getCurrentRuleConfigurationName(); } catch (e) {}
try { out.默认规则名 = await eda.pcb_Drc.getDefaultRuleConfigurationName(); } catch (e) {}
try { const c = await eda.pcb_Drc.getCurrentRuleConfiguration(); out.当前规则 = c ? JSON.parse(JSON.stringify(c)) : null; } catch (e) { out.规则err = String(e); }
try { const n = await eda.pcb_Drc.getNetRules(); out.网络规则 = n ? JSON.parse(JSON.stringify(n)).slice(0, 30) : null; } catch (e) { out.网规err = String(e); }
return out;
