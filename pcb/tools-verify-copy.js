const out = {};
const PCBNEW = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCBNEW);
await new Promise(r=>setTimeout(r,4000));
out.新板PCB = { 元件:(await eda.pcb_PrimitiveComponent.getAll()||[]).length,
                走线:(await eda.pcb_PrimitiveLine.getAll()||[]).length,
                过孔:(await eda.pcb_PrimitiveVia.getAll()||[]).length,
                铺铜:(await eda.pcb_PrimitivePour.getAll()||[]).length };
// 改板名
let rn = null, err = null;
try { rn = await eda.dmt_Board.modifyBoardName('Board1_1', 'V2-TF卡版'); } catch(e){ err = e.message.slice(0,80); }
out.改名 = err ? ('失败: '+err) : rn;
await new Promise(r=>setTimeout(r,3000));
out.改名后 = (await eda.dmt_Board.getAllBoardsInfo()).map(x=>x.name);
return out;
