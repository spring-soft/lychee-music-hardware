const libs = await eda.lib_LibrariesList.getAllLibraries?.() || [];
out = {};
const sys = await eda.lib_LibrariesList.getSystemLibraryUuid?.();
out.系统库 = sys;
const QUERIES = ['C71845','C9900014849','C9900017573','C485517','C181692',
                 '轻触开关 6*6*5','0603 绿色 LED','3*4 轻触开关','TLV75733','IP5306'];
out.结果 = {};
for (const q of QUERIES) {
  try {
    const r = await eda.lib_Device.search(q, sys, undefined, undefined, 4, 1);
    out.结果[q] = (r||[]).map(x => ({
      name: x.name, lcsc: x.lcscId || x.supplierId, mfr: x.manufacturer,
      fp: x.footprint && (x.footprint.name || x.footprint),
      stock: x.stock ?? x.stockCount,
    }));
  } catch(e) { out.结果[q] = 'ERR ' + e.message.slice(0,60); }
}
return out;
