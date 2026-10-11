const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 4000));
const out = {};
for (const api of Object.keys(eda).filter(s => /Rule|NetClass|Net\b|Track/i.test(s)).sort()) {
  out[api] = typeof eda[api];
}
// 试着读规则
for (const m of ['getAllRules', 'getRules', 'getNetClasses', 'getAllNetClasses', 'getTrackWidths']) {
  try { if (eda.pcb_Drc && typeof eda.pcb_Drc[m] === 'function') out['pcb_Drc.' + m] = JSON.parse(JSON.stringify(await eda.pcb_Drc[m]())); } catch (e) {}
}
return out;
