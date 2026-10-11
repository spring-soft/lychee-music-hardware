#!/usr/bin/env node
/** 解压 PDF 的 FlateDecode 流，抽出文本（用法: node pdf-text.mjs <pdf>） */
import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
const buf = fs.readFileSync(file);
let i = 0;
const out = [];
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
    // 抽 Tj / TJ 里的字符串
    const strs = [];
    const re = /\(((?:\\.|[^()\\])*)\)/g;
    let m;
    while ((m = re.exec(t)) !== null) strs.push(m[1]);
    if (strs.length) out.push(strs.join(' '));
  } catch (err) { /* 不是 Flate 流，跳过 */ }
  i = e + 9;
}
const all = out.join(' | ').replace(/\s+/g, ' ');
console.log('提取长度:', all.length);
console.log('---');
console.log(all.slice(0, 3000));
