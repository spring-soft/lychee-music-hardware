const PCB1 = '197f3e3cc67e949b';
const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(PCB1);
await new Promise(r=>setTimeout(r,4000));
const out = {};
const grab = async (label, fn) => {
  try {
    const f = await fn();
    if (!f) { out[label] = { err: '返回空' }; return; }
    const buf = await f.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin=''; const CH=0x8000;
    for (let i=0;i<bytes.length;i+=CH) bin += String.fromCharCode.apply(null, bytes.subarray(i,i+CH));
    out[label] = { name: f.name, size: f.size, type: f.type, b64: btoa(bin) };
  } catch(e) { out[label] = { err: e.message.slice(0,100) }; }
};
await grab('BOM', () => eda.pcb_ManufactureData.getBomFile());
await grab('坐标', () => eda.pcb_ManufactureData.getPickAndPlaceFile());
return out;
