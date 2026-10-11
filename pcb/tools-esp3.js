const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const found = new Map();
for (const kw of ['ESP32-WROVER-E','ESP32-WROVER-E-N16R8','ESP32-WROVER-IE','WROVER-E',
                  'ESP32-WROVER-B','ESP32-WROVER-N16R8','ESP32-WROOM-32E','ESP32-WROOM-32E-N16']) {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, 50, 1) || [];
    for (const x of r) {
      const n = (x.manufacturerId || x.name || '');
      if (!/WROVER|WROOM-32E/i.test(n)) continue;
      if (/S2|S3|C3|C6/i.test(n)) continue;
      found.set(x.supplierId, { 编号:x.supplierId, 型号:n.slice(0,40), 封装:(x.footprintName||'').slice(0,46), 品牌:x.manufacturer||'未标' });
    }
  } catch(e){}
}
return { 'WROVER / WROOM-32E': [...found.values()].sort((a,b)=>a.型号.localeCompare(b.型号)), 数量: found.size };
