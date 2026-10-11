const SYS = '0819f05c4eef4c71ace90d822a990e87';
const found = new Map();
for (const kw of ['旋转编码器 贴片','贴片 编码器 带按压','SMD 旋转编码器','编码器 SMD 开关',
                  '贴片编码器 实心轴','编码器 贴片 5脚','旋转 编码器 SMD','编码器 贴片 带按键',
                  'EC11 贴片','EC12 贴片','贴片 编码开关','rotary encoder SMD']) {
  try {
    const r = await eda.lib_Device.search(kw, SYS, undefined, undefined, 80, 1) || [];
    for (const x of r) {
      const fp = x.footprintName || '';
      if (!/^SW-SMD/i.test(fp)) continue;          // 只要贴片
      const n = (x.manufacturerId||'') + '|' + (x.name||'');
      if (!/编码器|encoder|Encoder|rotary|旋钮|EC\d/i.test(n + fp)) continue;
      found.set(x.supplierId, { 编号:x.supplierId, 型号:(x.manufacturerId||x.name||'').slice(0,36),
                                封装:fp.slice(0,50), 品牌:x.manufacturer||'未标' });
    }
  } catch(e){}
}
const list = [...found.values()];
return { 贴片编码器总数: list.length, 候选: list };
