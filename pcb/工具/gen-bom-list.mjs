#!/usr/bin/env node
/**
 * 生成《元件采购清单》
 * 数据来源：工具/数据/pads.raw.json（每片板的实际元件）+ 设计数据/bom.json（位号→型号）
 * 输出：元件采购清单.md / 元件采购清单.csv
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);
const ROOT = new URL('../', HERE('./'));

const pads = JSON.parse(fs.readFileSync(new URL('工具/数据/pads.raw.json', ROOT), 'utf8')).rows;
const bom  = JSON.parse(fs.readFileSync(new URL('设计数据/bom.json', ROOT), 'utf8'));

const byDes = {};
for (const r of pads) byDes[r.d] = true;
const desMap = {};
for (const [k, v] of Object.entries(bom.designators || {})) desMap[k] = v;

// 后加的元件 / 改型的元件（不在 bom.json 的位号映射里）
const FIX = {
  C17:['C19702','CL10A106KP8NNNC 10µF/10V'], C19:['C19702','CL10A106KP8NNNC 10µF/10V'],
  C18:['C14663','CC0603KRX7R9BB104 100nF/50V'], C20:['C14663','CC0603KRX7R9BB104 100nF/50V'],
  C21:['C14663','CC0603KRX7R9BB104 100nF/50V'], C22:['C14663','CC0603KRX7R9BB104 100nF/50V'],
  C23:['C14663','CC0603KRX7R9BB104 100nF/50V'], C24:['C14663','CC0603KRX7R9BB104 100nF/50V'],
  C26:['C14663','CC0603KRX7R9BB104 100nF/50V'], C27:['C14663','CC0603KRX7R9BB104 100nF/50V'],
  C25:['C19702','CL10A106KP8NNNC 10µF/10V'],
  SW5:['C9900017573','轻触按键 3×4 贴片'], SW6:['C9900017573','轻触按键 3×4 贴片'],
  R15:['C21190','0603WAF1001T5E 1kΩ'], R16:['C21190','0603WAF1001T5E 1kΩ'], R17:['C21190','0603WAF1001T5E 1kΩ'],
  R18:['C25804','0603WAF1002T5E 10kΩ'], R19:['C25804','0603WAF1002T5E 10kΩ'], R20:['C25804','0603WAF1002T5E 10kΩ'],
  D1:['C9900014849','LED0603 绿色'], D2:['C9900014849','LED0603 绿色'], D3:['C9900014849','LED0603 绿色'],
  U4:['C181692','IP5306'], L1:['C98361','WPN4020H2R2MT 2.2µH'],
  SW7:['C71845','轻触开关 6×6×5 直插'], J4:['C9900013951','SP088 电池座'],
  EC1:['C55218995','HYCW03-2.8D-5P-S 旋转编码器'],
};

const groups = {};
for (const d of Object.keys(byDes)) {
  let lcsc, name;
  if (FIX[d]) { [lcsc, name] = FIX[d]; }
  else {
    const t = desMap[d];
    lcsc = (bom.parts[t] && bom.parts[t].lcsc) || '';
    name = (bom.parts[t] && bom.parts[t].name) || t;
  }
  const k = lcsc || name;
  groups[k] = groups[k] || { lcsc, name, des: [], n: 0 };
  groups[k].des.push(d);
  groups[k].n++;
}

const rows = Object.values(groups).sort((a, b) => b.n - a.n || a.lcsc.localeCompare(b.lcsc));
const total = Object.keys(byDes).length;
const P = o => String(o).padEnd(16);
const P2 = o => String(o).padEnd(30);

const md = [];
md.push('# 元件采购清单', '',
  '**去哪买**：**立创商城** https://www.szlcsc.com',
  '> BOM 里的编号全部是立创编号（`C` 开头），可以直接用它的「**BOM 配单**」功能：把 `元件采购清单.csv` 上传进去，自动填购物车。', '',
  `**每片板 ${total} 个元件，共 ${rows.length} 种**`, '',
  '| # | 立创编号 | 型号 | 每片用量 | 建议买 | 位号 |',
  '|---:|---|---|---:|---:|---|');
rows.forEach((r, i) => {
  md.push(`| ${i + 1} | ${r.lcsc} | ${r.name} | ${r.n} | **${r.n * 3}** | ${r.des.join(' ')} |`);
});

md.push('', '---', '', '## 采购建议', '',
  '| 元件 | 建议 |', '|---|---|',
  '| **ESP32-S3-WROOM-1-N16R8** | 买 **3 个**（¥30 左右一个，焊坏概率不低）|',
  '| **ES8388** | 买 **3 个**（QFN 封装难焊，容易焊坏）|',
  '| **0603 电阻/电容** | 立创一般 **100 个一包起卖**，直接买 100 个（才几块钱）|',
  '| **其他小件** | 按 3 片的量买，多几个无所谓 |',
  '| **电池 / 屏幕 / 耳机** | 不在本清单，另外买 |', '',
  '---', '', '## 下单流程', '',
  '1. 打开 https://www.szlcsc.com 注册/登录',
  '2. 找到「**BOM 配单**」（或「批量配单」）',
  '3. 上传 `元件采购清单.csv`',
  '4. 核对匹配结果（可能有几个件需要手动确认）',
  '5. 加购物车、结算', '',
  '> 立创商城通常 **满 ¥29 包邮**，一次买齐比较划算。',
  '> 元件从深圳发货，一般 2-3 天到。');

fs.writeFileSync(new URL('元件采购清单.md', ROOT), md.join('\n'));
let csv = '立创编号,型号,每片用量,建议购买,位号\n';
for (const r of rows) csv += `${r.lcsc},${r.name},${r.n},${r.n * 3},"${r.des.join(' ')}"\n`;
fs.writeFileSync(new URL('元件采购清单.csv', ROOT), '﻿' + csv);

console.log('✅ 生成 元件采购清单.md / 元件采购清单.csv');
console.log(`   ${total} 个元件 / ${rows.length} 种`);
const miss = rows.filter(r => !r.lcsc);
console.log('   缺立创编号:', miss.length ? miss.map(r => r.name).join(', ') : '无');
console.log('\n前 5 行预览:');
for (const r of rows.slice(0, 5)) console.log('  ' + P(r.lcsc) + P2(r.name) + '×' + r.n + '  →买 ' + r.n * 3);
