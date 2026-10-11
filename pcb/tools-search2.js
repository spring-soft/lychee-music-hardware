const sys = await eda.lib_LibrariesList.getSystemLibraryUuid();
const r = await eda.lib_Device.search('轻触开关 6*6*5', sys, undefined, undefined, 3, 1) || [];
const out = { 字段: r[0] ? Object.keys(r[0]) : null, 样例: r[0] ? JSON.parse(JSON.stringify(r[0])) : null };
return out;
