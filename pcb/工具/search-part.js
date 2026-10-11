const kw = process.argv[2] || '220uF 3528';
const out = { 关键词: kw, 结果: [] };
let libUuid = null;
try { libUuid = await eda.lib_LibrariesList.getSystemLibraryUuid(); } catch (e) {}
out.库 = libUuid;
try {
  const res = await eda.lib_Device.search(kw, libUuid, undefined, 25, 1) || [];
  for (const r of res) {
    out.结果.push({
      名称: r.name || r.deviceName,
      型号: r.manufacturerPart || (r.otherProperty && r.otherProperty['Manufacturer Part']),
      品牌: r.manufacturer,
      封装: r.footprintName || (r.footprint && r.footprint.name) || (r.otherProperty && r.otherProperty['Footprint']),
      立创: r.lcscId || (r.otherProperty && r.otherProperty['LCSC Part']),
      库存: r.stock ?? (r.otherProperty && r.otherProperty['Stock']),
    });
  }
} catch (e) { out.err = String(e && e.message || e).slice(0, 200); }
return out;
