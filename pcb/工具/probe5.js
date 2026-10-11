const out = {};
const LIB = '0c06a53294c71aa90a5cca261ab18fa7baf6b7ca09964d736e3cd2133c552036';
try {
  const res = await eda.lib_Footprint.search('HYCW03', LIB, undefined, 5, 1);
  out.搜索 = (res || []).map(r => ({ name: r.name, uuid: r.uuid, lib: r.libraryUuid }));
} catch (e) { out.搜索 = 'ERR ' + String(e && e.message || JSON.stringify(e)).slice(0, 200); }
try {
  const fp = await eda.lib_Footprint.get('7d986a8a5a6fdbcd', LIB);
  out.get返回 = fp ? { keys: Object.keys(fp), val: JSON.parse(JSON.stringify(fp)) } : null;
} catch (e) { out.get错误 = String(e && e.message || JSON.stringify(e)).slice(0, 300); }
try {
  const src = await eda.lib_Footprint.getDocumentSource ? await eda.lib_Footprint.getDocumentSource('7d986a8a5a6fdbcd') : 'no api';
  out.文档源 = typeof src === 'string' ? src.slice(0, 1500) : src;
} catch (e) { out.文档源错误 = String(e && e.message || JSON.stringify(e)).slice(0, 200); }
return out;
