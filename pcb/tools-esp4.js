const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const q = async (label, kw) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, 40, 1) || [];
    out[label] = r.filter(x => /WROVER/i.test(x.manufacturerId||x.name||''))
      .map(x => x.supplierId + '  ' + (x.manufacturerId||x.name).slice(0,34).padEnd(36) + ' ' + (x.footprintName||''));
  } catch(e){ out[label] = 'ERR'; }
};
await q('WROVER 系列', 'ESP32-WROVER');
await q('WROVER-E 系列', 'ESP32-WROVER-E');
// 顺便确认 S3 现在这个模组的封装尺寸
const s3 = await eda.lib_Device.search('ESP32-S3-WROOM-1-N16R8', sys, undefined, undefined, 3, 1) || [];
out['现用模组 S3-N16R8'] = s3.map(x => x.supplierId + '  ' + (x.manufacturerId||'') + '  ' + (x.footprintName||''));
return out;
