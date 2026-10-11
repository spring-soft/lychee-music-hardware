const out = {};
try { const p = await eda.dmt_Project.getCurrentProjectInfo(); out.当前工程 = p ? { name: p.name, uuid: p.uuid || p.projectUuid } : null; } catch (e) {}
let f = null, err = null;
try { f = await eda.sys_FileManager.getProjectFile(); } catch (e) { err = String(e && e.message || e).slice(0, 150); }
if (err) { out.err = err; return out; }
if (!f) { out.err = '返回空'; return out; }
const buf = new Uint8Array(await f.arrayBuffer());
let bin = ''; const CH = 0x8000;
for (let i = 0; i < buf.length; i += CH) bin += String.fromCharCode.apply(null, buf.subarray(i, i + CH));
out.文件 = { name: f.name, size: f.size, type: f.type, 字节: buf.length };
out.b64 = btoa(bin);
return out;
