const MIL = 0.0254;
const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const j4 = comps.find(c => c.designator === 'J4');
const out = { J4周围500mil内: [] };
for (const c of comps) {
  if (c.designator === 'J4') continue;
  const dx = c.x - j4.x, dy = c.y - j4.y;
  const d = Math.hypot(dx, dy);
  if (d < 500) out.J4周围500mil内.push(
    c.designator.padEnd(6)+' @'+String(Math.round(c.x)).padStart(5)+','+String(Math.round(c.y)).padStart(5)+
    '  L'+c.layer+'  '+(d*MIL).toFixed(1)+'mm  '+(dx>0?'右':'左')+(dy>0?'上':'下'));
}
out.J4周围500mil内.sort();
// 列出所有电阻的位置，看哪两个在 J4 附近
out.所有电阻位置 = comps.filter(c=>/^R\d/.test(c.designator))
  .map(c=>c.designator+'@'+Math.round(c.x)+','+Math.round(c.y)+'/L'+c.layer)
  .sort((a,b)=>parseInt(a.slice(1))-parseInt(b.slice(1)));
return out;
