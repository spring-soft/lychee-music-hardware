const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpRe, n=50) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r.filter(x => fpRe.test(x.footprintName || ''))
      .map(x => x.supplierId + '  ' + (x.manufacturerId||x.name).slice(0,26).padEnd(28) + ' 品牌:' + (x.manufacturer || '未标'));
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,50); }
};
await run('A. 按封装名搜 6×6×5直插', 'KEY-TH_2P-L6.0-W6.0-P5.00', /^KEY-TH_2P-L6\.0-W6\.0-P5\.00$/);
await run('B. 关键词 6x6x5 直插 2脚', '6x6x5 直插 轻触', /KEY-TH_2P-L6\.0-W6\.0/);
await run('C. 关键词 轻触开关 直插', '轻触开关 直插 6*6', /KEY-TH_2P-L6\.0-W6\.0/);
await run('D. 关键词 TS-1088', 'TS1088 轻触开关', /KEY-TH_2P-L6\.0-W6\.0/);
return out;
