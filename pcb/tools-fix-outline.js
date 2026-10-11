const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
out.现有板框 = pl.filter(x=>x.layer===11).length;
// 正确签名: create(net, layer, polygon, lineWidth, primitiveLock)
const POLY = [0,-630,'L', 0,1969, 2283,1969, 2283,-630, 0,-630];
const poly = eda.pcb_MathPolygon.createPolygon(POLY);
let r = null, err = null;
try { r = await eda.pcb_PrimitivePolyline.create('', 11, poly, 10, false); }
catch(e){ err = e.message.slice(0,100); }
// 如果空 network 不行，再试 'GND'
if (!r) {
  try { r = await eda.pcb_PrimitivePolyline.create('GND', 11, poly, 10, false); }
  catch(e){ err = (err||'') + ' | GND: ' + e.message.slice(0,80); }
}
out.创建结果 = r ? '成功' : ('失败: '+err);
await new Promise(r2=>setTimeout(r2,2500));
const pl2 = await eda.pcb_PrimitivePolyline.getAll() || [];
out.板框 = pl2.filter(x=>x.layer===11).map(x => ({ 线宽:x.lineWidth, 数据:JSON.stringify(x.polygon).slice(0,160) }));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err2){ e = err2.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
return out;
