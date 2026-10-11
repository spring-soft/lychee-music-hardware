const SYS = '0819f05c4eef4c71ace90d822a990e87';
const found = new Map();
for (const kw of ['旋转编码器 贴片 带按压','贴片 编码器 实心轴','旋转编码器 SMD 按压',
                  '编码器 贴片 D型轴','EC11 贴片 编码器','编码器 贴片 带开关 轴',
                  'rotary encoder SMD switch','编码器 5脚 贴片']) {
  try {
    const r = await eda.lib_Device.search(kw, SYS, undefined, undefined, 60, 1) || [];
    for (const x of r) {
      const n = (x.manufacturerId || '') + ' ' + (x.name || '');
      const fp = x.footprintName || '';
      if (!/编码器|encoder|Encoder|EC\d|RE\d|HYCW|旋钮/i.test(n)) continue;
      found.set(x.supplierId, { 编号:x.supplierId, 型号:(x.manufacturerId||x.name||'').slice(0,32),
                                封装:fp.slice(0,44), 品牌:x.manufacturer||'未标' });
    }
  } catch(e){}
}
const list = [...found.values()];
return { 候选数: list.length, 候选: list.slice(0,40) };
