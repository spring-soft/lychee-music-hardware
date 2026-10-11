const MIL = 0.0254;
const PCB = 'ec13f49100d66f9f';
await eda.dmt_EditorControl.openDocument(PCB);
await new Promise(r=>setTimeout(r,4000));
const BODY = {
  U1:{w:709,h:1004,anchor:'bottom'}, U2:{w:165,h:165}, U3:{w:118,h:118}, Q1:{w:118,h:118},
  U4:{w:197,h:236}, L1:{w:157,h:157},
  J1:{w:380,h:340}, J2:{w:559,h:244}, J3:{w:402,h:110}, J4:{w:120,h:150},
  SW1:{w:236,h:236}, SW2:{w:236,h:236}, SW3:{w:236,h:236}, SW4:{w:236,h:236},
  SW5:{w:197,h:114}, SW6:{w:197,h:114}, SW7:{w:236,h:236},
  C15:{w:150,h:115}, C16:{w:150,h:115}, EC1:{w:311,h:154},
  CARD1:{w:667,h:590},   // TF-01A 本体（焊盘 611×416 + 本体余量）
};
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const boxes = [];
for (const c of comps) {
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  const ps = pins.filter(p => p.x !== undefined);
  if (!ps.length) continue;
  const xs = ps.map(p=>p.x), ys = ps.map(p=>p.y);
  const pl=Math.min(...xs), pr=Math.max(...xs), pb=Math.min(...ys), pt=Math.max(...ys);
  const B = BODY[c.designator];
  let box;
  if (B) {
    const rot = (c.rotation % 180) !== 0;
    const bw = rot ? B.h : B.w, bh = rot ? B.w : B.h;
    box = { l:c.x-bw/2, r:c.x+bw/2, b:c.y-bh/2, t:c.y+bh/2 };
    if (B.anchor==='bottom' && !rot) box = { l:c.x-bw/2, r:c.x+bw/2, b:pb, t:pb+bh };
  } else {
    const horiz = (pr-pl) >= (pt-pb);
    const L=63,S=31;
    box = horiz ? { l:(pl+pr)/2-L/2, r:(pl+pr)/2+L/2, b:(pb+pt)/2-S/2, t:(pb+pt)/2+S/2 }
                : { l:(pl+pr)/2-S/2, r:(pl+pr)/2+S/2, b:(pb+pt)/2-L/2, t:(pb+pt)/2+L/2 };
  }
  box.des=c.designator; box.layer=c.layer;
  boxes.push(box);
}
// 同层重叠
const over=[];
for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
  const a=boxes[i], c=boxes[j];
  if (a.layer!==c.layer) continue;
  const ox=Math.min(a.r,c.r)-Math.max(a.l,c.l), oy=Math.min(a.t,c.t)-Math.max(a.b,c.b);
  if (ox>2 && oy>2) over.push(a.des+'↔'+c.des+'  重叠 '+Math.round(ox)+'×'+Math.round(oy)+' mil  (层'+a.layer+')');
}
// 出界
const oob = boxes.filter(x => x.l<0 || x.r>2283 || x.b<0 || x.t>2166)
  .map(x => x.des+' 越界  x['+Math.round(x.l)+','+Math.round(x.r)+'] y['+Math.round(x.b)+','+Math.round(x.t)+']');
// CARD1 附近
const card = boxes.find(b=>b.des==='CARD1');
const near = card ? boxes.filter(b => b.des!=='CARD1' && b.layer===2 &&
  Math.min(b.r,card.r)-Math.max(b.l,card.l) > -100 && Math.min(b.t,card.t)-Math.max(b.b,card.b) > -100)
  .map(b=>b.des) : [];
return { 元件数: boxes.length, 重叠数: over.length, 重叠: over.slice(0,15),
         出界数: oob.length, 出界: oob,
         卡座本体范围: card ? {x:Math.round(card.l)+'~'+Math.round(card.r), y:Math.round(card.b)+'~'+Math.round(card.t)} : null,
         卡座附近100mil内的背面元件: near };
