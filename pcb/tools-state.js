const p = await eda.dmt_Pcb.getAllPcbsInfo();
const out = { PCBs: (p||[]).map(x=>x.name+'/'+x.uuid) };
const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,5000));
const comps = await eda.pcb_PrimitiveComponent.getAll();
out.元件是否null = comps === null;
if (comps) {
  out.元件数 = comps.length;
  const ys = comps.map(c=>c.y);
  out.元件Y范围 = Math.round(Math.min(...ys))+' ~ '+Math.round(Math.max(...ys));
  out.负坐标元件 = comps.filter(c=>c.y<0).length;
}
const pl = await eda.pcb_PrimitivePolyline.getAll();
out.板框是否null = pl === null;
if (pl) out.板框 = pl.filter(x=>x.layer===11).map(x=>JSON.stringify(x.polygon).slice(0,90));
out.走线 = (await eda.pcb_PrimitiveLine.getAll()||[]).length;
return out;
