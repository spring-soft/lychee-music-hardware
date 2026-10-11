const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));
const out = { 结果: [] };
// 清掉刚才测试的 3 个
try { const old = await eda.pcb_PrimitivePour.getAll() || [];
  if (old.length) { await eda.pcb_PrimitivePour.delete(old.map(o => o.primitiveId)); out.清测试 = old.length; await new Promise(r => setTimeout(r, 2000)); } } catch (e) {}

const M = 15, B = { l: 0, r: 2283, b: 0, t: 1969 };
const pts = [B.l+M, B.b+M, 'L', B.l+M, B.t-M, 'L', B.r-M, B.t-M, 'L', B.r-M, B.b+M, 'L', B.l+M, B.b+M];
const poly = eda.pcb_MathPolygon.createPolygon(pts);

const PLAN = [
  { net: 'VCC', layer: 15, name: 'VCC_PLANE' },
  { net: 'GND', layer: 16, name: 'GND_PLANE' },
  { net: 'GND', layer: 1,  name: 'GND_TOP'   },
  { net: 'GND', layer: 2,  name: 'GND_BOT'   },
];
for (const p of PLAN) {
  let r = null, err = null;
  try { r = await eda.pcb_PrimitivePour.create(p.net, p.layer, poly, 'solid', false, p.name, 1, 8, false); }
  catch (e) { err = String(e && e.message || e).slice(0, 100); }
  out.结果.push({ 层: p.layer, 网络: p.net, 名: p.name, 状态: r ? 'OK' : ('失败 ' + err) });
  await new Promise(r => setTimeout(r, 1500));
}
await new Promise(r => setTimeout(r, 2500));
try { await eda.pcb_Document.save(); out.保存 = '成功'; } catch (e) { out.保存 = '失败 ' + String(e.message||e).slice(0,60); }
const after = await eda.pcb_PrimitivePour.getAll() || [];
out.铺铜总数 = after.length;
out.复核 = after.map(o => ({ 层: o.layer, 网络: o.net, 名: o.pourName || o.name }));
out.填充体数 = (await eda.pcb_PrimitivePoured.getAll() || []).length;
return out;
