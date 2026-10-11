const SYS = '0819f05c4eef4c71ace90d822a990e87';
const out = {};
for (const [lcsc, note] of [['C9900208495','EC09-6.5C'],['C9900019914','贴片1.27MM3路'],
                            ['C9900036245','EC115'],['C9900001788','EC1106S']]) {
  try {
    const r = await eda.lib_Device.search(lcsc, SYS, undefined, undefined, 3, 1) || [];
    const d = r.find(x=>x.supplierId===lcsc) || r[0];
    if (!d) { out[lcsc] = '未找到'; continue; }
    out[lcsc] = { 型号: d.manufacturerId, 封装: d.footprintName };
    // 看符号引脚名
    try {
      const sym = await eda.lib_Symbol.get(d.symbolUuid);
      if (sym) out[lcsc].符号 = JSON.stringify(sym).slice(0,400);
    } catch(e){}
  } catch(e){ out[lcsc] = 'ERR '+e.message.slice(0,50); }
}
return out;
