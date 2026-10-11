const p = await eda.dmt_Pcb.getAllPcbsInfo();
await eda.dmt_EditorControl.openDocument(p[0].uuid);
await new Promise(r=>setTimeout(r,3000));
// 恢复全部图层显示
const all = await eda.pcb_Layer.getAllLayers() || [];
for (const L of all) if (L.id) { try { await eda.pcb_Layer.setLayerVisible(L.id); } catch(e){} }
await new Promise(r=>setTimeout(r,1000));

const lines = await eda.pcb_PrimitiveLine.getAll() || [];
const vias  = await eda.pcb_PrimitiveVia.getAll() || [];
const out = { 图层已恢复: true };

// ① 天线禁布区（x 15..765, y >1890）里有没有铜
const ANT = { l: 15, r: 765, b: 1890, t: 1969 };
const inAnt = (x, y) => x >= ANT.l && x <= ANT.r && y >= ANT.b;
out.天线区内的走线 = lines.filter(l => inAnt(l.startX,l.startY) || inAnt(l.endX,l.endY))
  .map(l => l.net+'@'+Math.round(l.startX)+','+Math.round(l.startY));
out.天线区内的过孔 = vias.filter(v => inAnt(v.x,v.y)).map(v => v.net+'@'+Math.round(v.x)+','+Math.round(v.y));

// ② 板边 8mil 内有没有铜
const E = 8;
out.越界铜 = {
  走线: lines.filter(l => [l.startX,l.endX].some(x=>x<0||x>2283) || [l.startY,l.endY].some(y=>y<0||y>1969)).length,
  过孔: vias.filter(v => v.x<0||v.x>2283||v.y<0||v.y>1969).length,
};

// ③ USB 差分对：两条线的层分布、是否并行走
const usb = lines.filter(l => l.net==='USB_DP'||l.net==='USB_DN');
out.USB = { DP段数: usb.filter(l=>l.net==='USB_DP').length, DN段数: usb.filter(l=>l.net==='USB_DN').length,
  DP层: [...new Set(usb.filter(l=>l.net==='USB_DP').map(l=>l.layer))].join('/'),
  DN层: [...new Set(usb.filter(l=>l.net==='USB_DN').map(l=>l.layer))].join('/') };

// ④ 电源芯片关键脚确认
const comps = await eda.pcb_PrimitiveComponent.getAll() || [];
const find = d => comps.find(c=>c.designator===d);
const padsOf = async d => { const c = find(d); if(!c) return null;
  const pins = await eda.pcb_PrimitiveComponent.getAllPinsByPrimitiveId(c.primitiveId) || [];
  return pins.filter(x=>x.net).map(x=>x.number+':'+x.net).sort(); };
out.IP5306_U4 = await padsOf('U4');
out.LDO_U3 = await padsOf('U3');
out.ES8388_U2_电源 = (await padsOf('U2') || []).filter(x=>/VCC|GND|AVDD|HPVDD|VREF|VMID/.test(x));
return out;
