const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
const out = {};
// 'R' 格式的真实含义
const polyR = eda.pcb_MathPolygon.createPolygon(['R', 100, 200, 800, 400, 0, 0]);
out.R源 = polyR.getSource();
try { out.R宽 = await eda.pcb_MathPolygon.calculateWidth(polyR); } catch(e){ out.R宽='ERR'; }
try { out.R高 = await eda.pcb_MathPolygon.calculateHeight(polyR); } catch(e){ out.R高='ERR'; }
try { out.R包围盒宽 = await eda.pcb_MathPolygon.calculateBBoxWidth(polyR); } catch(e){ out.R包围盒宽='ERR'; }
try { out.R包围盒高 = await eda.pcb_MathPolygon.calculateBBoxHeight(polyR); } catch(e){ out.R包围盒高='ERR'; }
try { out.R中心 = await polyR.getCenter(); } catch(e){ out.R中心='ERR'; }

// 闭合的点串格式能不能用
const closed = [100, 200, 'L', 900, 200, 'L', 900, 600, 'L', 100, 600, 'L', 100, 200];
let p2=null, err2=null;
try { p2 = eda.pcb_MathPolygon.createPolygon(closed); } catch(e){ err2 = e.message.slice(0,60); }
out.闭合L格式 = p2 ? { 源: p2.getSource() } : ('创建失败: '+err2);
if (p2) {
  try { out.闭合L中心 = await p2.getCenter(); } catch(e){ out.闭合L中心='ERR'; }
  try { await eda.pcb_PrimitivePour.create('GND', 1, p2, 'solid', false, '闭合测试', 5, 10, false); out.闭合L能否建铺铜 = true; }
  catch(e){ out.闭合L能否建铺铜 = '失败: '+e.message.slice(0,60); }
}
await new Promise(r=>setTimeout(r,1500));
const pours = await eda.pcb_PrimitivePour.getAll() || [];
out.当前铺铜 = pours.map(x => ({ net:x.net, layer:x.layer, name:x.pourName }));
return out;
