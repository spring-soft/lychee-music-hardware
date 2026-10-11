const PCB='ec13f49100d66f9f';const MOVES=[{"d":"C1","x":1055,"y":855},{"d":"C2","x":730,"y":585},{"d":"C3","x":1840,"y":1730},{"d":"C5","x":1000,"y":1730},{"d":"C6","x":1210,"y":1730},{"d":"C7","x":1420,"y":1860},{"d":"C8","x":1330,"y":1340},{"d":"C9","x":1330,"y":1170},{"d":"C10","x":1420,"y":1730},{"d":"C11","x":1000,"y":1860},{"d":"C12","x":1630,"y":1730},{"d":"C13","x":1210,"y":1340},{"d":"C14","x":1210,"y":1170},{"d":"C17","x":1210,"y":1860},{"d":"C18","x":1630,"y":1860},{"d":"C19","x":1450,"y":1340},{"d":"C20","x":1450,"y":1170},{"d":"FB1","x":1090,"y":1340},{"d":"FB2","x":1090,"y":1170},{"d":"R1","x":885,"y":635},{"d":"R2","x":910,"y":760},{"d":"R3","x":1070,"y":665},{"d":"R4","x":730,"y":735},{"d":"R5","x":755,"y":850},{"d":"R6","x":500,"y":410},{"d":"R7","x":560,"y":150},{"d":"R8","x":700,"y":150},{"d":"R9","x":840,"y":150},{"d":"R11","x":1950,"y":1315},{"d":"R12","x":1100,"y":150},{"d":"R13","x":1240,"y":150},{"d":"R14","x":1380,"y":150},{"d":"C24","x":1305,"y":455},{"d":"C25","x":1480,"y":635},{"d":"R16","x":1360,"y":635},{"d":"R17","x":1950,"y":810},{"d":"C16","x":1560,"y":1255},{"d":"C26","x":1815,"y":625},{"d":"C27","x":1935,"y":600},{"d":"R19","x":2085,"y":500},{"d":"R20","x":2205,"y":500},{"d":"C29","x":1450,"y":485}];const out={ok:0,err:[]};
await eda.dmt_EditorControl.openDocument(PCB);
let comps=null;for(let i=0;i<8;i++){await new Promise(r=>setTimeout(r,2500));comps=await eda.pcb_PrimitiveComponent.getAll();if(comps&&comps.length)break;}
if(!comps)return{err:'读取失败'};
const byD=new Map(comps.map(c=>[c.designator,c]));
for(const m of MOVES){const c=byD.get(m.d);if(!c){out.err.push(m.d);continue;}
 try{await eda.pcb_PrimitiveComponent.modify(c.primitiveId,{x:m.x,y:m.y});out.ok++;}catch(e){out.err.push(m.d);}
 await new Promise(r=>setTimeout(r,400));}
await new Promise(r=>setTimeout(r,2500));
try{await eda.pcb_Document.save();out.保存='成功';}catch(e){out.保存='失败';}
return out;