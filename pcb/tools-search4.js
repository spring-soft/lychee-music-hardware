const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpFilter, n=25) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r.filter(x => !fpFilter || fpFilter.test(x.footprintName || ''))
      .map(x => ({ 型号: x.manufacturerId || x.name, 编号: x.supplierId, 封装: x.footprintName,
                   厂商: x.manufacturer, 库: (x.otherProperty||{})['JLCPCB Part Class'] }));
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,60); }
};
await run('❸ 3×4贴片按键', '3*4 贴片 轻触开关', /SW-SMD_L4|SW-SMD/);
await run('❸b 通用贴片按键', '贴片轻触开关', /SW-SMD_L4\.0-W2\.9-LS5\.0/);
await run('❹ SOT-23-5 3.3V LDO', 'TLV75733PDBVR', /SOT-23-5/i);
await run('❹b 3.3V LDO SOT23-5', 'LDO 3.3V SOT-23-5', /SOT-23-5/i);
await run('❺ IP5306', 'IP5306', /ESOP-8|SOP-8/i);
return out;
