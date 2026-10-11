#!/usr/bin/env node
// 用法: node shot-zoom.mjs <out.png> <x1> <y1> <x2> <y2>
import fs from 'node:fs';
const [out, x1, y1, x2, y2] = process.argv.slice(2);
const code = `
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,2500));
await eda.dmt_EditorControl.zoomToRegion(${x1}, ${y1}, ${x2}, ${y2});
await new Promise(r=>setTimeout(r,1500));
const blob = await eda.dmt_EditorControl.getCurrentRenderedAreaImage();
if (!blob) return { err:'no blob' };
const b64 = await new Promise(res => { const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(blob); });
return { b64 };
`;
const res = await fetch('http://127.0.0.1:49620/execute', {
  method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
const payload = await res.json();
if (payload.success === false) { console.error('❌', payload.error); process.exit(1); }
const r = payload.result;
if (!r?.b64) { console.error('❌ no image', JSON.stringify(r)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(r.b64.replace(/^data:[^,]*,/,''), 'base64'));
console.log('✅', out);
