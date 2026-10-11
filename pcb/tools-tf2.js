const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
for (const [label, lcsc] of [['国产 SH-TF-01A','C22383473'], ['聚兴泰 TF-01A','C41426929'], ['原版 TF-01A','C91145']]) {
  try {
    const r = await eda.lib_Device.search(lcsc, sys, undefined, undefined, 5, 1) || [];
    const d = r.find(x => x.supplierId === lcsc) || r[0];
    if (!d) { out[label] = '未找到'; continue; }
    out[label] = { 型号:d.manufacturerId, 封装:d.footprintName,
                   deviceUuid:d.uuid, symbolUuid:d.symbolUuid, footprintUuid:d.footprintUuid,
                   封装名:d.footprintName };
  } catch(e){ out[label] = 'ERR '+e.message.slice(0,50); }
}
// 取封装真实包围盒
try {
  const r = await eda.lib_Device.search('C22383473', sys, undefined, undefined, 3, 1) || [];
  const d = r[0];
  if (d) {
    const fp = await eda.lib_Footprint.get(d.footprintUuid);
    out['封装对象字段'] = fp ? Object.keys(fp) : null;
    out['封装信息'] = fp ? JSON.stringify(fp).slice(0,600) : null;
  }
} catch(e){ out.fpErr = e.message.slice(0,80); }
return out;
