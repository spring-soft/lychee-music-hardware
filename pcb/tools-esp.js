const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const found = new Map();
for (const kw of ['ESP32-WROVER','ESP32-WROOM-32E','ESP32-WROOM-32','ESP32-S3-WROOM-1',
                  'ESP32-WROVER-E','ESP32-WROOM-32UE']) {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, 40, 1) || [];
    for (const x of r) {
      const n = (x.manufacturerId || x.name || '');
      if (!/ESP32/i.test(n)) continue;
      found.set(x.supplierId, { 编号:x.supplierId, 型号:n.slice(0,36),
        封装:(x.footprintName||'').slice(0,40), 品牌:x.manufacturer||'未标' });
    }
  } catch(e){}
}
out['ESP32 模组候选'] = [...found.values()].sort((a,b)=>a.型号.localeCompare(b.型号));
out['数量'] = found.size;
return out;
