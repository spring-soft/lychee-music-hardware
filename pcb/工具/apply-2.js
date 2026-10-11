const PCB='ec13f49100d66f9f';const MOVES=[{"d":"C5","x":1080,"y":1830,"from":"1000,1830"},{"d":"C6","x":1180,"y":1620,"from":"950,1620"},{"d":"C12","x":1300,"y":1620,"from":"1040,1620"},{"d":"C26","x":1830,"y":640,"from":"1830,500"},{"d":"C27","x":1980,"y":640,"from":"1930,500"},{"d":"R18","x":1830,"y":790,"from":"2030,500"}];const out={ok:0,err:[],done:[]};
await eda.dmt_EditorControl.openDocument(PCB);
let comps=null;for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,2500));comps=await eda.pcb_PrimitiveComponent.getAll();if(comps&&comps.length)break;}
if(!comps)return{err:'读取失败'};
const byD=new Map(comps.map(c=>[c.designator,c]));
for(const m of MOVES){const c=byD.get(m.d);if(!c){out.err.push(m.d);continue;}
 try{await eda.pcb_PrimitiveComponent.modify(c.primitiveId,{x:m.x,y:m.y});out.ok++;out.done.push(m.d+':'+m.from+'→'+m.x+','+m.y);}
 catch(e){out.err.push(m.d);}await new Promise(r=>setTimeout(r,420));}
await new Promise(r=>setTimeout(r,3000));
try{await eda.pcb_Document.save();out.保存='成功';}catch(e){out.保存='失败';}
return out;