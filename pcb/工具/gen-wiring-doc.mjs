#!/usr/bin/env node
/**
 * 生成《接线表与引脚定义》文档
 * 数据来源：pads.raw.json（EDA 导出的 PCB 实际焊盘网络）+ U1 原理图符号引脚名
 */
import fs from 'node:fs';
const HERE = p => new URL(p, import.meta.url);

const pads = JSON.parse(fs.readFileSync(HERE('./数据/pads.raw.json'), 'utf8')).rows;

// U1 引脚号 → GPIO 名（来自原理图符号，权威）
const U1_PIN = {
  1:'GND', 2:'3V3', 3:'EN', 4:'IO4', 5:'IO5', 6:'IO6', 7:'IO7', 8:'IO15',
  9:'IO16', 10:'IO17', 11:'IO18', 12:'IO8', 13:'IO19', 14:'IO20', 15:'IO3',
  16:'IO46', 17:'IO9', 18:'IO10', 19:'IO11', 20:'IO12', 21:'IO13', 22:'IO14',
  23:'IO21', 24:'IO47', 25:'IO48', 26:'IO45', 27:'IO0', 28:'IO35', 29:'IO36',
  30:'IO37', 31:'IO38', 32:'IO39', 33:'IO40', 34:'IO41', 35:'IO42',
  36:'RXD0(IO44)', 37:'TXD0(IO43)', 38:'IO2', 39:'IO1', 40:'GND', 41:'GND/EP',
};

// 每个已用引脚的功能说明
const FUNC = {
  1:'地', 2:'**3.3V 供电**（VCC，经内层电源平面）', 3:'**RESET_N** 复位（接 R4/C2/SW5）',
  4:'LCD_SCLK 屏 SPI 时钟', 5:'LCD_MOSI 屏 SPI 数据', 6:'LCD_RST 屏复位', 7:'LCD_DC 屏数据/命令',
  8:'LCD_CS 屏片选', 9:'BL_DRV 背光驱动（经 R13→Q1）', 10:'KEY_K4 按键4', 11:'KEY_K3 按键3',
  12:'KEY_K2 按键2', 13:'**USB_DN**（Type-C D−）', 14:'**USB_DP**（Type-C D+）',
  15:'悬空', 16:'悬空',
  17:'ENC_A 旋转编码器 A 相', 18:'ENC_B 旋转编码器 B 相', 19:'ENC_SW 编码器按压',
  20:'悬空', 21:'悬空', 22:'悬空', 23:'悬空', 24:'悬空', 25:'悬空', 26:'悬空',
  27:'**BOOT_N**（接 R5 / SW6，下载模式）',
  28:'⚠️ **禁止接任何东西**（N16R8 的 Octal PSRAM 占用）',
  29:'⚠️ **禁止接任何东西**（同上）', 30:'⚠️ **禁止接任何东西**（同上）',
  31:'KEY_K1 按键1', 32:'I2S_LRCK 左右声道时钟', 33:'I2S_DOUT 音频数据输出',
  34:'I2S_BCLK I2S 位时钟', 35:'I2S_MCLK I2S 主时钟',
  36:'悬空（默认串口 RX）', 37:'悬空（默认串口 TX）',
  38:'**I2C_SCL**（接 ES8388 + R11 上拉）', 39:'**I2C_SDA**（接 ES8388 + R10 上拉）',
  40:'地', 41:'地（中心散热焊盘）',
};

// U1 引脚 → 网络
const u1net = {};
for (const r of pads) if (r.d === 'U1') u1net[parseInt(r.n)] = r.net || '';

// 网络 → 全部连接点
const netPads = {};
for (const r of pads) {
  if (!r.net) continue;
  const set = (netPads[r.net] = netPads[r.net] || new Set());
  set.add(r.d + '.' + r.n);          // U1.41（中心散热焊盘）在 EDA 里是 9 个焊盘，同号去重
}
for (const k of Object.keys(netPads)) netPads[k] = [...netPads[k]];
for (const k of Object.keys(netPads)) netPads[k].sort((a, b) => {
  const [da, pa] = a.split('.'), [db, pb] = b.split('.');
  const na = parseInt(da.replace(/\D/g, '')), nb = parseInt(db.replace(/\D/g, ''));
  if (da.replace(/[0-9]/g, '') !== db.replace(/[0-9]/g, '')) return da.localeCompare(db);
  return na - nb || String(pa).localeCompare(String(pb));
});

const NET_DESC = {
  'GND':'地','VCC':'3.3V 数字电源','+5V':'5V 系统电源（IP5306 升压输出）','VBUS':'Type-C 5V 输入',
  'BAT+':'电池正极','SW_NODE':'IP5306 开关节点（接电感 L1）','AVDD':'ES8388 模拟电源（经 FB1 磁珠）',
  'HPVDD':'ES8388 耳机功放电源（经 FB2 磁珠）','VREF':'ES8388 参考电压','VMID':'ES8388 模拟中点',
  'LOUT1':'ES8388 左声道输出','ROUT1':'ES8388 右声道输出','HP_L':'耳机左声道（经 C15 耦合）',
  'HP_R':'耳机右声道（经 C16 耦合）','I2S_MCLK':'I2S 主时钟','I2S_BCLK':'I2S 位时钟',
  'I2S_LRCK':'I2S 左右声道时钟','I2S_DOUT':'I2S 音频数据（ESP→ES8388）',
  'I2C_SDA':'I2C 数据','I2C_SCL':'I2C 时钟','USB_DP':'USB D+','USB_DN':'USB D−',
  'CC1':'Type-C CC1（5.1k 下拉）','CC2':'Type-C CC2（5.1k 下拉）','SHIELD':'Type-C 外壳屏蔽',
  'LCD_SCLK':'屏 SPI 时钟','LCD_MOSI':'屏 SPI 数据','LCD_RST':'屏复位','LCD_DC':'屏数据/命令',
  'LCD_CS':'屏片选','LED_A':'屏背光 LED 阳极','LED_K':'屏背光 LED 阴极',
  'BL_DRV':'背光驱动信号','BL_GATE':'背光 MOS 栅极','KEY_K1':'按键1','KEY_K2':'按键2',
  'KEY_K3':'按键3','KEY_K4':'按键4','RESET_N':'复位','BOOT_N':'下载模式',
  'PWR_KEY':'电源开关（SW7）','LED1_R':'电量灯1 限流','LED1_K':'电量灯1 阴极',
  'LED2_R':'电量灯2 限流','LED2_K':'电量灯2 阴极','LED3_R':'电量灯3 限流','LED3_K':'电量灯3 阴极',
  'ENC_A':'编码器 A 相','ENC_B':'编码器 B 相','ENC_SW':'编码器按压开关',
};

let md = '';
md += '# ESP-Music PCB —— 接线表与引脚定义\n\n';
md += '**板子**：58.0 × 50.0 mm，四层板　　**工程**：嘉立创EDA专业版 `esp-music-player`\n\n';
md += '> 本文件由 PCB 实际网络数据生成（数据源 `pads.raw.json`，导出自 EDA）。\n';
md += '> ESP32 引脚号↔GPIO 名取自原理图符号 `ESP32-S3-WROOM-1-N16R8`，权威。\n\n';
md += '---\n\n';

// ── 第一部分：ESP32-S3 引脚表 ──
md += '## 一、ESP32-S3-WROOM-1-N16R8 引脚定义\n\n';
md += '模组共 41 个焊盘。**天线端**是 1、40、41 脚（本板这块悬出板边）。\n\n';
md += '| 脚号 | GPIO | 本板接的网络 | 功能 |\n|---:|---|---|---|\n';
for (let i = 1; i <= 41; i++) {
  const net = u1net[i] || '';
  const f = FUNC[i] || '';
  const netCell = net ? '`' + net + '`' : '—';
  md += `| **${i}** | ${U1_PIN[i]} | ${netCell} | ${f} |\n`;
}
md += '\n### 已用引脚汇总（按功能分组）\n\n';
const groups = [
  ['音频（I2S → ES8388）', [32, 33, 34, 35, 38, 39]],
  ['屏幕（SPI → ST7735S）', [4, 5, 6, 7, 8, 9]],
  ['按键', [31, 12, 11, 10, 27, 3]],
  ['旋转编码器', [17, 18, 19]],
  ['USB（原生）', [13, 14]],
  ['电源', [2, 1, 40, 41]],
];
for (const [name, list] of groups) {
  md += `- **${name}**：` + list.map(i => `脚${i}=${U1_PIN[i]}→\`${u1net[i] || '—'}\``).join('　') + '\n';
}
md += '\n### ⚠️ 必须悬空的引脚\n\n';
md += '| 脚号 | GPIO | 原因 |\n|---:|---|---|\n';
md += '| 28 | IO35 | **N16R8 的 Octal PSRAM 内部占用，接任何东西都会导致无法启动** |\n';
md += '| 29 | IO36 | 同上 |\n';
md += '| 30 | IO37 | 同上 |\n';
md += '| 15 | IO3 | strapping 脚（本板已刻意避开，故 K1 从 IO3 改到 IO38） |\n';
md += '| 16 | IO46 | 规格书未用 |\n';
md += '| 20–26 | IO12/13/14/21/47/48/45 | 规格书未用 |\n';
md += '| 36, 37 | RXD0/TXD0 | 默认串口，留作调试焊盘 |\n';
md += '\n> ⚠️ 网上大多数 ESP32-S3 例程用的是 **N8R2（Quad PSRAM）**，那三根 IO35/36/37 可以随便用。\n';
md += '> **本板是 N16R8，照抄会直接无法启动。**\n\n';
md += '---\n\n';

// ── 第二部分：完整接线表 ──
md += '## 二、完整接线表（50 个网络）\n\n';
const order = Object.keys(netPads).sort((a, b) => {
  const pri = ['GND','VCC','+5V','VBUS','BAT+','SW_NODE'];
  const ia = pri.indexOf(a), ib = pri.indexOf(b);
  if (ia >= 0 || ib >= 0) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  return a.localeCompare(b);
});
for (const n of order) {
  const list = netPads[n];
  md += `### \`${n}\`　${NET_DESC[n] || ''}　（${list.length} 个连接点）\n\n`;
  md += list.map(x => '`' + x + '`').join('　') + '\n\n';
}
md += '---\n\n';

// ── 第三部分：电源树 ──
md += '## 三、电源树\n\n';
md += '```\n';
md += 'Type-C VBUS (5V)\n';
md += '   │\n';
md += '   ├─→ C21, C22 (滤波)\n';
md += '   └─→ U4 IP5306 VIN\n';
md += '            │  （充电 + 升压 + 电源路径管理）\n';
md += '            ├─→ BAT+ ─→ J4 电池座 ─→ 锂电池 3.7V\n';
md += '            ├─→ L1 (2.2µH) ─→ SW_NODE （开关节点）\n';
md += '            └─→ +5V  ──┬─→ C23, C24 (滤波)\n';
md += '                        ├─→ U3 TLV75733 LDO IN\n';
md += '                        ├─→ R12 → LED_A  （屏幕背光）\n';
md += '                        └─→ R15/R16/R17 → LED1-3_R （电量灯）\n';
md += '                                 │\n';
md += '                        U3 LDO OUT ─→ VCC (3.3V)\n';
md += '                                 ├─→ U1 ESP32-S3 (脚2)\n';
md += '                                 ├─→ U2 ES8388 (脚2,3,26)\n';
md += '                                 ├─→ J3 屏幕座 (脚10,11)\n';
md += '                                 └─→ 各上拉电阻 / 退耦电容\n';
md += '```\n\n';
md += '| 轨 | 电压 | 来源 | 主要负载 |\n|---|---|---|---|\n';
md += '| `VBUS` | 5V | Type-C | IP5306 充电输入 |\n';
md += '| `BAT+` | 3.0–4.2V | 锂电池 | IP5306 升压输入 |\n';
md += '| `+5V` | 5V | IP5306 升压输出 | LDO、背光、电量灯 |\n';
md += '| `VCC` | 3.3V | TLV75733 LDO | ESP32、ES8388、屏幕 |\n';
md += '| `AVDD` | 3.3V | VCC 经 FB1 磁珠 | ES8388 模拟部分 |\n';
md += '| `HPVDD` | 3.3V | VCC 经 FB2 磁珠 | ES8388 耳机功放 |\n';
md += '\n---\n\n';

// ── 第四部分：固件引脚对照 ──
md += '## 四、固件引脚定义对照（`board.h`）\n\n';
md += '| 宏 | GPIO | 本板网络 | 对应模组脚号 |\n|---|---:|---|---:|\n';
const FW = [
  ['BOARD_PIN_I2C_SDA', 1, 'I2C_SDA'], ['BOARD_PIN_I2C_SCL', 2, 'I2C_SCL'],
  ['BOARD_PIN_I2S_MCLK', 42, 'I2S_MCLK'], ['BOARD_PIN_I2S_BCLK', 41, 'I2S_BCLK'],
  ['BOARD_PIN_I2S_WS', 39, 'I2S_LRCK'], ['BOARD_PIN_I2S_DOUT', 40, 'I2S_DOUT'],
  ['BOARD_PIN_LCD_SCLK', 4, 'LCD_SCLK'], ['BOARD_PIN_LCD_MOSI', 5, 'LCD_MOSI'],
  ['BOARD_PIN_LCD_RST', 6, 'LCD_RST'], ['BOARD_PIN_LCD_DC', 7, 'LCD_DC'],
  ['BOARD_PIN_LCD_CS', 15, 'LCD_CS'], ['BOARD_PIN_LCD_BLK', 16, 'BL_DRV'],
  ['BOARD_PIN_KEY1', 38, 'KEY_K1'], ['BOARD_PIN_KEY2', 8, 'KEY_K2'],
  ['BOARD_PIN_KEY3', 18, 'KEY_K3'], ['BOARD_PIN_KEY4', 17, 'KEY_K4'],
];
for (const [macro, gpio, net] of FW) {
  const pin = Object.entries(u1net).find(([, v]) => v === net);
  md += `| \`${macro}\` | ${gpio} | \`${net}\` | ${pin ? pin[0] : '?'} |\n`;
}
md += '\n**已删除的宏**（自制板不适用）：\n\n';
md += '- `BOARD_PIN_I2S_DIN` —— 不录音，ES8388 ADC 已断电，I2S 通道是 TX-only\n';
md += '- `BOARD_PIN_PA_EN` —— 已去掉 PAM8406 功放，ES8388 内置耳放直推耳机\n';
md += '\n> ⚠️ `BOARD_PIN_KEY1` 从 **GPIO3 改到了 GPIO38**（避开 strapping 脚）。\n';
md += '> **不打固件补丁就烧录，K1 会直接失效**（固件轮询悬空的 IO3，永远读到"未按下"）。\n';
md += '> 补丁见 `firmware-patch.diff`。\n\n';
md += '**ES8388 I2C 地址**：`0x11`（7 位）＝ `0x22`（8 位）。由 `CE` 脚接 VCC 决定。\n';

fs.writeFileSync(HERE('./接线表与引脚定义.md'), md);
console.log('✅ 已生成 接线表与引脚定义.md  (' + md.length + ' 字节)');
console.log('   网络数:', Object.keys(netPads).length, ' U1 已用引脚:', Object.values(u1net).filter(Boolean).length);
