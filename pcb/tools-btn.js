const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const KEY = /KEY-TH_2P-L6\.0-W6\.0-P5\.00/;
const collect = async (kw, n=60) => {
  try { return (await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [])
    .filter(x => KEY.test(x.footprintName||'')); } catch(e) { return []; }
};
const seen = new Map();
for (const kw of ['轻触开关 6*6*5 直插','6*6*5 轻触开关','轻触开关 直插 6X6X5','XKB 轻触开关 6*6',
                  '轻触开关 6x6x5 2脚 直插','tact switch 6*6*5','按键开关 6*6*5 直插']) {
  for (const x of await collect(kw)) seen.set(x.supplierId, x);
}
const list = [...seen.values()].map(x => ({
  编号: x.supplierId,
  型号: (x.manufacturerId || x.name || '').slice(0,34),
  品牌: x.manufacturer || '（未标）',
}));
// 排除已知的进口/韩系
const foreign = /OMRON|欧姆龙|韩荣|TI|TDK|AVX|KEMET|MURATA|村田/;
out['✅ 可试的候选（非进口）'] = list.filter(x => !foreign.test(x.品牌));
out['❌ 已知进口/韩系（避开）'] = list.filter(x => foreign.test(x.品牌));
out['总数'] = list.length;
return out;
