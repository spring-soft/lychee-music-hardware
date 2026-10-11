const out = {};
out.netRules = await eda.pcb_Drc.getNetRules();
out.regionRules = await eda.pcb_Drc.getRegionRules();
const rc = await eda.pcb_Drc.getRuleConfiguration('JLCPCB Capability(Multiple Layers Board)');
out.multiLayerCfgKeys = rc ? Object.keys(rc) : null;
out.multiLayerCfgSections = rc && rc.config ? Object.keys(rc.config) : null;
out.trackSection = rc && rc.config ? JSON.stringify(rc.config['Track'] ?? rc.config['Width'] ?? {}).slice(0,1500) : null;
return out;
