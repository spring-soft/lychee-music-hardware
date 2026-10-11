const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,4000));

const MOVES = { C15:{y:1340}, C16:{y:1070}, R17:{x:1990}, J2:{x:2125}, EC1:{x:2070} };
const log = [];
for (const [d, mv] of Object.entries(MOVES)) {
  const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
  const c = comps.find(x => x.designator === d);
  if (!c) { log.push({ d, err:'not found' }); continue; }
  const before = { x: Math.round(c.x), y: Math.round(c.y) };
  if (before.x === (mv.x ?? before.x) && before.y === (mv.y ?? before.y)) {
    log.push({ d, before, after: before, note:'已经是目标位置' }); continue;
  }
  await eda.pcb_PrimitiveComponent.modify(c.primitiveId, { x: mv.x ?? c.x, y: mv.y ?? c.y });
  await new Promise(r=>setTimeout(r,700));
  const c2 = (await eda.pcb_PrimitiveComponent.getAll() || []).find(x => x.designator === d);
  log.push({ d, before, after: c2 ? { x: Math.round(c2.x), y: Math.round(c2.y) } : null });
}
return log;
