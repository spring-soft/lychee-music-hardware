const P = o => o ? Object.getOwnPropertyNames(Object.getPrototypeOf(o)).filter(k=>k!=='constructor') : 'none';
const out = { poured: P(eda.pcb_PrimitivePoured), pour: P(eda.pcb_PrimitivePour) };
out.edaKeysWithRebuild = Object.keys(eda).filter(k => /pour|copper|fill/i.test(k));
// 全 API 里找 rebuild/refill/update 相关
for (const k of Object.keys(eda)) {
  try {
    const proto = eda[k] && Object.getPrototypeOf(eda[k]);
    if (!proto) continue;
    const ms = Object.getOwnPropertyNames(proto).filter(x => /rebuild|refill|repour|refresh|update|recalc/i.test(x) && x!=='constructor');
    if (ms.length) out['★ '+k] = ms;
  } catch(e) {}
}
return out;
