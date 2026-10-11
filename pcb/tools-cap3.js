const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const found = new Map();
// 直接按品牌型号前缀搜
for (const kw of ['0603F105','0603X105','风华 1uF','FH 0603 105','CC0603KRX5R','CC0603 105',
                  '三环 105 0603','CCTC 0603 1uF','宇阳 0603 1uF','EYANG 0603 105',
                  '0603 1uF 16V 电容','0603 1uF 25V 电容','0603 1uF 50V 电容']) {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, 60, 1) || [];
    for (const x of r) {
      if (!/C0603/.test(x.footprintName||'')) continue;
      const nm = ((x.manufacturerId||'') + ' ' + (x.name||''));
      if (!/105[KMBM]|1uF/i.test(nm)) continue;
      if (/0\.0?1uF|0\.1uF|104[KMB]/i.test(nm)) continue;
      const brand = x.manufacturer || '未标';
      if (/muRata|村田|TDK|三星|SAMSUNG|JOHANSON|AVX|KEMET|Kyocera/i.test(brand)) continue; // 排除进口
      found.set(x.supplierId, { 编号:x.supplierId, 型号:(x.manufacturerId||x.name||'').slice(0,34), 品牌:brand });
    }
  } catch(e){}
}
out['非进口的 0603/1µF 候选'] = [...found.values()].sort((a,b)=>a.品牌.localeCompare(b.品牌));
out['数量'] = found.size;
return out;
