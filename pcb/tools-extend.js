const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4500));
const EXT = 197;   // 5mm = 197mil

// ① 板框：y 从 -197 到 1969（往下加高 5mm）
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
const old = pl.filter(x => x.layer === 11);
if (old.length) { await eda.pcb_PrimitivePolyline.delete(old.map(x=>x.primitiveId));
  await new Promise(r=>setTimeout(r,1800)); }
const NEWY = -EXT;
let ok=null, e1=null;
try { ok = await eda.pcb_PrimitivePolyline.create('', 11,
        eda.pcb_MathPolygon.createPolygon([0,NEWY, 'L', 0,1969, 2283,1969, 2283,NEWY, 0,NEWY]), 10, false); }
catch(e){ e1 = e.message.slice(0,70); }
out.板框 = ok ? ('OK  y '+NEWY+' ~ 1969   58.0 × '+(((1969-NEWY)*0.0254).toFixed(1))+' mm') : ('失败: '+e1);
await new Promise(r=>setTimeout(r,2000));

// ② TF 卡座跟着往下挪，保持插卡口贴边
const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='CARD1');
if (c) { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x:c.x, y: c.y - EXT });
  out.CARD1 = Math.round(c.x)+','+Math.round(c.y)+' → '+Math.round(c.x)+','+Math.round(c.y-EXT); }
await new Promise(r=>setTimeout(r,1500));

// ③ 清空旧走线（板子变大，重新布）
const del = async (g,d2,l) => { const a = await g()||[];
  if(a.length){ await d2(a.map(x=>x.primitiveId).filter(Boolean)); out['删'+l]=a.length;
    await new Promise(r=>setTimeout(r,2200)); } else out['删'+l]=0; };
await del(()=>eda.pcb_PrimitiveLine.getAll(), x=>eda.pcb_PrimitiveLine.delete(x), '走线');
await del(()=>eda.pcb_PrimitiveVia.getAll(),  x=>eda.pcb_PrimitiveVia.delete(x),  '过孔');
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
out.清空后 = { 走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
               过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
               元件:(await eda.pcb_PrimitiveComponent.getAll()||[]).length };
return out;
