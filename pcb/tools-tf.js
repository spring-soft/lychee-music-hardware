const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const found = new Map();
for (const kw of ['自弹式 TF卡座','推推式 TF 卡座','microSD 卡座 自弹','TF卡座 自弹式 贴片',
                  'TF-01A','TF卡槽 推推','SD卡座 自弹式']) {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, 50, 1) || [];
    for (const x of r) {
      const n = (x.manufacturerId || x.name || ''), fp = x.footprintName || '';
      if (!/TF|SD|MicroSD|microSD|卡座|卡槽/i.test(n + fp)) continue;
      found.set(x.supplierId, { 编号:x.supplierId, 型号:n.slice(0,34), 封装:fp.slice(0,44), 品牌:x.manufacturer||'未标' });
    }
  } catch(e){}
}
return { 'TF/SD 卡座候选': [...found.values()].slice(0,30), 数量: found.size };
