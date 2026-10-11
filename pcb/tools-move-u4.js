const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
// ① 量 TF 卡座封装本体的真实上下边界
try {
  const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='CARD1');
  const fpUuid = c.footprint && c.footprint.uuid;
  out.封装uuid = fpUuid;
  const f = await eda.sys_FileManager.getFootprintFileByFootprintUuid(fpUuid);
  if (f) {
    const src = await f.text();
    // 找所有坐标，算包围盒
    const pts = [...src.matchAll(/(?:X|Y)?\s*(-?\d+(?:\.\d+)?)/g)].map(m=>+m[1]);
    out.封装源长度 = src.length;
    out.源片段 = src.slice(0, 300);
  }
} catch(e){ out.封装读取 = 'ERR '+e.message.slice(0,70); }
// ② U4 上移 80mil
const u4 = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator==='U4');
if (u4) {
  await eda.pcb_PrimitiveComponent.modify(u4.primitiveId, { x: u4.x, y: 930 });
  out.U4 = '850 → 930';
}
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
return out;
