const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));

// ① 板框退回 58×50
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
const old = pl.filter(x => x.layer === 11);
if (old.length) { await eda.pcb_PrimitivePolyline.delete(old.map(x=>x.primitiveId)); await new Promise(r=>setTimeout(r,1500)); }
const POLY = [0,0,'L', 0,1969, 2283,1969, 2283,0, 0,0];
let ok = null, e1 = null;
try { ok = await eda.pcb_PrimitivePolyline.create('', 11, eda.pcb_MathPolygon.createPolygon(POLY), 10, false); }
catch(e){ e1 = e.message.slice(0,70); }
out.板框 = ok ? '已退回 58.0 × 50.0 mm' : ('失败: '+e1);
await new Promise(r=>setTimeout(r,2000));

// ② 挪走挡路的 R9（原来在 x1700,y420，正好压住卡座位置）
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const r9 = comps.find(c => c.designator === 'R9');
if (r9) { await eda.pcb_PrimitiveComponent.modify(r9.primitiveId, { x: 1200, y: 420 });
  out.R9 = '移到 1200,420'; }
await new Promise(r=>setTimeout(r,1200));

// ③ TF 卡座放背面右下角，插卡口朝下边缘
const c1 = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(c=>c.designator==='CARD1');
if (c1) {
  await eda.pcb_PrimitiveComponent.modify(c1.primitiveId, { layer: 2, x: 1890, y: 465 });
  await new Promise(r=>setTimeout(r,1500));
  const c1b = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(c=>c.designator==='CARD1');
  out.CARD1 = '→ ' + Math.round(c1b.x) + ',' + Math.round(c1b.y) + ' 层' + c1b.layer + ' 旋转' + c1b.rotation;
}
// ④ 两个电容也挪到背面卡座旁边
for (const [d, x, y] of [['C28', 1500, 300], ['C29', 1500, 620]]) {
  const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(c=>c.designator===d);
  if (c) { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { layer: 2, x, y });
    out[d] = '→ '+x+','+y+' 背面'; await new Promise(r=>setTimeout(r,800)); }
}
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e = err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
return out;
