const out = {};
const ml = await eda.pcb_Drc.getRuleConfiguration('JLCPCB Capability(Multiple Layers Board)');
const two = await eda.pcb_Drc.getCurrentRuleConfiguration();
// 对比两套规则的 Physics / Plane 段
out.twoPhysics = JSON.stringify(two?.config?.Physics ?? {}).slice(0, 800);
out.mlPhysics  = JSON.stringify(ml?.config?.Physics ?? {}).slice(0, 800);
out.twoSpacingSafeKeys = two?.config?.Spacing ? Object.keys(two.config.Spacing) : null;
out.mlSpacingSafeKeys  = ml?.config?.Spacing ? Object.keys(ml.config.Spacing) : null;
// 尝试用多层规则内容覆盖当前规则
try {
  out.overwriteOk = await eda.pcb_Drc.overwriteCurrentRuleConfiguration(ml);
} catch (e) { out.overwriteOk = 'ERR ' + e.message; }
out.nameAfter = await eda.pcb_Drc.getCurrentRuleConfigurationName();
return out;
