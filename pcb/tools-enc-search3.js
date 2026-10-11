const SYS = '0819f05c4eef4c71ace90d822a990e87';
const found = new Map();
// 中文+英文关键词广撒网
for (const kw of ['旋转编码器','编码器','rotary encoder','encoder switch','增量编码器',
                  '编码器带按压','贴片编码器','编码开关 贴片','旋钮开关','编码器 5PIN',
                  'EC11','EC12','EC16','RE111','PEC11','旋转 脉冲 开关']) {
  try {
    const r = await eda.lib_Device.search(kw, SYS, undefined, undefined, 80, 1) || [];
    for (const x of r) {
      const fp = x.footprintName || '';
      const n = (x.manufacturerId || '') + '|' + (x.name || '');
      // 只留开关类封装的
      if (!/^SW-|^SENSOR|^SWITCH/i.test(fp)) continue;
      if (!/编码器|encoder|Encoder|EC1|RE1|旋钮|rotate/i.test(n + fp)) continue;
      found.set(x.supplierId, { 编号:x.supplierId, 型号:(x.manufacturerId||x.name||'').slice(0,36),
                                封装:fp.slice(0,48), 品牌:x.manufacturer||'未标' });
    }
  } catch(e){}
}
const list = [...found.values()];
return { 总数: list.length, 候选: list.slice(0,35) };
