#!/usr/bin/env node
/** 解压 PDF 流，按 GBK 解码抽文本。用法: node pdf-gbk.mjs <pdf> [关键词正则] */
import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
const filter = process.argv[3] ? new RegExp(process.argv[3]) : null;
const buf = fs.readFileSync(file);
let i = 0;
const parts = [];
while (true) {
  const s = buf.indexOf('stream', i);
  if (s < 0) break;
  let st = s + 6;
  if (buf[st] === 0x0d) st++;
  if (buf[st] === 0x0a) st++;
  const e = buf.indexOf('endstream', st);
  if (e < 0) break;
  try {
    const raw = zlib.inflateSync(buf.subarray(st, e));
    const t = raw.toString('latin1');
    const re = /\(([^()]*)\)/g;
    let m;
    while ((m = re.exec(t)) !== null) {
      parts.push(Buffer.from(m[1], 'latin1'));
    }
  } catch (err) { /* 非 Flate 流 */ }
  i = e + 9;
}
const all = Buffer.concat(parts);
let txt;
try { txt = new TextDecoder('gbk').decode(all); } catch (e) { txt = all.toString('latin1'); }

console.log('总长度:', txt.length);
console.log('====================');
const segs = txt.split(/[|\r\n]+/).map(s => s.trim()).filter(s => s.length > 1);
const seen = new Set();
let n = 0;
for (const L of segs) {
  if (filter && !filter.test(L)) continue;
  if (seen.has(L)) continue;
  seen.add(L);
  console.log(L.slice(0, 140));
  if (++n > 80) break;
}
