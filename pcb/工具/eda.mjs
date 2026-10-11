#!/usr/bin/env node
/**
 * EasyEDA Bridge 调用助手
 *
 * 用法：
 *   node eda.mjs <code.js>     从文件读 JS 代码并执行
 *   node eda.mjs -             从 stdin 读 JS 代码并执行
 *
 * 代码在 EDA 内以 `new AsyncFunction('eda', code)` 执行，
 * 必须用 `return` 把结果送回来。
 */

const ENDPOINT = process.env.EDA_BRIDGE || 'http://127.0.0.1:49620/execute';
const TIMEOUT_MS = Number(process.env.EDA_TIMEOUT || 120000);

const fs = await import('node:fs');

async function readCode() {
  const arg = process.argv[2];
  if (!arg || arg === '-') {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString('utf8');
  }
  return fs.readFileSync(arg, 'utf8');
}

const code = (await readCode()).trim();
if (!code) {
  console.error('错误：没有读到代码。用法: node eda.mjs <code.js> | node eda.mjs -');
  process.exit(2);
}

const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

try {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    signal: ac.signal,
  });
  const payload = await res.json();

  if (payload.success === false) {
    console.error('❌ EDA 执行失败:');
    console.error(payload.error || JSON.stringify(payload));
    process.exit(1);
  }

  const r = payload.result;
  console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2));
} catch (e) {
  console.error(`❌ 请求失败: ${e.message}`);
  process.exit(1);
} finally {
  clearTimeout(timer);
}
