const PCB = 'ec13f49100d66f9f';
const out = { calc: {} };
// 屏幕下边缘 560mil，板子下边缘 -197mil
const TOP = 560, BOT = -197;
const MID = Math.round((TOP + BOT) / 2);
out.calc = { 屏幕下边缘: TOP, 板子下边缘: BOT, 中间带: (TOP-BOT)+'mil = '+(((TOP-BOT)*0.0254).toFixed(1))+'mm', 应放中线: MID };
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4500));
const M = async (d, y) => {
  const c = (await eda.pcb_PrimitiveComponent.getAll()||[]).find(x=>x.designator===d);
  if (!c) { out[d]='未找到'; return; }
  const old = Math.round(c.y);
  await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y });
  out[d] = old+' → '+y;
  await new Promise(r=>setTimeout(r,700));
};
for (const d of ['SW1','SW2','SW3','SW4']) await M(d, MID);
await M('EC1', MID);     // 编码器同齐
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.pcb_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
return out;
