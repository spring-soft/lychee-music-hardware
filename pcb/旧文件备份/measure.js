// 阶段 C-2：回读每个元件的引脚，算出符号实际包围盒
const comps = (await eda.sch_PrimitiveComponent.getAll()).filter(c => c.componentType === 'part');

const out = [];
for (const c of comps) {
  const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId);
  const list = (pins || []).filter(p => p.primitiveType === 'ComponentPin');
  if (!list.length) { out.push({ des: c.designator, pins: 0 }); continue; }
  const xs = list.map(p => p.x), ys = list.map(p => p.y);
  out.push({
    des: c.designator,
    id: c.primitiveId,
    anchorX: c.x, anchorY: c.y,
    pinCount: list.length,
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
    // 引脚相对锚点的偏移范围
    offL: Math.min(...xs) - c.x, offR: Math.max(...xs) - c.x,
    offT: Math.min(...ys) - c.y, offB: Math.max(...ys) - c.y,
  });
}

return out.sort((a, b) => {
  const na = parseInt(String(a.des).replace(/\D/g, '')) || 0;
  const nb = parseInt(String(b.des).replace(/\D/g, '')) || 0;
  return String(a.des).replace(/[0-9]/g, '').localeCompare(String(b.des).replace(/[0-9]/g, '')) || na - nb;
});
