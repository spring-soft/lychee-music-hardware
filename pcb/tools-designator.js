const out = { done: [], errs: [] };
await eda.dmt_EditorControl.openDocument('43ecd6bbed92787b');
await new Promise(r=>setTimeout(r,4500));
const comps = await eda.sch_PrimitiveComponent.getAll() || [];
const news = comps.filter(c => /\?$/.test(c.designator||''));
const plan = [];
for (const c of news) {
  const fp = (c.footprint && c.footprint.name) || '';
  if (/TF-01A/.test(fp)) plan.push({ c, d:'CARD1' });
  else if (/C0603/.test(fp)) plan.push({ c, d: Math.abs(c.y-2120) < 20 ? 'C29' : 'C28' });
}
for (const { c, d } of plan) {
  try { await eda.sch_PrimitiveComponent.modify(c.primitiveId, { designator: d });
        out.done.push((c.footprint&&c.footprint.name)+' → '+d); }
  catch(e){ out.errs.push(d+': '+e.message.slice(0,60)); }
  await new Promise(r=>setTimeout(r,600));
}
await new Promise(r=>setTimeout(r,2000));
let s=null,e=null; try { s = await eda.sch_Document.save(); } catch(err){ e=err.message.slice(0,70); }
out.保存 = e ? ('失败: '+e) : '成功';
const after = await eda.sch_PrimitiveComponent.getAll() || [];
out.验证 = after.filter(c => ['CARD1','C28','C29'].includes(c.designator))
  .map(c => c.designator+' @'+c.x+','+c.y+' ['+((c.footprint&&c.footprint.name)||'')+']');
return out;
