const out = { 复制前: await eda.dmt_Board.getAllBoardsInfo() };
let newUuid = null, err = null;
try { newUuid = await eda.dmt_Board.copyBoard('Board1'); } catch(e){ err = e.message.slice(0,120); }
out.copyBoard结果 = newUuid || ('失败: ' + err);
await new Promise(r=>setTimeout(r,4000));
out.复制后 = await eda.dmt_Board.getAllBoardsInfo();
let saveOk=null; try { saveOk = await eda.pcb_Document.save(); } catch(e){}
out.保存 = saveOk === undefined ? '调用完成' : saveOk;
return out;
