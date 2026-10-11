const PCB='ec13f49100d66f9f';
const MOVES=[{"d":"C1","x":970,"y":820,"from":"970,1017"},{"d":"C2","x":700,"y":603,"from":"700,800"},{"d":"C3","x":1380,"y":1700,"from":"1380,1897"},{"d":"C4","x":1120,"y":1060,"from":"1120,1257"},{"d":"C5","x":960,"y":1370,"from":"1010,1347"},{"d":"C6","x":950,"y":1620,"from":"950,1817"},{"d":"C7","x":1470,"y":1700,"from":"1470,1897"},{"d":"C8","x":1330,"y":1300,"from":"1330,1497"},{"d":"C9","x":1330,"y":1190,"from":"1330,1387"},{"d":"C10","x":960,"y":1260,"from":"900,1347"},{"d":"C11","x":960,"y":1150,"from":"790,1347"},{"d":"C12","x":1040,"y":1620,"from":"1040,1817"},{"d":"C13","x":1240,"y":1300,"from":"1240,1497"},{"d":"C14","x":1240,"y":1190,"from":"1240,1387"},{"d":"C17","x":1650,"y":1300,"from":"1650,1497"},{"d":"C18","x":1740,"y":1300,"from":"1740,1497"},{"d":"C19","x":1420,"y":1300,"from":"1420,1497"},{"d":"C20","x":1420,"y":1190,"from":"1420,1387"},{"d":"FB1","x":1130,"y":1300,"from":"1130,1497"},{"d":"FB2","x":1130,"y":1190,"from":"1130,1387"},{"d":"J1","x":145,"y":380,"from":"145,577"},{"d":"J2","x":2125,"y":1689,"from":"2125,1886"},{"d":"J3","x":220,"y":850,"from":"220,1047"},{"d":"Q1","x":950,"y":400,"from":"950,597"},{"d":"R1","x":860,"y":700,"from":"860,897"},{"d":"R2","x":860,"y":820,"from":"860,1017"},{"d":"R3","x":970,"y":700,"from":"970,897"},{"d":"R4","x":700,"y":703,"from":"700,900"},{"d":"R5","x":700,"y":803,"from":"700,1000"},{"d":"R6","x":500,"y":420,"from":"500,617"},{"d":"R10","x":1830,"y":1300,"from":"1830,1497"},{"d":"R11","x":1920,"y":1300,"from":"1920,1497"},{"d":"U1","x":540,"y":1560,"from":"540,1757"},{"d":"U2","x":1450,"y":1520,"from":"1450,1717"},{"d":"U3","x":900,"y":1000,"from":"900,1197"},{"d":"C21","x":1750,"y":1180,"from":"1750,1377"},{"d":"C22","x":1930,"y":1150,"from":"1870,1437"},{"d":"C23","x":1250,"y":640,"from":"1250,837"},{"d":"C24","x":1400,"y":640,"from":"1400,837"},{"d":"C25","x":1550,"y":640,"from":"1550,837"},{"d":"D1","x":2080,"y":900,"from":"2080,1097"},{"d":"D2","x":2080,"y":800,"from":"2080,997"},{"d":"D3","x":2080,"y":700,"from":"2080,897"},{"d":"J4","x":2165,"y":1050,"from":"2165,1247"},{"d":"L1","x":1440,"y":850,"from":"1440,1047"},{"d":"R15","x":1250,"y":760,"from":"1250,957"},{"d":"R16","x":1450,"y":700,"from":"1450,897"},{"d":"R17","x":1990,"y":860,"from":"1990,1057"},{"d":"SW7","x":2120,"y":1285,"from":"2120,1447"},{"d":"U4","x":1700,"y":850,"from":"1700,1047"},{"d":"C15","x":1680,"y":1520,"from":"1572,1527"},{"d":"C16","x":1500,"y":1100,"from":"1560,1267"},{"d":"SW5","x":550,"y":600,"from":"550,797"},{"d":"SW6","x":550,"y":900,"from":"550,1097"},{"d":"C26","x":1830,"y":500,"from":"1830,697"},{"d":"C27","x":1930,"y":500,"from":"1930,697"},{"d":"R18","x":2030,"y":500,"from":"2030,697"},{"d":"R19","x":2130,"y":500,"from":"2130,697"},{"d":"R20","x":2230,"y":500,"from":"2230,697"},{"d":"C28","x":1500,"y":300,"from":"1500,497"},{"d":"C29","x":1500,"y":460,"from":"1500,817"}];
const out={ok:0,err:[],done:[]};
await eda.dmt_EditorControl.openDocument(PCB);
let comps=null;
for(let i=0;i<8;i++){ await new Promise(r=>setTimeout(r,2500)); comps=await eda.pcb_PrimitiveComponent.getAll(); if(comps&&comps.length) break; }
if(!comps) return {err:'读取失败'};
const byD=new Map(comps.map(c=>[c.designator,c]));
// ① 板框 → 0~1969
const pl=await eda.pcb_PrimitivePolyline.getAll()||[];
const old=pl.filter(x=>x.layer===11);
if(old.length) await eda.pcb_PrimitivePolyline.delete(old.map(x=>x.primitiveId));
await new Promise(r=>setTimeout(r,2000));
let bx=null;
try{ bx=await eda.pcb_PrimitivePolyline.create('',11, eda.pcb_MathPolygon.createPolygon([0,0,'L',0,1969,2283,1969,2283,0,0,0]),10,false); }
catch(e){ out.板框='失败 '+String(e.message||e).slice(0,60); }
await new Promise(r=>setTimeout(r,2000));
if(bx) out.板框='OK 0~1969 (58.0×50.0mm)';
// ② 挪元件
for(const m of MOVES){
  const c=byD.get(m.d);
  if(!c){ out.err.push(m.d+' 未找到'); continue; }
  try{ await eda.pcb_PrimitiveComponent.modify(c.primitiveId,{x:m.x,y:m.y}); out.ok++; out.done.push(m.d+':'+m.from+'→'+m.x+','+m.y); }
  catch(e){ out.err.push(m.d+' '+String(e.message||e).slice(0,40)); }
  await new Promise(r=>setTimeout(r,420));
}
await new Promise(r=>setTimeout(r,3000));
let s=null,er=null;
try{ s=await eda.pcb_Document.save(); }catch(e){ er=String(e.message||e).slice(0,80); }
out.保存=er?('失败: '+er):'成功';
return out;