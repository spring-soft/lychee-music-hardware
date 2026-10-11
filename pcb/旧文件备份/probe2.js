const out = {};
const p = await eda.dmt_Pcb.getAllPcbsInfo();
out.pcbInfo = (p||[]).map(x=>({uuid:x.uuid, name:x.name}));
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
out.activeDoc = JSON.stringify(await eda.dmt_EditorControl.getCurrentDocumentInfo?.() ?? 'n/a');
// probe globals for enums
const g = (typeof globalThis !== 'undefined') ? globalThis : this;
const hits = Object.keys(g).filter(k => /^EPCB_|AutoRouting|LayerId/i.test(k));
out.globalsWithEnum = hits.slice(0,40);
out.edaKeys = Object.keys(eda).filter(k=>/layer|route|net|pour|via/i.test(k)).slice(0,60);
out.layerApi = Object.getOwnPropertyNames(Object.getPrototypeOf(eda.pcb_Layer)).filter(k=>k!=='constructor');
out.docApi = Object.getOwnPropertyNames(Object.getPrototypeOf(eda.pcb_Document)).filter(k=>/rout|layer|rule|drc/i.test(k));
return out;
