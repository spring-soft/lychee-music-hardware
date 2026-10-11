#!/usr/bin/env node
/** 对 board.c 施加自制板补丁：PA_EN 三处、I2S DIN 一处 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'fw/ESP-Music-PCB/固件引脚定义/board.c';
let src = readFileSync(P, 'utf8');

const edits = [
  {
    name: '1) board_pa_enable 改为空实现',
    from: `void board_pa_enable(bool on)
{
    gpio_set_level(BOARD_PIN_PA_EN, on ? 1 : 0);
}`,
    to: `void board_pa_enable(bool on)
{
    /* 自制板无功放（已去掉 PAM8406），ES8388 内置耳放经耦合电容直推耳机。
     * 保留函数签名以兼容调用方，实际不做任何事。 */
    (void)on;
}`,
  },
  {
    name: '2) I2S din 置为未使用（通道本就是 TX-only）',
    from: `    cfg->gpio_cfg.din  = BOARD_PIN_I2S_DIN;`,
    to: `    cfg->gpio_cfg.din  = I2S_GPIO_UNUSED;   /* 自制板不录音：ES8388 ADC 已断电 */`,
  },
  {
    name: '3) 删除 PA 使能脚的 GPIO 初始化',
    from: `    /* PA 使能脚先配好（默认关，避免上电爆音） */
    gpio_config_t pa = {
        .pin_bit_mask = 1ULL << BOARD_PIN_PA_EN,
        .mode         = GPIO_MODE_OUTPUT,
    };
    gpio_config(&pa);
    gpio_set_level(BOARD_PIN_PA_EN, 0);

    board_i2c_line_check();`,
    to: `    board_i2c_line_check();`,
  },
  {
    name: '4) 自检日志去掉 PA / DIN 两项',
    from: `    ESP_LOGI(TAG, "[hw] SDA=%d SCL=%d | MCK=%d BCK=%d WS=%d | out=%d in=%d | PA=%d",
             BOARD_PIN_I2C_SDA, BOARD_PIN_I2C_SCL, BOARD_PIN_I2S_MCLK,
             BOARD_PIN_I2S_BCLK, BOARD_PIN_I2S_WS, BOARD_PIN_I2S_DOUT,
             BOARD_PIN_I2S_DIN, BOARD_PIN_PA_EN);`,
    to: `    ESP_LOGI(TAG, "[hw] SDA=%d SCL=%d | MCK=%d BCK=%d WS=%d | out=%d",
             BOARD_PIN_I2C_SDA, BOARD_PIN_I2C_SCL, BOARD_PIN_I2S_MCLK,
             BOARD_PIN_I2S_BCLK, BOARD_PIN_I2S_WS, BOARD_PIN_I2S_DOUT);`,
  },
];

const report = [];
for (const e of edits) {
  const n = src.split(e.from).length - 1;
  if (n !== 1) { report.push(`❌ ${e.name}: 匹配 ${n} 处（期望 1），已跳过`); continue; }
  src = src.replace(e.from, e.to);
  report.push(`✅ ${e.name}`);
}

writeFileSync(P, src);

// 复查是否还有残留引用
const left = [];
for (const sym of ['BOARD_PIN_I2S_DIN', 'BOARD_PIN_PA_EN']) {
  const lines = src.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => l.includes(sym));
  left.push({ symbol: sym, remainingRefs: lines.map(([n, l]) => n + ': ' + l.trim()) });
}
console.log(report.join('\n'));
console.log('\n残留引用复查:');
console.log(JSON.stringify(left, null, 2));
