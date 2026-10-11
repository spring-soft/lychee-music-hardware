const out = {};
const s = await eda.dmt_Schematic.getAllSchematicsInfo();
out.schematics = JSON.stringify(s).slice(0,400);
const pages = await eda.dmt_Schematic.getAllSchematicPagesInfo();
out.pages = JSON.stringify(pages).slice(0,400);
const uuid = (pages && pages[0] && (pages[0].uuid || pages[0].pageUuid)) ||
             (s && s[0] && (s[0].uuid));
out.用的uuid = uuid;
if (uuid) {
  await eda.dmt_EditorControl.openDocument(uuid);
  await new Promise(r=>setTimeout(r,4000));
  try {
    const comps = await eda.sch_PrimitiveComponent.getAll() || [];
    out.器件数 = comps.length;
    const u1 = comps.find(c => c.designator === 'U1');
    if (u1) {
      const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(u1.primitiveId) || [];
      out.U1引脚 = pins.map(p => ({ 号:p.number, 名:p.name, 网:p.net }))
        .sort((a,b)=>{const x=parseInt(a.号),y=parseInt(b.号);return (isNaN(x)?999:x)-(isNaN(y)?999:y);});
    } else out.err = 'U1未找到; 位号样例: ' + comps.slice(0,20).map(c=>c.designator).join(',');
  } catch(e) { out.getAllErr = e.message.slice(0,80); }
}
return out;
