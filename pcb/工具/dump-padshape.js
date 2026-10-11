const pads = await eda.pcb_PrimitivePad.getAll() || [];
const out = { count: pads.length, samples: [], all: [] };
for (const p of pads) {
  const rec = { comp: p.designator, n: p.padNumber, x: p.x, y: p.y, l: p.layer,
                padType: p.padType, hole: p.hole, net: p.net, pad: p.pad };
  out.all.push(rec);
  if (out.samples.length < 6) out.samples.push(rec);
}
// 收集 pad 对象的形状种类
const shapes = {};
for (const p of pads) {
  const s = JSON.stringify(p.pad);
  shapes[s] = (shapes[s] || 0) + 1;
}
out.distinctPadShapes = Object.keys(shapes).length;
out.topShapes = Object.entries(shapes).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>({n:v, s:k.slice(0,300)}));
return out;
