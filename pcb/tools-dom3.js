const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpRe, n=50) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    out[label] = r.filter(x => fpRe.test(x.footprintName || ''))
      .map(x => x.supplierId + '  ' + (x.manufacturerId||x.name).slice(0,24).padEnd(26) + ' 品牌:' + (x.manufacturer||'未标'))
      .slice(0, 10);
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,50); }
};
// 磁珠 0603 600Ω（原为 TDK 日本件）
await run('磁珠 0603 600Ω', '贴片磁珠 0603 600Ω', /0603|L0603/i);
// 10µF 0603（原为三星）
await run('10µF 0603 电容', '贴片电容 0603 10uF 10V', /C0603/i);
// 1µF 0603
await run('1µF 0603 电容', '贴片电容 0603 1uF 50V', /C0603/i);
// Type-C（原为韩国韩荣）
await run('Type-C 座', 'TYPE-C-31-M-12', /USB-C_SMD-TYPE-C-31-M-12/);
return out;
