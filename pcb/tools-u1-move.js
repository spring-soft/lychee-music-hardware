const PCB = 'ec13f49100d66f9f';
const out = {};
await eda.dmt_EditorControl.openDocument(PCB);
let comps = null;
for (let i=0;i<6;i++){ await new Promise(r=>setTimeout(r,2500));
  comps = await eda.pcb_PrimitiveComponent.getAll(); if (comps && comps.length) break; }
if (!comps) return { err:'读取失败' };
const u1 = comps.find(c=>c.designator==='U1');
out.U1现状 = { x: Math.round(u1.x), y: Math.round(u1.y) };
// U1 本体 x 是 u1.x ± 354.5；往右移 150 后右边缘 = u1.x+354.5+150
const newRight = u1.x + 354.5 + 150;
// U1 本体 y 范围（anchor bottom）：1210+197 ~ 1210+197+1004
const yb = 1210 + 197, yt = yb + 1004;
out.U1本体 = { x: Math.round(u1.x-354.5)+' ~ '+Math.round(u1.x+354.5),
               y: yb+' ~ '+yt };
// 找会撞上的：背面、x 在 [旧右边缘, 新右边缘] 之间、y 在 U1 范围内
const hit = comps.filter(c => {
  if (c.designator === 'U1' || c.layer !== 2) return false;
  return c.x > (u1.x+354.5-40) && c.x < newRight+40 && c.y > yb-60 && c.y < yt+60;
}).map(c => c.designator+'@'+Math.round(c.x)+','+Math.round(c.y));
out.会撞到的背面元件 = hit;
out.移后左通道 = Math.round(u1.x-354.5+150)+' mil = '+(((u1.x-354.5+150)*0.0254).toFixed(1))+'mm';
return out;
