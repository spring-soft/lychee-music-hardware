const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
for (const c of ['C71845','C9900014849','C9900017573','C485517','C181692']) {
  try {
    const r = await eda.lib_Device.search(c, sys, undefined, undefined, 3, 1) || [];
    const hit = r.find(x => x.supplierId === c) || r[0];
    out[c] = hit ? { 型号: hit.manufacturerId, 名称: hit.name, 封装: hit.footprintName,
                     厂商: hit.manufacturer, 库: (hit.otherProperty||{})['JLCPCB Part Class'] } : '未找到';
  } catch(e) { out[c] = 'ERR'; }
}
// 顺便搜 3×4 贴片按键的准确封装
try {
  const r = await eda.lib_Device.search('SW-SMD_L4.0-W2.9-LS5.0', sys, undefined, undefined, 6, 1) || [];
  out['3×4按键_按封装搜'] = r.map(x => ({ 型号: x.manufacturerId, 编号: x.supplierId, 封装: x.footprintName }));
} catch(e) { out['3×4按键_按封装搜'] = 'ERR'; }
return out;
