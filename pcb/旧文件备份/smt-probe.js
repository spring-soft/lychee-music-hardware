const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,4000));
const out = { tries: [] };
const T = async (label, fn) => {
  try {
    const f = await fn();
    if (!f) { out.tries.push({ label, res:'返回空(undefined)' }); return null; }
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin=''; const CH=0x8000;
    for (let i=0;i<bytes.length;i+=CH) bin += String.fromCharCode.apply(null, bytes.subarray(i,i+CH));
    out.tries.push({ label, name:f.name, size:f.size, type:f.type });
    return btoa(bin);
  } catch(e) { out.tries.push({ label, err:e.message.slice(0,90) }); return null; }
};
out.bom1 = await T('getBomFile()', () => eda.pcb_ManufactureData.getBomFile());
out.bom2 = await T('getBomFile("BOM.csv")', () => eda.pcb_ManufactureData.getBomFile('BOM.csv'));
out.cpl1 = await T('getPickAndPlaceFile()', () => eda.pcb_ManufactureData.getPickAndPlaceFile());
out.cpl2 = await T('getPickAndPlaceFile("CPL.csv")', () => eda.pcb_ManufactureData.getPickAndPlaceFile('CPL.csv'));
out.all  = await T('getManufactureData()', () => eda.pcb_ManufactureData.getManufactureData());
out.bomTemplates = await (async()=>{ try{ const t=await eda.pcb_ManufactureData.getBomTemplates(); return t; }catch(e){ return 'ERR '+e.message.slice(0,60); } })();
return out;
