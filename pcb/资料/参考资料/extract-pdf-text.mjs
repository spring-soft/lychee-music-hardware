#!/usr/bin/env node
/** 解压 PDF 的所有 FlateDecode 流，抽出 Tj/TJ 字符串（跳过字体编码映射缺失的问题） */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const buf = readFileSync('PJ-320A_datasheet.pdf');

// 找出所有 "stream ... endstream" 段
const chunks = [];
let i = 0;
while (true) {
  const s = buf.indexOf('stream', i);
  if (s < 0) break;
  let start = s + 6;
  if (buf[start] === 0x0d) start++;
  if (buf[start] === 0x0a) start++;
  const e = buf.indexOf('endstream', start);
  if (e < 0) break;
  chunks.push({ start, raw: buf.subarray(start, e) });
  i = e + 9;
}

const out = [];
chunks.forEach((c, n) => {
  let txt = null;
  try { txt = inflateSync(c.raw); } catch { /* 不是 flate 流 */ }
  if (!txt) return;

  const s = txt.toString('latin1');
  // 抽出 (..) 或 <..> 形式的字符串，以及 Tj/TJ 运算符附近的内容
  const strings = [];
  const re = /\((?:\\.|[^\\()])*\)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const v = m[0].slice(1, -1).replace(/\\([()\\])/g, '$1');
    if (v.trim()) strings.push(v);
  }
  // 十六进制字符串 <...>
  const rex = /<([0-9A-Fa-f\s]{4,})>/g;
  while ((m = rex.exec(s)) !== null) {
    const hex = m[1].replace(/\s/g, '');
    let dec = '';
    for (let k = 0; k + 3 < hex.length + 1 && k + 4 <= hex.length; k += 4) {
      const code = parseInt(hex.substr(k, 4), 16);
      if (code >= 32 && code < 127) dec += String.fromCharCode(code);
    }
    if (dec.trim()) strings.push('[hex]' + dec);
  }

  if (strings.length) out.push({ streamIndex: n, byteLen: txt.length, strings });
});

console.log(`共解压出 ${out.length} 个含文本的流\n`);
for (const o of out) {
  console.log(`──────── 流 #${o.streamIndex}（解压后 ${o.byteLen} 字节，${o.strings.length} 段文本）`);
  console.log(o.strings.join(' | ').slice(0, 3000));
  console.log();
}
