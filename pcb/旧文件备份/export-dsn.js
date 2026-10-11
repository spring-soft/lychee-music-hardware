const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const f = await eda.pcb_ManufactureData.getDsnFile();
if (!f) return { err: 'getDsnFile returned null' };
const txt = await f.text();
return { name: f.name, size: f.size, type: f.type, head: txt.slice(0, 400), full: txt };
