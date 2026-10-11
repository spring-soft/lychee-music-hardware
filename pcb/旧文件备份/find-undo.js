const P = o => o ? Object.getOwnPropertyNames(Object.getPrototypeOf(o)).filter(k=>k!=='constructor') : 'none';
const out = {};
out.editor = P(eda.dmt_EditorControl);
out.shortcut = P(eda.sys_ShortcutKey);
out.tool = P(eda.sys_Tool);
out.storage = P(eda.sys_Storage);
out.fileMgr = P(eda.sys_FileManager);
// 全局搜 undo/redo/history
for (const k of Object.keys(eda)) {
  try { const pr = eda[k] && Object.getPrototypeOf(eda[k]); if (!pr) continue;
    const ms = Object.getOwnPropertyNames(pr).filter(x=>/undo|redo|history|revert|restore/i.test(x) && x!=='constructor');
    if (ms.length) out['★'+k] = ms; } catch(e){}
}
return out;
