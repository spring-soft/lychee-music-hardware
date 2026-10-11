const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpFilter, n=20) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r
      .filter(x => !fpFilter || fpFilter.test(x.footprintName || ''))
      .map(x => ({ 型号: x.manufacturerId || x.name, 编号: x.supplierId,
                   封装: x.footprintName, 厂商: x.manufacturer,
                   库: x.otherProperty && x.otherProperty['JLCPCB Part Class'] }));
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,60); }
};
await run('❶ 6×6×5直插按键(找 KEY-TH_2P-L6.0-W6.0)', '轻触开关 6*6*5 直插', /KEY-TH_2P-L6\.0-W6\.0|KEY-TH_2P-L6\.0/);
await run('❷ 0603绿色LED', 'LED 0603 绿', /LED|0603/i);
await run('❸ 3×4贴片按键(找 SW-SMD_L4.0-W2.9)', '3*4 轻触开关 贴片', /SW-SMD_L4|SW-SMD_L3/);
await run('❹ SOT-23-5 3.3V LDO', 'TLV75733', /SOT-23-5/i);
await run('❺ IP5306 (ESOP-8)', 'IP5306', /ESOP-8|SOP-8/i);
return out;
