const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = { tries: [] };
const T = async (label, fn) => {
  try { const r = await fn(); out.tries.push({ label, ok: !!r, keys: r?Object.keys(r):null }); }
  catch(e) { out.tries.push({ label, err: e.message.slice(0,110) }); }
};
const poly = eda.pcb_MathPolygon.createPolygon([8, 8, 'L', 2275, 8, 'L', 2275, 1961, 'L', 775, 1961, 'L', 775, 1890, 'L', 8, 1890]);
await T('铺铜 GND / 内层二(16)', () => eda.pcb_PrimitivePour.create('GND', 16, poly));
await new Promise(r=>setTimeout(r,1200));
await T('铺铜 GND / 内层一(15)', () => eda.pcb_PrimitivePour.create('GND', 15, poly));
await new Promise(r=>setTimeout(r,1200));
out.pourCount = (await eda.pcb_PrimitivePour.getAll() || []).length;
return out;
