const cfg = await eda.pcb_Drc.getAllRuleConfigurations();
return { names: (cfg||[]).map(c=>c.name) };
