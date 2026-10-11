const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, n=100) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    const hit = r.filter(x => /C0603/.test(x.footprintName||'') &&
      /(^|[^0-9.])1u?F|105K|105M|1UF/i.test((x.manufacturerId||'')+(x.name||'')))
      .map(x => x.supplierId + '  ' + (x.manufacturerId||x.name).slice(0,36).padEnd(38) + ' ' + (x.manufacturer||'未标'));
    out[label] = hit.length ? hit.slice(0,10) : '（无）';
  } catch(e) { out[label] = 'ERR'; }
};
await run('搜 0603 1uF', '0603 1uF');
await run('搜 1uF 50V 0603', '1uF 50V 0603 X7R');
await run('搜 105 0603', '0603 105 电容');
await run('搜 贴片电容1uF', '贴片电容 1uF');
return out;
