const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
// 从渲染量出：本体底边比板边低约 112mil，上移这么多
const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='CARD1');
if (!c) return { err:'未找到 CARD1' };
const NEWY = Math.round(c.y + 112);
await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y: NEWY });
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
const c2 = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='CARD1');
const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c2.primitiveId)||[];
const ys = pins.filter(p=>p.y!==undefined).map(p=>p.y);
const xs = pins.filter(p=>p.x!==undefined).map(p=>p.x);
out.CARD1 = { 中心: Math.round(c2.x)+','+Math.round(c2.y), 旋转: c2.rotation, 层: c2.layer,
  焊盘X: Math.round(Math.min(...xs))+'~'+Math.round(Math.max(...xs)),
  焊盘Y: Math.round(Math.min(...ys))+'~'+Math.round(Math.max(...ys)) };
return out;
