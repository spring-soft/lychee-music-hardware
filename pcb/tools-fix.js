const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpFilter, n=30) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r.filter(x => !fpFilter || fpFilter.test(x.footprintName || ''))
      .map(x => ({ 型号: x.manufacturerId || x.name, 编号: x.supplierId,
                   封装: x.footprintName, 厂商: x.manufacturer }));
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,60); }
};
// ① 电池座：SP088 的封装是 MX1.25-2P（1.25mm 间距 2 芯线对板）
await run('电池座 MX1.25-2P', 'MX1.25-2P', /MX1\.25-2|1\.25-2P/i);
await run('电池座 搜索2', '1.25mm 2P 卧贴 连接器', /1\.25/i);
// ② FPC 14P 0.5mm 下接
await run('FPC 14P 0.5mm', 'FPC 14P 0.5mm 下接', /FPC|14P/i);
await run('FPC 搜索2', '0.5mm 14P FPC 连接器', /FPC/i);
// ③ 6×6×5 直插按键
await run('6×6×5 直插按键', '轻触开关 6*6*5 直插 2脚', /KEY-TH_2P-L6\.0-W6\.0/);
// ④ 3×4 贴片按键
await run('3×4 贴片按键', 'SW-SMD_L4.0-W2.9-LS5.0', /SW-SMD_L4\.0-W2\.9-LS5\.0/);
return out;
