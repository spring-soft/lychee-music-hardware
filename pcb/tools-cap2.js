const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const found = new Map();
for (const kw of ['国巨 0603 1uF','YAGEO 0603 1uF','CC0603 1uF','风华 0603 105','0603 1uF 25V 电容','0603 105K 25V','0603 105K 50V']) {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, 60, 1) || [];
    for (const x of r) {
      if (!/C0603/.test(x.footprintName||'')) continue;
      const nm = ((x.manufacturerId||'') + ' ' + (x.name||''));
      // 只要真正的 1µF：105 且带 K/M，或明确 1uF
      if (!/105[KMBM]|1uF|1UF/i.test(nm)) continue;
      if (/0\.0?1uF|0\.1uF|104[KMB]/i.test(nm)) continue;   // 排除 0.1µF / 0.01µF
      found.set(x.supplierId, { 编号:x.supplierId, 型号:(x.manufacturerId||x.name||'').slice(0,34), 品牌:x.manufacturer||'未标' });
    }
  } catch(e){}
}
out['0603 / 1µF 候选'] = [...found.values()];
out['数量'] = found.size;
return out;
