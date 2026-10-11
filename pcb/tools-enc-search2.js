const SYS = '0819f05c4eef4c71ace90d822a990e87';
const found = new Map();
for (const kw of ['HYCW','HYCW03','华宇创 编码器','EC11','EC12','EC10','EC05',
                  '旋转编码器','编码器 带开关','编码器 轴','RE11','SKQU','旋钮编码器',
                  '编码开关','增量式编码器','编码器 12脉冲']) {
  try {
    const r = await eda.lib_Device.search(kw, SYS, undefined, undefined, 80, 1) || [];
    for (const x of r) {
      const n = (x.manufacturerId || '') + '|' + (x.name || '');
      const fp = x.footprintName || '';
      if (!/编码器|encoder|Encoder|HYCW|EC\d|RE\d|旋钮|EC11/i.test(n + fp)) continue;
      found.set(x.supplierId, { 编号:x.supplierId, 型号:(x.manufacturerId||x.name||'').slice(0,34),
                                封装:fp.slice(0,46), 品牌:x.manufacturer||'未标' });
    }
  } catch(e){}
}
const list = [...found.values()].sort((a,b)=>a.封装.localeCompare(b.封装));
return { 总数: list.length, 候选: list.slice(0,45) };
