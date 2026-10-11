const out = {};
const LIB = '0c06a53294c71aa90a5cca261ab18fa7baf6b7ca09964d736e3cd2133c552036';
const SYM = '98983192c460db55';
let src = null;
for (const cand of [SYM, LIB+'|'+SYM, {libraryUuid:LIB, uuid:SYM}]) {
  try { const f = await eda.sys_FileManager.getSymbolFileBySymbolUuid(cand);
        if (f) { src = await f.text(); out.用了 = typeof cand === 'object' ? 'object' : String(cand).slice(0,60); break; } }
  catch(e) { out['err_'+(typeof cand==='object'?'obj':String(cand).slice(0,20))] = e.message.slice(0,60); }
}
if (!src) return out;
out.长度 = src.length;
// 提取引脚：形如 "P1" ... "IO4" 之类的 name 字段
const names = [...src.matchAll(/"name"\s*:\s*"([^"]{1,24})"/g)].map(m=>m[1]);
out.候选引脚名 = [...new Set(names)].filter(n=>/^(IO|GPIO|GND|3V3|EN|EPAD|NC)/i.test(n)).slice(0,60);
out.源码片段 = src.slice(0, 500);
return out;
