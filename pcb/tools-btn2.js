const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const out = {};
const KEY = /^KEY-TH_2P-L6\.0-W6\.0-P5\.00$/;
const r = await eda.lib_Device.search('KEY-TH_2P-L6.0-W6.0-P5.00', sys, undefined, undefined, 80, 1) || [];
out['封装完全一致的按键'] = r.filter(x => KEY.test(x.footprintName||''))
  .map(x => ({ 编号: x.supplierId, 型号: (x.manufacturerId||x.name||'').slice(0,32), 品牌: x.manufacturer||'未标' }));
// 放宽：只要是 6x6 直插
out['放宽：6×6 直插按键'] = r.filter(x => /KEY-TH.*L6\.0/.test(x.footprintName||''))
  .map(x => x.supplierId + ' ' + (x.footprintName||'') + ' | ' + (x.manufacturer||'未标')).slice(0,15);
return out;
