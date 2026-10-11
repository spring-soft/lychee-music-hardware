const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 4000));
const out = {};
const c = await eda.pcb_Drc.getCurrentRuleConfiguration();
const cfg = c && c.config ? c.config : c;
out.顶层键 = Object.keys(cfg || {});
if (cfg) {
  for (const [k, v] of Object.entries(cfg)) {
    if (/width|Width|Track|track|Via|via|Size/.test(k)) {
      out[k] = typeof v === 'object' ? JSON.parse(JSON.stringify(v)).toString().slice(0, 600) : v;
    }
  }
}
try { out.网络规则 = JSON.parse(JSON.stringify(await eda.pcb_Drc.getNetRules())); } catch (e) {}
return out;
