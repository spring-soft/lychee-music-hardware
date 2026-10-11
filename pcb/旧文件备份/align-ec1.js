const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,4000));
const all = await eda.pcb_PrimitiveComponent.getAll() || [];
const btn = all.filter(c => ['SW1','SW2','SW3','SW4'].includes(c.designator));
const c = all.find(x => x.designator === 'EC1');
const btnY = btn.map(b => b.y);
const targetY = Math.round(btnY.reduce((a,b)=>a+b,0)/btn.length);
await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: c.x, y: targetY });
await new Promise(r=>setTimeout(r,800));
const c2 = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === 'EC1');
return { 按键坐标: btn.map(b=>({d:b.designator,x:b.x,y:b.y})), 按键中线y: targetY,
         EC1改前: { x: c.x, y: c.y }, EC1改后: { x: c2.x, y: c2.y } };
