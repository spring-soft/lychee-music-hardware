const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,2500));
const details = await eda.pcb_Drc.check(true, false, true);
const arr = Array.isArray(details) ? details : (details === true ? [] : [details]);
const msgs = arr.map(d => typeof d === 'string' ? d : (d.description || d.message || d.ruleName || JSON.stringify(d)));
const groups = {};
for (const m of msgs) { const k = String(m).replace(/[0-9]+/g,'#').slice(0,90); groups[k] = (groups[k]||0)+1; }
return { count: msgs.length, topGroups: Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,15),
         first20: msgs.slice(0,20) };
