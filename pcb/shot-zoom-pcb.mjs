#!/usr/bin/env node
// 用法: node shot-zoom-pcb.mjs <out.png> <pcbUuid> <x1> <y1> <x2> <y2>
import fs from 'node:fs';
const [out, uuid, x1, y1, x2, y2] = process.argv.slice(2);
const code = `
const p = await eda.dmt_Pcb.getAllPcbsInfo();
const t = p.find(x => x.uuid === '${uuid}') || p[0];
await eda.dmt_EditorControl.openDocument(t.uuid);
await new Promise(r=>setTimeout(r,4000));
const all = await eda.pcb_Layer.getAllLayers() || [];
for (const L of all) if (L.id) { try { await eda.pcb_Layer.setLayerVisible(L.id); } catch(e){} }
await new Promise(r=>setTimeout(r,1200));
await eda.dmt_EditorControl.zoomToRegion(${x1}, ${y1}, ${x2}, ${y2});
await new Promise(r=>setTimeout(r,1800));
const blob = await eda.dmt_EditorControl.getCurrentRenderedAreaImage();
if (!blob) return { err:'no blob' };
const b64 = await new Promise(res => { const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(blob); });
return { b64 };
`;
const res = await fetch('http://127.0.0.1:49620/execute', {
  method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
const pl = await res.json();
if (pl.success === false) { console.error('❌', pl.error); process.exit(1); }
if (!pl.result?.b64) { console.error('❌ no image'); process.exit(1); }
fs.writeFileSync(out, Buffer.from(pl.result.b64.replace(/^data:[^,]*,/,''), 'base64'));
console.log('✅', out);
