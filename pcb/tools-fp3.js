const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const run = async (label, kw, fpRe, n=40) => {
  try {
    const r = await eda.lib_Device.search(kw, sys, undefined, undefined, n, 1) || [];
    const list = r.filter(x => fpRe.test(x.footprintName || ''))
      .map(x => ({ 型号: x.manufacturerId || x.name, 编号: x.supplierId, 封装: x.footprintName }));
    out[label] = (list.length ? list : '（无匹配）').slice(0, 8);
  } catch(e) { out[label] = 'ERR ' + e.message.slice(0,50); }
};
await run('❸电池座 同封装', 'CONN-SMD_2P-P1.25-HC-1.25-2PWT', /CONN-SMD_2P-P1\.25-HC-1\.25-2PWT/);
await run('❸b电池座 1.25卧贴', '1.25mm 2P 卧贴 座', /CONN-SMD_2P-P1\.25/);
await run('❷FPC 原封装名', 'AFC01-S14FCC-00', /AFC01-S14FCC-00/);
await run('❹3×4按键 同封装', 'SW-SMD_L4.0-W2.9-LS5.0', /SW-SMD_L4\.0-W2\.9-LS5\.0/);
await run('❺TLV75733 同封装', 'TLV75733 SOT-23-5', /SOT-23-5/);
await run('❺b IP5306 同封装', 'IP5306 ESOP-8', /ESOP-8/);
return out;
