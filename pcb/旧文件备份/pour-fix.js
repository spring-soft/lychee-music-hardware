const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = { tries: [] };
const T = async (label, fn) => {
  try { const r = await fn(); out.tries.push({ label, ok: !!r, keys: r?Object.keys(r).slice(0,8):null }); return r; }
  catch(e) { out.tries.push({ label, err: e.message.slice(0,100) }); return null; }
};
const mkPoly = (l,b,r,t) => eda.pcb_MathPolygon.createPolygon([l,b,'L',r,b,'L',r,t,'L',l,t]);
const small = mkPoly(300,300,1900,1600);

// 变体A：完全照抄文档（空网络 + solid）
const a = await T("空网络 + 'solid'", () => eda.pcb_PrimitivePour.create('', 1, small, 'solid', false, '测试A', 5, 10, false));
// 变体B：GND 网络 + solid
const b = await T("GND + 'solid'", () => eda.pcb_PrimitivePour.create('GND', 1, small, 'solid', false, '测试B', 5, 10, false));
await new Promise(r=>setTimeout(r,1200));
out.pourCount = (await eda.pcb_PrimitivePour.getAll() || []).length;
out.pours = (await eda.pcb_PrimitivePour.getAll() || []).map(x => ({ net:x.net, layer:x.layer }));
return out;
