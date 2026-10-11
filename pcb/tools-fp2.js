const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpRe, n=40) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    const list = r.filter(x => fpRe.test(x.footprintName || ''))
      .map(x => ({ 型号: x.manufacturerId || x.name, 编号: x.supplierId, 封装: x.footprintName }));
    out[label] = list.length ? list : '（无匹配）';
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,50); }
};
await run('❶ 6×6×5 直插按键', 'KEY-TH_2P-L6.0-W6.0-P5.00', /KEY-TH_2P-L6\.0-W6\.0-P5\.00/);
await run('❶b 6×6×5 直插 关键词', '轻触开关 6*6*5 直插', /KEY-TH_2P-L6\.0-W6\.0/);
await run('❷ FPC 14P 0.5mm', 'FPC-SMD_14P-P0.50', /FPC-SMD_14P-P0\.50/);
await run('❷b FPC 14P 关键词', 'FPC 0.5mm 14P 下接', /FPC-SMD_14P-P0\.5/);
await run('❸ 电池座 CONN-SMD_2P-P1.25', 'CONN-SMD_2P-P1.25', /CONN-SMD_2P-P1\.25/);
await run('❹ 3×4 贴片按键', 'SW-SMD_L4.0-W2.9-LS5.0', /SW-SMD_L4\.0-W2\.9-LS5\.0/);
return out;
