const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const probe = async (label, kw) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, 30, 1) || [];
    out[label] = r.filter(x => /ESP32/i.test(x.manufacturerId||x.name||''))
      .map(x => ({ 编号:x.supplierId, 型号:(x.manufacturerId||x.name).slice(0,34),
                   封装:(x.footprintName||'').slice(0,38), 品牌:x.manufacturer||'未标' }))
      .filter(x => /N8R2|N16$|N16R8|WROVER-E-N16R8|WROOM-32E-N16|WROOM-32E-N8R2|WROVER-E-N8R8/i.test(x.型号));
  } catch(e){ out[label]='ERR'; }
};
await probe('A. WROOM-32E-N8R2', 'ESP32-WROOM-32E-N8R2');
await probe('B. WROOM-32E-N16',  'ESP32-WROOM-32E-N16');
await probe('C. WROVER-E-N16R8', 'ESP32-WROVER-E-N16R8');
await probe('C2. WROVER-E-N8R8', 'ESP32-WROVER-E-N8R8');
return out;
