const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));
const M = 15, B = { l: 0, r: 2283, b: 0, t: 1969 };
const pts = [B.l+M, B.b+M, 'L', B.l+M, B.t-M, 'L', B.r-M, B.t-M, 'L', B.r-M, B.b+M, 'L', B.l+M, B.b+M];
const poly = eda.pcb_MathPolygon.createPolygon(pts);
const out = { poly类型: poly ? Object.keys(poly) : null };

// 变体 A：最少参数 + 'solid'
try { const r = await eda.pcb_PrimitivePour.create('GND', 1, poly, 'solid');
      out.A_最少参数 = r ? 'OK id=' + r.primitiveId : 'null'; }
catch (e) { out.A = String(e && e.message || e).slice(0, 140); }
await new Promise(r => setTimeout(r, 1200));

// 变体 B：带 preserveSilos=false
try { const r = await eda.pcb_PrimitivePour.create('GND', 2, poly, 'solid', false);
      out.B_带silos = r ? 'OK id=' + r.primitiveId : 'null'; }
catch (e) { out.B = String(e && e.message || e).slice(0, 140); }
await new Promise(r => setTimeout(r, 1200));

// 变体 C：'90grid'
try { const r = await eda.pcb_PrimitivePour.create('GND', 15, poly, '90grid');
      out.C_grid = r ? 'OK id=' + r.primitiveId : 'null'; }
catch (e) { out.C = String(e && e.message || e).slice(0, 140); }
await new Promise(r => setTimeout(r, 1200));

out.当前铺铜数 = (await eda.pcb_PrimitivePour.getAll() || []).length;
return out;
