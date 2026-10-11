import fs from 'node:fs';
const [out, uuid, x1, y1, x2, y2] = process.argv.slice(2);
const code = `
await eda.dmt_EditorControl.openDocument('${uuid}');
await new Promise(r=>setTimeout(r,4000));
let z=null; try{ z = await eda.dmt_EditorControl.zoomToRegion(${x1},${y1},${x2},${y2}); }catch(e){}
await new Promise(r=>setTimeout(r,2000));
const blob = await eda.dmt_EditorControl.getCurrentRenderedAreaImage();
if (!blob) return { err:'no blob', z };
const b64 = await new Promise(res => { const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(blob); });
return { b64, z };
`;
const res = await fetch('http://127.0.0.1:49620/execute', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
const payload = await res.json();
if (payload.success === false) { console.error('❌', payload.error); process.exit(1); }
const r = payload.result;
if (!r?.b64) { console.error('❌', JSON.stringify(r).slice(0,300)); process.exit(1); }
fs.writeFileSync(out, Buffer.from(r.b64.replace(/^data:[^,]*,/,''), 'base64'));
console.log('✅', out, ' zoom返回:', JSON.stringify(r.z));
