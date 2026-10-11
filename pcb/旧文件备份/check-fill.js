const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = {};
out.铺铜边框数 = (await eda.pcb_PrimitivePour.getAll()||[]).length;
try { out.填充结果数 = (await eda.pcb_PrimitivePoured.getAll()||[]).length; } catch(e){ out.填充结果数='ERR '; }
try { const pd = await eda.pcb_PrimitivePoured.getAll()||[];
      out.填充详情 = pd.slice(0,8).map(x=>({net:x.net, layer:x.layer, keys:Object.keys(x).slice(0,10)})); } catch(e){}
out.走线 = (await eda.pcb_PrimitiveLine.getAll()||[]).length;
out.过孔 = (await eda.pcb_PrimitiveVia.getAll()||[]).length;
return out;
