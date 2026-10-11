const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));

// ── 1. 改板框：y 从 -630 到 1969 ──
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
const old = pl.filter(x => x.layer === 11);
if (old.length) { await eda.pcb_PrimitivePolyline.delete(old.map(x=>x.primitiveId));
  out.删旧板框 = old.length; await new Promise(r=>setTimeout(r,1500)); }
const POLY = [0,-630,'L', 0,1969, 2283,1969, 2283,-630, 0,-630];
const poly = eda.pcb_MathPolygon.createPolygon(POLY);
try {
  const np = await eda.pcb_PrimitivePolyline.create(11, poly, 10, false);
  out.新板框 = np ? 'OK  0,-630 ~ 2283,1969  (58.0 × 66.0 mm)' : '返回空';
} catch(e){ out.新板框 = 'ERR ' + e.message.slice(0,80); }
await new Promise(r=>setTimeout(r,2000));

// ── 2. 摆放 TF 卡座 + 两个电容（正面 layer 1）──
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const move = async (d, x, y, layer) => {
  const c = comps.find(c => c.designator === d);
  if (!c) { out['移动_'+d] = '未找到'; return; }
  try { await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x, y });
        out['移动_'+d] = '→ ' + x + ',' + y; }
  catch(e){ out['移动_'+d] = 'ERR ' + e.message.slice(0,60); }
  await new Promise(r=>setTimeout(r,800));
};
// 卡座：焊盘比中心低 207mil（安装脚侧）→ 放在底边上方
await move('CARD1', 1100, -370, 1);
await move('C28',     500, -380, 1);
await move('C29',    1700, -380, 1);

await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
// 复核
const c2 = await eda.pcb_PrimitiveComponent.getAll() || [];
out.复核 = c2.filter(c => ['CARD1','C28','C29'].includes(c.designator))
  .map(c => c.designator+' @'+Math.round(c.x)+','+Math.round(c.y)+' L'+c.layer);
return out;
