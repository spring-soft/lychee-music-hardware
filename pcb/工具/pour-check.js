const out = {};
const pours = await eda.pcb_PrimitivePour.getAll() || [];
out.铺铜边框 = pours.map(o => ({ 层: o.layer, 网络: o.net, 名: o.pourName || o.name,
  中心: (() => { try { const c = o.polygon && o.polygon.getCenter ? o.polygon.getCenter() : null;
    return c ? Math.round(c.x) + ',' + Math.round(c.y) : '—'; } catch (e) { return 'err'; } })() }));
out.填充体数 = (await eda.pcb_PrimitivePoured.getAll() || []).length;
out.走线数 = (await eda.pcb_PrimitiveLine.getAll() || []).length;
out.过孔数 = (await eda.pcb_PrimitiveVia.getAll() || []).length;
return out;
