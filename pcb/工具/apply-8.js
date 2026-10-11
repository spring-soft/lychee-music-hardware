const PCB='ec13f49100d66f9f';const MOVES=[{"d":"C15","x":1730,"y":1560},{"d":"C16","x":1600,"y":1230}];const out={ok:0};
await eda.dmt_EditorControl.openDocument(PCB);
let comps=null;for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,2500));comps=await eda.pcb_PrimitiveComponent.getAll();if(comps&&comps.length)break;}
if(!comps)return{err:'读取失败'};
const byD=new Map(comps.map(c=>[c.designator,c]));
for(const m of MOVES){const c=byD.get(m.d);if(!c)continue;
 await eda.pcb_PrimitiveComponent.modify(c.primitiveId,{x:m.x,y:m.y});out.ok++;await new Promise(r=>setTimeout(r,450));}
await new Promise(r=>setTimeout(r,2500));
try{await eda.pcb_Document.save();out.保存='成功';}catch(e){out.保存='失败';}
return out;