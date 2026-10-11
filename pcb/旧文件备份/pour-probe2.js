const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = { tries: [] };
const T = async (label, fn) => {
  try { const r = await fn(); out.tries.push({ label, ok: !!r }); }
  catch(e) { out.tries.push({ label, err: e.message.slice(0,90) }); }
};
const polyR = eda.pcb_MathPolygon.createPolygon(['R', 300, 300, 1600, 1300, 0, 0]);
out.polyR = JSON.stringify(polyR);
const polyL = eda.pcb_MathPolygon.createPolygon([300, 300, 'L', 1900, 300, 'L', 1900, 1600, 'L', 300, 1600]);
out.polyL = JSON.stringify(polyL);

await T("R格式+层1", () => eda.pcb_PrimitivePour.create('GND', 1, polyR));
await T("L格式+层1", () => eda.pcb_PrimitivePour.create('GND', 1, polyL));
await T("裸数组当多边形", () => eda.pcb_PrimitivePour.create('GND', 1, [300,300,'L',1900,300,'L',1900,1600,'L',300,1600]));
await T("getSource()喂入", () => eda.pcb_PrimitivePour.create('GND', 1, eda.pcb_MathPolygon.createPolygon(polyR.getSource())));
await T("层16+R", () => eda.pcb_PrimitivePour.create('GND', 16, polyR));
await T("层15+R", () => eda.pcb_PrimitivePour.create('GND', 15, polyR));
// 对比：同参数建 Fill
await T("Fill 同参数", () => eda.pcb_PrimitiveFill.create('GND', 1, polyR));
out.pourCount = (await eda.pcb_PrimitivePour.getAll() || []).length;
out.fillCount = (await eda.pcb_PrimitiveFill.getAll() || []).length;
return out;
