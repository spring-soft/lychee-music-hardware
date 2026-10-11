const PCB='ec13f49100d66f9f';
const MOVES=[{"d":"C5","x":1000,"y":1830,"from":"960,1370"},{"d":"C10","x":1160,"y":1830,"from":"960,1260"},{"d":"C11","x":1320,"y":1830,"from":"960,1150"},{"d":"C17","x":1500,"y":1830,"from":"1650,1300"},{"d":"C18","x":1660,"y":1830,"from":"1740,1300"},{"d":"SW1","x":440,"y":297,"from":"400,297"},{"d":"SW2","x":740,"y":297,"from":"700,297"},{"d":"SW3","x":1040,"y":297,"from":"1000,297"},{"d":"SW4","x":1340,"y":297,"from":"1300,297"},{"d":"C28","x":1500,"y":180,"from":"1500,300"},{"d":"CARD1","x":1930,"y":332,"from":"1930,412"}];
const out={ok:0,err:[],done:[]};
await eda.dmt_EditorControl.openDocument(PCB);
let comps=null;
for(let i=0;i<8;i++){ await new Promise(r=>setTimeout(r,2500)); comps=await eda.pcb_PrimitiveComponent.getAll(); if(comps&&comps.length) break; }
if(!comps) return {err:'读取失败'};
const byD=new Map(comps.map(c=>[c.designator,c]));
for(const m of MOVES){ const c=byD.get(m.d);
  if(!c){ out.err.push(m.d+' 未找到'); continue; }
  try{ await eda.pcb_PrimitiveComponent.modify(c.primitiveId,{x:m.x,y:m.y}); out.ok++; out.done.push(m.d+':'+m.from+'→'+m.x+','+m.y); }
  catch(e){ out.err.push(m.d); }
  await new Promise(r=>setTimeout(r,420)); }
await new Promise(r=>setTimeout(r,3000));
try{ await eda.pcb_Document.save(); out.保存='成功'; }catch(e){ out.保存='失败 '+String(e.message||e).slice(0,60); }
return out;