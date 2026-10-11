const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, test, n=60) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r.filter(x => test(x))
      .map(x => x.supplierId + '  ' + (x.manufacturerId||x.name).slice(0,34).padEnd(36) + ' ' + (x.manufacturer||'未标'))
      .slice(0, 10);
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,50); }
};
// 目标：0603 封装、1µF、50V 或 ≥25V、国产
const is0603 = x => /C0603/i.test(x.footprintName||'');
await run('1µF 0603 电容候选', '贴片电容 0603 1uF', x => is0603(x) && /1u?F|105|1000n/i.test((x.manufacturerId||'')+(x.name||'')), 80);
await run('1µF 0603 搜2', '0603 1uF 50V X7R 电容', x => is0603(x), 80);
// 目标：0603 封装、10kΩ、1%
const isR0603 = x => /R0603/i.test(x.footprintName||'');
await run('10kΩ 0603 电阻候选', '贴片电阻 0603 10K 1%', x => isR0603(x) && /10K|1002/i.test((x.manufacturerId||'')+(x.name||'')), 80);
return out;
