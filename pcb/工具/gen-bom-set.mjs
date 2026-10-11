#!/usr/bin/env node
/**
 * 生成《元件采购清单 · 按套计》
 * 一套 = 1 片板所需的全部元件。另列「建议购买」= 含备损。
 * 输出：元件采购清单_按套.md / 立创商城_配单.csv
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

// 位号 → [立创编号, 名称, 类别]
const FIX = {
  C17:['C19702','CL10A106KP8NNNC 10µF/10V','贴片电容'],
  C19:['C19702','CL10A106KP8NNNC 10µF/10V','贴片电容'],
  C18:['C14663','CC0603KRX7R9BB104 100nF/50V','贴片电容'],
  C20:['C14663','CC0603KRX7R9BB104 100nF/50V','贴片电容'],
  C21:['C14663','CC0603KRX7R9BB104 100nF/50V','贴片电容'],
  C22:['C14663','CC0603KRX7R9BB104 100nF/50V','贴片电容'],
  C23:['C14663','CC0603KRX7R9BB104 100nF/50V','贴片电容'],
  C24:['C14663','CC0603KRX7R9BB104 100nF/50V','贴片电容'],
  C26:['C14663','CC0603KRX7R9BB104 100nF/50V','贴片电容'],
  C27:['C14663','CC0603KRX7R9BB104 100nF/50V','贴片电容'],
  C25:['C19702','CL10A106KP8NNNC 10µF/10V','贴片电容'],
  SW5:['C9900017573','轻触按键 3×4 贴片','按键'],
  SW6:['C9900017573','轻触按键 3×4 贴片','按键'],
  R15:['C21190','0603WAF1001T5E 1kΩ','贴片电阻'],
  R16:['C21190','0603WAF1001T5E 1kΩ','贴片电阻'],
  R17:['C21190','0603WAF1001T5E 1kΩ','贴片电阻'],
  R18:['C25804','0603WAF1002T5E 10kΩ','贴片电阻'],
  R19:['C25804','0603WAF1002T5E 10kΩ','贴片电阻'],
  R20:['C25804','0603WAF1002T5E 10kΩ','贴片电阻'],
  D1:['C9900014849','LED0603 绿色','LED'],
  D2:['C9900014849','LED0603 绿色','LED'],
  D3:['C9900014849','LED0603 绿色','LED'],
  U4:['C181692','IP5306','芯片'],
  L1:['C98361','WPN4020H2R2MT 2.2µH','电感'],
  SW7:['C71845','轻触开关 6×6×5 直插','按键'],
  J4:['C9900013951','SP088 电池座','连接器'],
  EC1:['C55218995','HYCW03-2.8D-5P-S 旋转编码器','编码器'],
};
const CAT_DEFAULT = { U:'芯片', J:'连接器', SW:'按键', D:'LED', R:'贴片电阻', C:'贴片电容', FB:'磁珠', L:'电感', EC:'编码器', Q:'芯片' };

const groups = {};
for (const d of Object.keys(byDes)) {
  let lcsc, name, cat;
  if (FIX[d]) { [lcsc, name, cat] = FIX[d]; }
  else {
    const t = desMap[d];
    lcsc = (bom.parts[t] && bom.parts[t].lcsc) || '';
    name = (bom.parts[t] && bom.parts[t].name) || t;
    cat  = CAT_DEFAULT[d.replace(/[0-9]+$/, '')] || '其他';
  }
  const k = lcsc || name;
  groups[k] = groups[k] || { lcsc, name, cat, des: [], n: 0 };
  groups[k].des.push(d);
  groups[k].n++;
}

// 建议购买量
// 目标：够焊 TARGET_BOARDS 片，关键芯片再多留 1 个备件
// 0603 小封装按「100 个/包」买（一包能焊 7~10 片，本身就够）
const TARGET_BOARDS = 3;
const SPARE_CHIP = new Set([]); // 不额外买备件（芯片贵，需要时再补货）
const CHEAP_0603 = new Set(['C14663','C19702','C15849','C1621',   // 0603 电容
                            'C25804','C21190','C23186','C22775','C22935','C25803']); // 0603 电阻
const suggest = r => {
  if (CHEAP_0603.has(r.lcsc)) return { q: 100, note: '立创按 100 个/包卖，一包够焊 7~10 片' };
  const base = r.n * TARGET_BOARDS;
  if (SPARE_CHIP.has(r.lcsc)) return { q: base + 1, note: `够焊 ${TARGET_BOARDS} 片 + 1 个备件` };
  return { q: base, note: `够焊 ${TARGET_BOARDS} 片` };
};

const rows = Object.values(groups)
  .map(r => ({ ...r, ...suggest(r) }))
  .sort((a, b) => a.cat.localeCompare(b.cat) || b.n - a.n);

const md = [];
md.push('# 元件采购清单（按套计）', '',
  '**一套 = 1 片板所需的全部元件**，共 70 个 / 26 种。',
  '',
  '**去哪买**：立创商城 https://www.szlcsc.com （用「BOM 配单」上传 `立创商城_配单.csv`）', '',
  '| 类别 | 立创编号 | 型号 | **每套用量** | 建议购买 | 位号 |',
  '|---|---|---|---:|---:|---|');
for (const r of rows) {
  md.push(`| ${r.cat} | ${r.lcsc} | ${r.name} | **${r.n}** | ${r.q} | ${r.des.join(' ')} |`);
}
md.push('', '---', '',
  '## 🎯 立创商城配单结果处理（**下单前必看**）', '',
  '商城「BOM 智能配单」的结果：**完全匹配 22 / 待确认 3 / 无法匹配 1**。',
  '',
  '### ⚠️ 商城的推荐有 2 个是错的，别直接点「一键下单」', '',
  '| 行 | 原件 | 商城推荐 | 问题 |',
  '|---|---|---|---|',
  '| 9 | `C9900013951` SP088 电池座 | `LAIL-CR2032-SMT-B02-4AA` | ❌ **那是纽扣电池座！完全不对** |',
  '| 1 | `C71845` 6×6×5 直插按键 | `SH-6X6X5H-TP`（标 SMD） | ⚠️ 你要的是**直插**，它给的可能是贴片 |',
  '',
  '### ✅ 已核验的替代品（**封装逐字一致，焊盘完全兼容**）', '',
  '| 行 | 原件 | 推荐替代编号 | 型号 | 封装 |',
  '|---|---|---|---|---|',
  '| 8 | `C9900014993` FPC 14P | **`C577443`** ⭐ | AFC01-S14FCC-00 | 同型号！ |',
  '| 9 | `C9900013951` 电池座 | **`C2845379`** | HC-1.25-2PWT | `CONN-SMD_2P-P1.25-HC-1.25-2PWT` |',
  '| 9 | 备选 | `C2939411` | PH1250-WT-02P | 同上 |',
  '| 1 | `C71845` 6×6×5 直插 | **`C2733615`** | B3F-6000 (**OMRON**) | `KEY-TH_2P-L6.0-W6.0-P5.00` |',
  '| 1 | 备选 | `C2844505` | TS60HD50B25B201 | 同上 |',
  '| 1 | 备选 | `C22368614` | YTS1S0161BBT00 | 同上 |',
  '| 2 | `C9900017573` 3×4 贴片 | **`C465999`** | TS-1185-C-A-B-B | `SW-SMD_L4.0-W2.9-LS5.0` |',
  '| 2 | 备选 | `C557591` | TS342A2P-WZ | 同上 |',
  '| 2 | 备选 | `C2905176` | TD-1185SN-2.5H-250 | 同上 |',
  '',
  '### ④⑤ 两颗芯片（TLV75733 / IP5306）', '',
  '这两个商城的 BOM 工具认不出，但**在嘉立创库里都存在**，编号也对：',
  '',
  '| 位号 | 编号 | 型号 | 封装 | 厂商 |',
  '|---|---|---|---|---|',
  '| U3 | `C485517` | TLV75733PDBVR | `SOT-23-5_L2.9-W1.6-P0.95-LS2.8-BL` | TI |',
  '| U4 | `C181692` | IP5306 | `ESOP-8_L4.9-W3.9-P1.27-LS6.0-BL-EP` | 英集芯 |',
  '',
  '**直接把这俩编号粘到商城搜索框**，或者搜型号 `TLV75733PDBVR` / `IP5306`。',
  '',
  '> ⚠️ 这两颗**不要随便换替代品** —— SOT-23-5 / ESOP-8 封装的芯片有成千上万种，',
  '> 封装一样但功能完全不同。**必须买到同名芯片或确认过的 pin-to-pin 替代。**',
  '',
  '---', '',
  '## ⚠️ 商城 BOM 工具匹配不上的 5 个元件（原始分析）', '',
  '**这 5 个在嘉立创元件库里都存在，封装也全都对** —— 是立创商城的 BOM 工具认不出它们',
  '（`C99` 开头的是嘉立创自营编号，商城那边识别不了）。', '',
  '### 办法一：搜索框**直接粘贴编号**', '',
  '一个个粘 `C71845`、`C9900014849`、`C9900017573`、`C485517`、`C181692`，多数应该能搜到。', '',
  '### 办法二：搜不到就用下面的替代品', '',
  '| # | 原编号 | 型号 | 每套 | 要求的封装 |', '|---|---|---|---:|---|',
  '| ① | `C71845` | 轻触开关 6×6×5 直插 | 5 | `KEY-TH_2P-L6.0-W6.0-P5.00` |',
  '| ② | `C9900014849` | LED0603 绿色 | 3 | `LED0603-RD_GREEN` |',
  '| ③ | `C9900017573` | 轻触按键 3×4 贴片 | 2 | `SW-SMD_L4.0-W2.9-LS5.0` |',
  '| ④ | `C485517` | TLV75733PDBVR (TI) | 1 | `SOT-23-5` |',
  '| ⑤ | `C181692` | IP5306 (英集芯) | 1 | `ESOP-8` |', '',
  '#### ✅ 已核验可用的替代品', '',
  '**③ 轻触按键 3×4（封装完全一致，焊盘兼容）**', '',
  '| 替代编号 | 型号 |', '|---|---|',
  '| **`C5143624`** | HX TS342A2P WZ 250gf |',
  '| **`C2837315`** | 两脚小龟 3*4*2 |',
  '| **`C42431745`** | SH-TS-1185-2P-160gf |', '',
  '**② LED 0603 绿色（同封装）**', '',
  '| 替代编号 | 型号 |', '|---|---|',
  '| `C9900015925` | ChipCap 翠绿色高亮 0603 470nm |',
  '| `C9900025458` | S_LED0603 绿光 LED |',
  '| `C9900023193` | 0603 0.6mm 高贴片 LED GREEN |', '',
  '#### ⚠️ 换料铁律', '',
  '**封装必须完全一致，否则焊不上。** 换之前先核对上表的「要求的封装」。', '',
  '**④ TLV75733（U3）最要紧** —— 它是 3.3V 主电源，替代品必须满足：',
  '**SOT-23-5 封装 + 3.3V 输出 + 电流 ≥600mA**。',
  '拿不准的把候选型号发给我确认，换错了整板供电都有问题。');

fs.writeFileSync(new URL('元件采购清单_按套.md', ROOT), md.join('\n'));
let csv = '立创编号,型号,数量\n';
for (const r of rows) csv += `${r.lcsc},${r.name},${r.q}\n`;
fs.writeFileSync(new URL('立创商城_配单.csv', ROOT), '﻿' + csv);

// ── 商城匹配不上的，换成已核验的同封装替代品 ──
// 全部在嘉立创库里逐字核对过封装名，与板子焊盘完全兼容
const SWAP = {
  'C71845':      ['C22368614', 'YTS1S0161BBT00 轻触开关 6×6×5 直插'],
  'C9900017573': ['C465999',  'TS-1185-C-A-B-B 轻触按键 3×4 贴片'],
  'C9900014993': ['C577443',  'AFC01-S14FCC-00 FPC连接器 14P 0.5mm 下接'],
  'C9900013951': ['C2845379', 'HC-1.25-2PWT 电池座 1.25mm 2P 卧贴'],
  'C15849':      ['C6266891', 'TCC0603X5R105M250CT 1µF/25V 0603'],
  'C25804':      ['C4319854', 'AA0603FR-0710KL 10kΩ ±1% 0603'],
};
let csv2 = '立创编号,型号,数量\n';
const swapped = [];
for (const r of rows) {
  if (SWAP[r.lcsc]) {
    const [newLcsc, newName] = SWAP[r.lcsc];
    csv2 += `${newLcsc},${newName},${r.q}\n`;
    swapped.push(`${r.lcsc} → ${newLcsc}  (${newName})  ×${r.q}`);
  } else {
    csv2 += `${r.lcsc},${r.name},${r.q}\n`;
  }
}
fs.writeFileSync(new URL('立创商城_配单_已替换.csv', ROOT), '﻿' + csv2);
console.log('\n✅ 另生成 立创商城_配单_已替换.csv（4 个换成已核验替代品）');
for (const s of swapped) console.log('   ' + s);

console.log('✅ 元件采购清单_按套.md / 立创商城_配单.csv');
console.log(`   每套 ${Object.keys(byDes).length} 个元件 / ${rows.length} 种\n`);
console.log('类别'.padEnd(10) + '编号'.padEnd(15) + '型号'.padEnd(32) + '每套  建议');
for (const r of rows) console.log(r.cat.padEnd(10) + r.lcsc.padEnd(15) + String(r.name).slice(0, 30).padEnd(32) + String(r.n).padEnd(6) + r.q);
