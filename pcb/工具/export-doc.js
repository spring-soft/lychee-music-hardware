const out = {};
await eda.dmt_EditorControl.openDocument('ec13f49100d66f9f');
await new Promise(r => setTimeout(r, 6000));
let f = null, err = null;
try { f = await eda.sys_FileManager.getDocumentFile(); } catch (e) { err = String(e && e.message || e).slice(0, 150); }
if (err) { out.err = err; return out; }
if (!f) { out.err = '返回空'; return out; }
const buf = new Uint8Array(await f.arrayBuffer());
let bin = ''; const CH = 0x8000;
for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
out.文件 = { name: f.name, size: f.size, type: f.type, 字节: buf.length };
out.b64 = btoa(bin);
return out;
