const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const list = new Map();
const add = async (kw, n=60) => {
  try { const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    for (const x of r) {
      const fp = x.footprintName || '', nm = (x.manufacturerId||'') + ' ' + (x.name||'');
      // 0603 封装 + 1µF
      if (!/C0603/.test(fp)) continue;
      if (!/(^|[^0-9.])1u?F(±|$| )|105[KMB]|1UF/i.test(nm)) continue;
      list.set(x.supplierId, { 编号:x.supplierId, 型号:(x.manufacturerId||x.name||'').slice(0,30),
                               品牌:x.manufacturer||'未标', 封装:fp });
    }
  } catch(e){}
};
for (const kw of ['0603 1uF 50V','0603 105 电容','风华 0603 1uF','三环 0603 1uF',
                  '0603 1uF X7R','贴片电容 0603 1uF','0603 105K','1uF 25V 0603']) await add(kw);
out['全部 0603 / 1µF 候选'] = [...list.values()].sort((a,b)=>a.品牌.localeCompare(b.品牌));
out['数量'] = list.size;
return out;
