const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r => setTimeout(r, 6000));
const out = {};
// 清掉现有 4 个铺铜
try { const old = await eda.pcb_PrimitivePour.getAll() || [];
  if (old.length) { await eda.pcb_PrimitivePour.delete(old.map(o => o.primitiveId)); out.已清 = old.length; await new Promise(r => setTimeout(r, 2500)); } } catch (e) { out.清err = String(e.message||e).slice(0,60); }

const M = 15, B = { l: 0, r: 2283, b: 0, t: 1969 };
// 天线避空凹口：模组 x 186~895，铺铜上边缘从 1954 退到 1900
const NL = 186, NR = 895, NT = 1900;
const pts = [
  B.l+M, B.b+M, 'L',
  B.r-M, B.b+M, 'L',
  B.r-M, B.t-M, 'L',
  NR,    B.t-M, 'L',
  NR,    NT,    'L',
  NL,    NT,    'L',
  NL,    B.t-M, 'L',
  B.l+M, B.t-M, 'L',
  B.l+M, B.b+M,
];
const poly = eda.pcb_MathPolygon.createPolygon(pts);
out.多边形点数 = pts.length;

const PLAN = [
  { net: 'VCC', layer: 15, name: 'VCC_PLANE' },
  { net: 'GND', layer: 16, name: 'GND_PLANE' },
  { net: 'GND', layer: 1,  name: 'GND_TOP'   },
  { net: 'GND', layer: 2,  name: 'GND_BOT'   },
];
out.结果 = [];
for (const p of PLAN) {
  let r = null, err = null;
  try { r = await eda.pcb_PrimitivePour.create(p.net, p.layer, poly, 'solid', false, p.name, 1, 8, false); }
  catch (e) { err = String(e && e.message || e).slice(0, 100); }
  out.结果.push(p.name + '@层' + p.layer + ' ' + (r ? 'OK' : '失败 ' + err));
  await new Promise(r => setTimeout(r, 1500));
}
await new Promise(r => setTimeout(r, 2500));
try { await eda.pcb_Document.save(); out.保存 = '成功'; } catch (e) { out.保存 = '失败'; }
out.铺铜边框数 = (await eda.pcb_PrimitivePour.getAll() || []).length;
out.填充体数 = (await eda.pcb_PrimitivePoured.getAll() || []).length;
return out;
