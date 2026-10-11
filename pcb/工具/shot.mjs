#!/usr/bin/env node
/**
 * 截取当前 PCB 画布渲染图
 * 用法: node shot.mjs <输出png> [zoomToAll|zoomToSelected|none]
 */
import fs from 'node:fs';

const ENDPOINT = process.env.EDA_BRIDGE || 'http://127.0.0.1:49620/execute';
const out = process.argv[2] || 'shot.png';
const mode = process.argv[3] || 'zoomToAll';

const code = `
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,2500));
const mode = ${JSON.stringify(mode)};
if (mode === 'zoomToAll') { await eda.dmt_EditorControl.zoomToAllPrimitives(); }
else if (mode === 'zoomToSelected') { await eda.dmt_EditorControl.zoomToSelectedPrimitives(); }
await new Promise(r=>setTimeout(r,1500));
const blob = await eda.dmt_EditorControl.getCurrentRenderedAreaImage();
if (!blob) return { err: 'no blob' };
const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
return { b64, type: blob.type, size: blob.size };
`;

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code }),
});
const payload = await res.json();
if (payload.success === false) {
  console.error('❌', payload.error || JSON.stringify(payload));
  process.exit(1);
}
const r = payload.result;
if (!r || !r.b64) {
  console.error('❌ 没有拿到图像:', JSON.stringify(r));
  process.exit(1);
}
const b64 = r.b64.replace(/^data:[^,]*,/, '');
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log(`✅ ${out}  (${r.type}, ${(r.size / 1024).toFixed(0)} KB)`);
