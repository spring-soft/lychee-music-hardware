const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpRe, n=40) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r.filter(x => fpRe.test(x.footprintName || ''))
      .map(x => ({ 型号: x.manufacturerId || x.name, 编号: x.supplierId,
                   品牌: x.manufacturer || '（未标）', 封装: x.footprintName }));
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,50); }
};
// 6×6×5 直插按键：同封装，尽量国产
await run('6×6×5直插按键 全部候选', '轻触开关 6*6*5', /KEY-TH_2P-L6\.0-W6\.0-P5\.00/);
// 3×4 贴片按键：同封装，国产
await run('3×4贴片按键 全部候选', '贴片 轻触开关 3*4', /SW-SMD_L4\.0-W2\.9-LS5\.0/);
// 其它可能海外代购的
await run('PJ-320A 耳机座', 'PJ-320A', /AUDIO-TH_XKB_PJ-320A/);
await run('Type-C 座', 'TYPE-C-31-M-12', /USB-C_SMD-TYPE-C-31-M-12/);
return out;
