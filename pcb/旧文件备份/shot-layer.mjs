#!/usr/bin/env node
// 用法: node shot-layer.mjs <out.png> <layerId...>
import fs from 'node:fs';
const [out, ...layers] = process.argv.slice(2);
const ids = layers.map(Number);
const code = `
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const KEEP = ${JSON.stringify(ids)};
const all = await eda.pcb_Layer.getAllLayers() || [];
for (const L of all) {
  if (!L.id) continue;
  if (KEEP.includes(L.id)) { try { await eda.pcb_Layer.setLayerVisible(L.id); } catch(e){} }
  else { try { await eda.pcb_Layer.setLayerInvisible(L.id); } catch(e){} }
}
await new Promise(r=>setTimeout(r,1500));
await eda.dmt_EditorControl.zoomToAllPrimitives();
await new Promise(r=>setTimeout(r,1500));
const blob = await eda.dmt_EditorControl.getCurrentRenderedAreaImage();
if (!blob) return { err:'no blob' };
const b64 = await new Promise(res => { const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(blob); });
return { b64 };
`;
const res = await fetch('http://127.0.0.1:49620/execute', {
  method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
const pl = await res.json();
if (pl.success === false) { console.error('❌', pl.error); process.exit(1); }
if (!pl.result?.b64) { console.error('❌ no image', JSON.stringify(pl.result)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(pl.result.b64.replace(/^data:[^,]*,/,''), 'base64'));
console.log('✅', out);
