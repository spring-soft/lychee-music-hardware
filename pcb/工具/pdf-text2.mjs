#!/usr/bin/env node
/** 解压 PDF 流，按 GBK 解码后抽文本 */
import fs from 'node:fs';
import zlib from 'node:zlib';
const file = process.argv[2];
const buf = fs.readFileSync(file);
let i = 0; const parts = [];
while (true) {
  const s = buf.indexOf('stream', i); if (s < 0) break;
  let st = s + 6;
  if (buf[st] === 0x0d) st++;
  if (buf[st] === 0x0a) st++;
  const e = buf.indexOf('endstream', st); if (e < 0) break;
  try {
    const raw = zlib.inflateSync(buf.subarray(st, e));
    // 抽括号字符串，保留原始字节
    const t = raw.toString('latin1');
    const re = /\(((?:\.|[^()\])*)\)/g;
    let m;
    while ((m = re.exec(t)) !== null) {
      const bytes = Buffer.from(m[1].replace(/\([()\])/g, '$1'), 'latin1');
      parts.push(bytes);
    }
  } catch (err) {}
  i = e + 9;
}
const all = Buffer.concat(parts);
let txt;
try { txt = new TextDecoder('gbk').decode(all); } catch (e) { txt = all.toString('latin1'); }
console.log('长度:', txt.length);
console.log('---');
// 打印含中文/关键词的片段
const lines = txt.split(/[|\n\r]+/).map(s => s.trim()).filter(s => s.length > 2);
const seen = new Set();
for (const L of lines) {
  if (/[一-龥]|pulse|click|shaft|Shaft|Rotary|encoder|HYCW|SPCC|SUS|PPA|mm/.test(L) && !seen.has(L)) {
    seen.add(L);
    console.log(L.slice(0, 120));
  }
  if (seen.size > 60) break;
}
