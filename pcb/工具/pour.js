const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));

const M = 15;                       // 距板边 15mil（DRC 规则要求 10mil）
const B = { l: 0, r: 2283, b: 0, t: 1969 };
const pts = [B.l + M, B.b + M, 'L', B.l + M, B.t - M, 'L', B.r - M, B.t - M, 'L', B.r - M, B.b + M, 'L', B.l + M, B.b + M];

const PLAN = [
  { net: 'VCC', layer: 15, name: 'VCC_PLANE' },   // 内层1 = 电源平面
  { net: 'GND', layer: 16, name: 'GND_PLANE' },   // 内层2 = 地平面
  { net: 'GND', layer: 1,  name: 'GND_TOP'   },   // 顶层
  { net: 'GND', layer: 2,  name: 'GND_BOT'   },   // 底层
];

const out = { 铺铜: [] };
// 先清掉已有铺铜，避免重复
try {
  const old = await eda.pcb_PrimitivePour.getAll() || [];
  if (old.length) { await eda.pcb_PrimitivePour.delete(old.map(o => o.primitiveId)); out.清旧 = old.length; await new Promise(r => setTimeout(r, 2000)); }
} catch (e) { out.清旧err = String(e.message || e).slice(0, 60); }

for (const p of PLAN) {
  let ok = null, err = null;
  try {
    ok = await eda.pcb_PrimitivePour.create(
      p.net, p.layer, eda.pcb_MathPolygon.createPolygon(pts),
      2 /* SOLID */, false, p.name, 1, 8, false);
  } catch (e) { err = String(e && e.message || e).slice(0, 120); }
  out.铺铜.push({ 层: p.layer, 网络: p.net, 名: p.name, 结果: ok ? 'OK' : ('失败 ' + (err || 'null')) });
  await new Promise(r => setTimeout(r, 1500));
}
await new Promise(r => setTimeout(r, 2000));
try { await eda.pcb_Document.save(); out.保存 = '成功'; } catch (e) { out.保存 = '失败 ' + String(e.message || e).slice(0, 60); }

// 复核
const after = await eda.pcb_PrimitivePour.getAll() || [];
out.铺铜总数 = after.length;
out.明细 = after.map(o => ({ 层: o.layer, 网络: o.net, 名: o.pourName || o.name }));
return out;
