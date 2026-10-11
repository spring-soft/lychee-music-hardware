#!/usr/bin/env node
import fs from 'node:fs';
const code = `
const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const all = await eda.pcb_Layer.getAllLayers() || [];
for (const L of all) if (L.id) { try { await eda.pcb_Layer.setLayerVisible(L.id); } catch(e){} }
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const c = comps.find(x => x.designator === 'CARD1');
if (!c) return { err:'CARD1 未找到' };
// 选中它并放大
try { await eda.pcb_SelectControl.selectPrimitives([c.primitiveId]); } catch(e){}
await new Promise(r=>setTimeout(r,1500));
try { await eda.dmt_EditorControl.zoomToSelectedPrimitives(); } catch(e){}
await new Promise(r=>setTimeout(r,2000));
const blob = await eda.dmt_EditorControl.getCurrentRenderedAreaImage();
if (!blob) return { err:'no blob' };
const b64 = await new Promise(res => { const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.readAsDataURL(blob); });
return { b64, x: c.x, y: c.y, rot: c.rotation, layer: c.layer };
`;
const res = await fetch('http://127.0.0.1:49620/execute', {
  method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
const pl = await res.json();
if (pl.success === false) { console.error('❌', pl.error); process.exit(1); }
if (!pl.result?.b64) { console.error('❌', JSON.stringify(pl.result)); process.exit(1); }
fs.writeFileSync('card_zoom.png', Buffer.from(pl.result.b64.replace(/^data:[^,]*,/,''), 'base64'));
console.log('✅ card_zoom.png  CARD1 @'+pl.result.x+','+pl.result.y+' rot'+pl.result.rot+' L'+pl.result.layer);
