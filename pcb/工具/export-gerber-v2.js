const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));
let f = null, err = null;
try { f = await eda.pcb_ManufactureData.getGerberFile(); }
catch (e) { err = String(e && e.message || e).slice(0, 150); }
if (err) return { err };
if (!f) return { err: 'getGerberFile 返回空' };
const buf = await f.arrayBuffer();
const bytes = new Uint8Array(buf);
let bin = '';
const CH = 0x8000;
for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
return { name: f.name, size: f.size, type: f.type, 字节数: bytes.length, b64: btoa(bin) };
