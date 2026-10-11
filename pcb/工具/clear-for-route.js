const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));

const out = { 清理: {} };
const del = async (api, label) => {
  try {
    const g = await eda[api].getAll();
    if (!Array.isArray(g) || !g.length) { out.清理[label] = '本来就没有'; return; }
    const ids = g.map(o => o.primitiveId);
    await eda[api].delete(ids);
    out.清理[label] = '删除 ' + ids.length + ' 个';
    await new Promise(r => setTimeout(r, 1800));
  } catch (e) { out.清理[label] = 'ERR ' + String(e && e.message || e).slice(0, 70); }
};

// 先删填充体，再删铺铜边框，最后清走线/过孔
await del('pcb_PrimitivePoured', '铺铜填充');
await del('pcb_PrimitivePour', '铺铜边框');
await del('pcb_PrimitiveLine', '走线');
await del('pcb_PrimitiveVia', '过孔');

await new Promise(r => setTimeout(r, 2500));
let s = null, e = null;
try { await eda.pcb_Document.save(); out.保存 = '成功'; } catch (err) { out.保存 = '失败 ' + String(err.message || err).slice(0, 60); }

await new Promise(r => setTimeout(r, 1500));
// 复核
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const pl = await eda.pcb_PrimitivePolyline.getAll() || [];
out.复核 = {
  元件: comps.length,
  板框线条: pl.filter(x => x.layer === 11).length,
  走线: (await eda.pcb_PrimitiveLine.getAll() || []).length,
  过孔: (await eda.pcb_PrimitiveVia.getAll() || []).length,
  铺铜边框: (await eda.pcb_PrimitivePour.getAll() || []).length,
  铺铜填充: (await eda.pcb_PrimitivePoured.getAll() || []).length,
};
return out;
