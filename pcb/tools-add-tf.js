const SYS = '0819f05c4eef4c71ace90d822a990e87';
const out = { placed: [] };
await eda.dmt_EditorControl.openDocument('43ecd6bbed92787b');
await new Promise(r=>setTimeout(r,4500));

// 查三个元件的 device uuid
const dev = {};
for (const [k, lcsc] of [['TF','C41426929'], ['C100N','C14663'], ['C10U','C19702']]) {
  const r = await eda.lib_Device.search(lcsc, SYS, undefined, undefined, 5, 1) || [];
  const d = r.find(x => x.supplierId === lcsc) || r[0];
  dev[k] = d ? { uuid: d.uuid, name: d.manufacturerId, fp: d.footprintName } : null;
}
out.器件 = dev;
if (!dev.TF) return { err:'TF 卡座未找到' };

const place = async (key, x, y) => {
  try {
    const r = await eda.sch_PrimitiveComponent.create(
      { libraryUuid: SYS, uuid: dev[key].uuid }, x, y, '', 0, false, true, true);
    out.placed.push({ key, x, y, ok: !!r, designator: r && r.designator });
    return r;
  } catch(e) { out.placed.push({ key, err: e.message.slice(0,90) }); return null; }
};
await place('TF', 3400, 2000);
await new Promise(r=>setTimeout(r,800));
await place('C100N', 3200, 1900);
await new Promise(r=>setTimeout(r,800));
await place('C10U', 3200, 2120);
await new Promise(r=>setTimeout(r,2000));

const comps = await eda.sch_PrimitiveComponent.getAll() || [];
const tf = comps.filter(c => /TF/i.test(c.designator||'') || (c.manufacturerId||'').includes('TF-01A'));
out.新元件 = comps.filter(c => ['TF1','TF2','C28','C29','C30','C31','U5'].includes(c.designator))
  .map(c => ({ 位号:c.designator, x:c.x, y:c.y }));
if (tf.length) {
  const t = tf[tf.length-1];
  const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(t.primitiveId) || [];
  out.TF引脚 = pins.map(p => ({ 脚号:p.pinNumber, 名:p.pinName, x:p.x, y:p.y }));
}
let s=null; try { s = await eda.sch_Document.save(); } catch(e){}
out.保存 = s === undefined ? '完成' : s;
return out;
