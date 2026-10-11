const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, test, n=60) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r.filter(test)
      .map(x => x.supplierId + '  ' + (x.manufacturerId||x.name).slice(0,32).padEnd(34) + ' ' + (x.manufacturer||'未标'))
      .slice(0, 8);
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,50); }
};
// 第12行替代：0603 / 1µF / 50V，避开三星
await run('1µF 0603 三环CCTC', '三环 0603 电容 1uF', x => /C0603/.test(x.footprintName||'') && /CCTC|三环/.test((x.manufacturer||'')+(x.manufacturerId||'')));
await run('1µF 0603 风华', '风华 0603 电容 1uF', x => /C0603/.test(x.footprintName||'') && /风华|FH|Fenghua/i.test((x.manufacturer||'')+(x.manufacturerId||'')));
await run('1µF 0603 宇阳/火炬', '0603 1uF 50V 陶瓷电容', x => /C0603/.test(x.footprintName||'') && /EYANG|宇阳|TORCH|火炬/.test((x.manufacturer||'')+(x.manufacturerId||'')));
// 第15行替代：0603 / 10kΩ / 1%，避开厚声
await run('10K 0603 国巨', '国巨 0603 10K 电阻', x => /R0603/.test(x.footprintName||'') && /YAGEO|国巨/.test((x.manufacturer||'')+(x.manufacturerId||'')));
await run('10K 0603 风华', '风华 0603 10K 电阻', x => /R0603/.test(x.footprintName||'') && /风华|FH|Fenghua/i.test((x.manufacturer||'')+(x.manufacturerId||'')));
await run('10K 0603 翔胜', '0603 10K 1% 贴片电阻', x => /R0603/.test(x.footprintName||'') && /10K|1002/i.test((x.manufacturerId||'')+(x.name||'')));
return out;
