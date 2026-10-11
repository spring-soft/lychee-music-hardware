const out = {};
const P = o => o ? Object.getOwnPropertyNames(Object.getPrototypeOf(o)).filter(k=>k!=='constructor') : null;
for (const k of Object.keys(eda)) {
  try { const pr = eda[k] && Object.getPrototypeOf(eda[k]); if (!pr) continue;
    const ms = Object.getOwnPropertyNames(pr).filter(x=>/save|persist|commit|write|flush|sync/i.test(x) && x!=='constructor');
    if (ms.length) out[k] = ms; } catch(e){}
}
out.dmtProject = P(eda.dmt_Project);
out.dmtBoard = P(eda.dmt_Board);
out.dmtWorkspace = P(eda.dmt_Workspace);
return out;
