const fs = await import('fs');
const viol = JSON.parse(fs.readFileSync('E:/program/esp-music-pcb/drc_full.json','utf8'));
// 收集所有违规涉及的对象 id
const badIds = new Set();
for (const v of viol) for (const id of (v.objs || [])) badIds.add(id);

const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));

const POWER = new Set(['BAT+','VBUS','+5V','SW_NODE']);
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const reverted = [], kept = [];
for (const l of lines) {
  if (!POWER.has(l.net)) continue;
  if (badIds.has(l.primitiveId)) {
    try { await eda.pcb_PrimitiveLine.modify(l.primitiveId, { lineWidth: 10 }); reverted.push(l.net); } catch(e) {}
  } else { kept.push(l.net); }
}
await new Promise(r=>setTimeout(r,1500));
const cnt = {}; for (const n of reverted) cnt[n]=(cnt[n]||0)+1;
const cnt2 = {}; for (const n of kept) cnt2[n]=(cnt2[n]||0)+1;
return { 退回的段: reverted.length, 按网络: cnt, 保持加粗的段: kept.length, 按网络: cnt2 };
