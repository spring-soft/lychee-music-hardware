#!/usr/bin/env node
/** 把规格书网表（netlist.json）与实际生成的网络表（netlist_protel.txt）逐条比对 */
import { readFileSync } from 'node:fs';

const expect = JSON.parse(readFileSync('netlist.json', 'utf8')).nets;
const raw = readFileSync('netlist_protel.txt', 'utf8');

// 解析 Protel 网络表
const actual = {};
let cur = null;
for (const line of raw.split(/\r?\n/)) {
  const s = line.trim();
  if (s === '(') { cur = { net: null, pins: [] }; continue; }
  if (s === ')') { if (cur && cur.net !== null) actual[cur.net] = cur.pins; cur = null; continue; }
  if (!cur) continue;
  if (cur.net === null) { cur.net = s; continue; }
  cur.pins.push(s.split(' ')[0]);
}

const norm = arr => [...new Set(arr)].sort();
const problems = [];
let checkedNets = 0, checkedPins = 0;

for (const [net, def] of Object.entries(expect)) {
  const want = def.pins.map(([d, p]) => `${d}-${p}`);
  if (!want.length) continue;                       // 只有 J2 的网络跳过
  checkedNets++;
  const got = actual[net];
  if (!got) { problems.push(`❌ 网络 ${net} 缺失`); continue; }
  const w = norm(want), g = norm(got);
  const miss = w.filter(x => !g.includes(x));
  const extra = g.filter(x => !w.includes(x));
  if (miss.length) problems.push(`❌ ${net} 缺少引脚: ${miss.join(', ')}`);
  if (extra.length) problems.push(`⚠️  ${net} 多出引脚: ${extra.join(', ')}`);
  checkedPins += w.length;
}

// 反向：实际存在但规格书未定义的网络
const expectNames = new Set(Object.keys(expect));
for (const net of Object.keys(actual)) {
  if (!expectNames.has(net)) problems.push(`⚠️  多出未定义网络: ${net}  (${actual[net].join(', ')})`);
}

console.log(`比对网络数: ${checkedNets}   比对引脚数: ${checkedPins}`);
console.log(`实际网络总数: ${Object.keys(actual).length}`);
console.log(problems.length ? '\n发现问题:\n' + problems.join('\n') : '\n✅ 全部一致，无差异');
