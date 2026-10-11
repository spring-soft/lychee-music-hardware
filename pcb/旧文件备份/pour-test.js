const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
// 板框矩形，左上角挖掉天线区 (x<775, y>1890)
const pts = [8, 8, 'L', 2275, 8, 'L', 2275, 1961, 'L', 775, 1961, 'L', 775, 1890, 'L', 8, 1890];
const poly = eda.pcb_MathPolygon.createPolygon(pts);
if (!poly) return { err: 'createPolygon 返回空' };
let pour = null, err = null;
try { pour = await eda.pcb_PrimitivePour.create('GND', 16, poly, '90grid', false, 'GND-Inner2', 1, 10, false); }
catch(e) { err = e.message; }
await new Promise(r=>setTimeout(r,1500));
const all = await eda.pcb_PrimitivePour.getAll() || [];
return { err, pourKeys: pour ? Object.keys(pour) : null,
         pourCount: all.length,
         pours: all.map(x => ({ net:x.net, layer:x.layer, name:x.pourName ?? x.name })) };
