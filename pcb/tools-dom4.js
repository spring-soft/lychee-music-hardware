const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpRe, n=50) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r.filter(x => fpRe.test(x.footprintName || ''))
      .map(x => x.supplierId + '  ' + (x.manufacturerId||x.name).slice(0,30).padEnd(32) + ' ' + (x.manufacturer||'未标'))
      .slice(0, 12);
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,50); }
};
// 12行：1µF/50V 0603 电容 → 国产
await run('1µF 0603 国产', '0603 1uF 50V X7R', /C0603/i);
await run('1µF 0603 三环/火炬', 'CT41 0603 1uF', /C0603/i);
// 15行：10kΩ 0603 电阻 → 有货的
await run('10kΩ 0603 电阻', '0603 10K 1% 贴片电阻', /R0603/i);
await run('10kΩ 0603 风华/国巨', '贴片电阻 0603 10K', /R0603/i);
return out;
