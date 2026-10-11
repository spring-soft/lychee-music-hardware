const MIL = 0.0254;
const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const out = {};
const all = [];
for (const c of comps) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  for (const p of pins) if (p.x !== undefined)
    all.push({ d:c.designator, x:p.x, y:p.y, l:p.layer, thru:(p.layer===12) });
}
const card = all.filter(p => p.d === 'CARD1');
const cx = card.map(p=>p.x), cy = card.map(p=>p.y);
const L=Math.min(...cx), R=Math.max(...cx), B=Math.min(...cy), T=Math.max(...cy);
out.CARD1 = { 层:2, X: Math.round(L)+'~'+Math.round(R)+' ('+((R-L)*MIL).toFixed(1)+'mm)',
  Y: Math.round(B)+'~'+Math.round(T)+' ('+((T-B)*MIL).toFixed(1)+'mm)',
  到板下边: (B*MIL).toFixed(2)+'mm', 到板右边: ((2283-R)*MIL).toFixed(2)+'mm' };
// 卡座本体范围（焊盘外扩，含插卡口伸出）
const cL=L-30, cR=R+30, cB=0, cT=T+150;
const hits = [];
for (const p of all) {
  if (['CARD1'].includes(p.d)) continue;
  if (p.x < cL || p.x > cR || p.y < cB || p.y > cT) continue;
  // 只算：同层(背面) 或 直插
  if (p.l === 2 || p.thru) hits.push(p.d+'('+(p.thru?'★直插':'背面贴片')+')');
}
out.冲突 = [...new Set(hits)];
out.结论 = out.冲突.length ? ('⚠️ 还有 '+out.冲突.length+' 处') : '✅ 无冲突';
// 按键新位置
out.按键位置 = comps.filter(c=>/^SW[1-4]$/.test(c.designator)).map(c=>c.designator+'@'+Math.round(c.x));
return out;
