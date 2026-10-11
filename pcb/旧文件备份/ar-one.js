const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,2500));
const t0 = Date.now();
out = {};
let r, err = null;
try { r = await eda.pcb_Document.autoRouting({ RoutingNets:['I2S_MCLK'], layers:[1,2], cornerStyle:0, optimization:1, existingPrimitiveMode:'keep' }); }
catch(e){ err = e.message; }
return { ms: Date.now()-t0, r, err, lines: (await eda.pcb_PrimitiveLine.getAll()||[]).length };
