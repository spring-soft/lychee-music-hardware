const out = {};
out.before = (await eda.pcb_PrimitiveLine.getAll())?.length ?? 0;
const r = await eda.pcb_Document.autoRouting({
  RoutingNets: ['I2S_MCLK','I2S_BCLK'],
  layers: [1, 2],
  cornerStyle: 0,
  optimization: 1,
  existingPrimitiveMode: 'keep',
});
out.result = r;
await new Promise(res=>setTimeout(res,6000));
out.after = (await eda.pcb_PrimitiveLine.getAll())?.length ?? 0;
const lines = await eda.pcb_PrimitiveLine.getAll() || [];
out.sample = lines.slice(0,8).map(l=>({net:l.net, layer:l.layer, x1:l.x1??l.startX, y1:l.y1??l.startY, x2:l.x2??l.endX, y2:l.y2??l.endY, w:l.lineWidth??l.width}));
out.keys = lines[0] ? Object.keys(lines[0]) : null;
return out;
