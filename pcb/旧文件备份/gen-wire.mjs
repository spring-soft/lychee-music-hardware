#!/usr/bin/env node
/**
 * 接线生成器
 *
 * 把 netlist.json 扁平化成 (网络, 位号, 引脚) 条目，按固定批量切分，
 * 输出一段可在 EDA 内执行的 JS 代码。
 *
 * 用法：
 *   node gen-wire.mjs --count              打印总条目数与批次数
 *   node gen-wire.mjs <批次号> [批大小]     输出该批次的 JS 代码
 *
 * 设计要点：
 * - 每条目 = 在某个引脚坐标上放一个「网络端口」（信号）或「电源/地符号」（电源、地）
 * - 坐标不靠手算，一律回读元件的真实引脚坐标
 * - 每批只取本批需要的元件，避免拉取全部 49 个元件的引脚拖慢执行
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const nl = JSON.parse(readFileSync(join(HERE, 'netlist.json'), 'utf8'));

// 扁平化：跳过 J2（耳机座引脚映射待用户确认）
const items = [];
for (const [netName, def] of Object.entries(nl.nets)) {
  for (const [des, pin] of def.pins) {
    if (des === 'J2') continue;                 // 耳机座待定
    items.push({ net: netName, type: def.type, des, pin });
  }
}

const BATCH_DEFAULT = 25;
const totalBatches = Math.ceil(items.length / BATCH_DEFAULT);

if (process.argv[2] === '--count') {
  console.log(JSON.stringify({ items: items.length, batches: totalBatches, batchSize: BATCH_DEFAULT }, null, 2));
  process.exit(0);
}

const batchIdx = Number(process.argv[2] ?? 0);
const batchSize = Number(process.argv[3] ?? BATCH_DEFAULT);
const slice = items.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);

if (!slice.length) { console.error(`批次 ${batchIdx} 为空`); process.exit(1); }

// 本批需要的位号（去重）
const desNeeded = [...new Set(slice.map(i => i.des))];

const code = `
const BATCH = ${JSON.stringify(slice)};
const DES = ${JSON.stringify(desNeeded)};

const comps = await eda.sch_PrimitiveComponent.getAll();
const idByDes = {};
for (const c of comps) {
  if (c.componentType === 'part' && c.designator) idByDes[c.designator] = c.primitiveId;
}

const pinMap = {};
const missingComp = [];
for (const des of DES) {
  const id = idByDes[des];
  if (!id) { missingComp.push(des); continue; }
  const pins = await eda.sch_PrimitiveComponent.getAllPinsByPrimitiveId(id);
  const m = {};
  for (const p of (pins || [])) {
    if (p.primitiveType === 'ComponentPin') m[p.pinNumber] = { x: p.x, y: p.y };
  }
  pinMap[des] = m;
}

const ok = [], fail = [];
for (const it of BATCH) {
  const pos = pinMap[it.des] && pinMap[it.des][it.pin];
  if (!pos) { fail.push(it.net + ' ' + it.des + '.' + it.pin + ' -> 引脚未找到'); continue; }
  let r = null;
  if (it.type === 'Power')       r = await eda.sch_PrimitiveComponent.createNetFlag('Power',  it.net, pos.x, pos.y, 0, false);
  else if (it.type === 'Ground') r = await eda.sch_PrimitiveComponent.createNetFlag('Ground', it.net, pos.x, pos.y, 0, false);
  else                           r = await eda.sch_PrimitiveComponent.createNetPort('BI', it.net, pos.x, pos.y, 0, false);
  if (r) ok.push(it.net + ' ' + it.des + '.' + it.pin);
  else fail.push(it.net + ' ' + it.des + '.' + it.pin + ' -> create 返回空');
  await new Promise(r2 => setTimeout(r2, 60));
}
return { batch: ${batchIdx}, placed: ok.length, failed: fail, missingComponents: missingComp };
`.trim();

process.stdout.write(code);
