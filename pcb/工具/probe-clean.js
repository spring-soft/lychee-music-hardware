const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 5000));
const out = { 各类图元: {} };
for (const api of Object.keys(eda).filter(s => /^pcb_Primitive/.test(s)).sort()) {
  try {
    const g = await eda[api].getAll();
    if (Array.isArray(g)) out.各类图元[api] = g.length;
  } catch (e) { /* 无 getAll */ }
}
return out;
