const out = {};
out.before = await eda.pcb_Drc.getCurrentRuleConfigurationName();
out.setOk = await eda.pcb_Drc.setAsDefaultRuleConfiguration('JLCPCB Capability(Multiple Layers Board)');
// 直接覆盖当前配置名不行，得看有没有 set 当前配置的接口；先看 config 结构
const rc = await eda.pcb_Drc.getRuleConfiguration('JLCPCB Capability(Multiple Layers Board)');
out.sections = rc && rc.config ? Object.keys(rc.config) : null;
out.trackSection = rc && rc.config && rc.config.Track ? JSON.stringify(rc.config.Track).slice(0,2000) : null;
out.after = await eda.pcb_Drc.getCurrentRuleConfigurationName();
return out;
