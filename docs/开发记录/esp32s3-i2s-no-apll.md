---
name: esp32s3-i2s-no-apll
description: "ESP32-S3 的 I2S 不支持 APLL——查\"MCLK 抖动导致底噪\"这条路在 S3 上是死的"
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T03:04:21.066Z
---

**结论：ESP32-S3 上没法把 I2S 的 MCLK 做成整数分频，音频时钟抖动的优化路径不存在。**

`components/soc/esp32s3/include/soc/soc_caps.h` 里，S3 的 I2S **只有**：
```
#define SOC_I2S_SUPPORTS_XTAL       (1)
#define SOC_I2S_SUPPORTS_PLL_F160M  (1)
```
**没有 `SOC_I2S_SUPPORTS_APLL`** —— 音频专用 PLL 在 S3 上不给 I2S 用（老 ESP32 给）。

**Why:** 2026-09-25 用户反馈"底噪有点明显"，我判断可能是 MCLK 抖动（delta-sigma DAC 的调制器时钟抖动会直接抬升噪声底），写了个"默认走 APLL + 失败回退 + 菜单里运行时 A/B"的改动。烧上去一看日志是 `[clk] 时钟源 = 默认` —— 因为 `#if SOC_I2S_SUPPORTS_APLL` 没定义，走了 `#else`，`s_clk_apll` 这个变量从头到尾没生效。**是宏名不存在，不是初始化失败**，所以连失败日志都没有，特别容易误判成"APLL 试过了没用"。

**How to apply:**

1. 想在 S3 上换 I2S 时钟源，只有两个选项，**都比默认差**：
   - `I2S_CLK_SRC_DEFAULT` = `PLL_F160M`：48k 时 160/12.288 = 13.0208，非整数
   - `I2S_CLK_SRC_XTAL`（40MHz）：40/12.288 = 3.255，抖动更大（±25ns vs ±6ns）
   所以 **`I2S_CLK_SRC_DEFAULT` 就是 S3 上的最优解**，别折腾。
2. 想确认某个 SoC 能力宏存不存在，**直接 grep `soc_caps.h`**，别凭 ESP32/ESP32-S2 的经验猜：
   `grep SOC_I2S_SUPPORTS $IDF_PATH/components/soc/esp32s3/include/soc/soc_caps.h`
3. S3 上真正跟噪声有关、**能改**的地方是 ES8388 的电源管理 —— 见 [[esp-music-m4-keys-player]] 里的 ADC 断电那条。

相关：[[esp-music-m4-keys-player]] [[esp-music-audio-click-sources]] [[esp32s3-coreboard-v14-pinout]]
