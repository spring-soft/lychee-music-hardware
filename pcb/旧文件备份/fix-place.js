const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,2500));
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const MOVES = {
  C15: { y: 1330 },   // 与 C16 焊盘重叠 -16.4mil，拉开
  C16: { y: 1070 },
  R17: { x: 1990 },   // 与 J4 定位脚间隙 1.2mil，左移
  J2:  { x: 2125 },   // 焊盘出界 11.8mil，左移
  EC1: { x: 2070 },   // 焊盘出界 5.9mil，左移
};
const done = [];
for (const [d, mv] of Object.entries(MOVES)) {
  const c = comps.find(x => x.designator === d);
  if (!c) { done.push({ d, err: 'not found' }); continue; }
  const before = { x: c.x, y: c.y };
  const r = await eda.pcb_PrimitiveComponent.modify(c.primitiveId,
    { x: mv.x ?? c.x, y: mv.y ?? c.y });
  done.push({ d, before, after: { x: mv.x ?? c.x, y: mv.y ?? c.y }, ok: !!r || r === undefined });
}
return done;
