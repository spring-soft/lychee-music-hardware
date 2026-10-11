# M10：开通 24bit 解码（面包板线）

> 分支：`audio-24bit`（从 `breadboard` 切出）→ 验证通过后合回 `breadboard` 与 `v2-pcb`
> 日期：2026-10-07

## 1. 为什么做这个

改动之前，整条链路是**写死 16bit** 的：

| 位置 | 内容 |
|---|---|
| `board.c` ES8388 初始化表 | `{ R_DACCONTROL1, 0x18 }` = 字长 16bit |
| `board.c` `i2s_fill_cfg()` | `I2S_DATA_BIT_WIDTH_16BIT` + `slot_bit_width=16` + `ws_width=16` |
| `audio_engine.c` `ae_normalize()` | 把 24/32bit 一律压成 16bit |

后果：曲库里那首 **24bit/44.1k FLAC（1576kbps）** 被截成 16bit 后才送进 DAC。
播放页显示"24"是真的（那是解码器报的**源**位深），但芯片实际按 16bit 在放。

⚠️ **先说清楚预期**：这次改动**听感上基本听不出来**。24bit 与 16bit 的差异是
−96dB 级的量化噪声，埋在这套硬件的模拟噪声地板之下（中端 codec + IP5306 开关电源
+ S3 无 APLL 的 MCLK 抖动）。它的意义是"**不再无谓地丢信息**"，不是"变好听"。
真正的听感瓶颈是 MCLK 抖动（`esp32s3-i2s-no-apll`），那个要改硬件。

## 2. 两个硬约束（决定了整个方案的形状）

### 2.1 权威寄存器编码
来自官方驱动 `espressif__esp_codec_dev`：
- `device/es8388/es8388.c:193-197`：`DACCONTROL1 & 0xc7` 之后 `| (bits << 3)`
- `device/priv_include/es_common.h:29`：`BIT_LENGTH_16BITS = 0x03`、`BIT_LENGTH_24BITS = 0x00`

→ **`0x17` 的 bits[5:3] = 字长**：16bit = `0x18`、24bit = `0x00`。

### 2.2 BCLK 分频必须整除 → 24bit 不能用 24bit 槽
`bclk_div = mclk_multiple / (2 × 槽位宽)`：

| 槽位宽 | 单速（MCLK=256fs） | 双速（MCLK=128fs） |
|---|---|---|
| 16 | 256/32 = **8** ✓ | 128/32 = **4** ✓ |
| 24 | 256/48 = **5.33** ✗ | 128/48 = 2.67 ✗ |
| 32 | 256/64 = **4** ✓ | 128/64 = **2** ✓ |

→ **只能"32bit 槽 + 数据 MSB 左对齐"**。

**为什么 MSB 对齐是安全的**：DAC 的满量程基准就是 MSB。数据一旦 MSB 对齐，
无论 ES8388 按 16 还是 24bit 解读，**模拟输出的数值都是对的**。16bit 源放 `[31:16]`、
24bit 源放 `[31:8]`、32bit 源原样 —— 三者都落在同一把标尺上。

## 3. 设计：两种输出格式，16bit 路径一字不动

| 源位深 | 输出 | 槽位 | `0x17` | 数据摆放 |
|---|---|---|---|---|
| ≤16bit（MP3/AAC/Vorbis/多数 FLAC） | 16bit | 16 | `0x18` | 原样 `memcpy`（快路径） |
| 24bit（FLAC） | 24bit | 32 | `0x00` | `<<8` → `[31:8]` |
| 32bit | 24bit | 32 | `0x00` | 取高 24bit（带舍入）再 `<<8` |
| 其它（8bit 等） | 保持现状：告警并丢弃 | — | — | 本轮不扩大 |

**刻意不做"统一 32bit 输出"**：那会把**所有**播放推上未验证的新路径，而对 16bit 源
零收益。两格式方案让**唯一被真机充分验证过的 16bit 路径保持不变**（还有独立 memcpy
快路径 + 主机脚本双重保证）。

## 4. 实机上最容易静默出错的两处

### 4.1 `board_i2s_set_rate()` 在采样率相同时直接返回
16bit 44.1k 与 24bit 44.1k 的**采样率完全相同**。原来的实现只比采样率，
`fs` 没变就不重配 → 24bit 数据被当成 16bit 解释（噪音/极小声），**而且不报任何错**。
→ 已把**格式**纳入判断，并新增 `board_i2s_set_format(fs, fmt)`。

### 4.2 槽位宽改了而 `bclk_div` 没跟着改 → WS 减半
表现是**半速变调**，同样不报错。→ `clk_plan_for(fs)` 改成 `clk_plan_for(fs, slot_bits)`，
槽位宽是参数不是常量；日志里把 `槽位宽 / bclk_div / 0x17 / 0x18` 一起打出来，
并用**实测 WS**（`board_measure_ws_hz`）当场核对。

## 5. 验证

### 5.1 主机侧（不需要硬件，已全绿）
```bash
python3 tools/check_pcm_24bit.py     # 本次改动：10 项
python3 tools/check_pcm_round.py     # 16bit 路径的旧守卫，保持不动
```
`check_pcm_24bit.py` 的 10 项结论：

| # | 检查 | 结果 |
|---|---|---|
| ① | 24bit 源 → 24bit 输出**恒等**（不丢信息） | OK（200008 例） |
| ② | 落位 == 四舍五入（独立参考实现） | 24bit OK / 16bit OK |
| ③ | 正满幅进位**绝不**翻成负满幅（爆音） | OK（0 例） |
| ④ | 16bit 源 → 16bit 输出逐字节不变（快路径+通用路径） | OK |
| ⑤ | 16bit 源 → 24bit 输出 == `s<<16` | OK |
| ⑥ | 32bit 源 → 24bit 与参考一致 | OK |
| ⑦ | MSB-first 串出流前 24 位 == 源采样（字节序） | OK |
| ⑧ | 单声道源复制成两声道 | OK |
| ⑨ | 输出长度 == 帧数 × 每帧字节数 | OK |
| ⑩ | 24bit→16bit == 改动前的舍入实现（无回归） | OK |

### 5.2 面包板真机（已完成）

| # | 步骤 | 实测结果 |
|---|---|---|
| 1 | 放 **16bit** 曲目（回归） | 日志 `16 bit → 输出 16bit`；`[clk] ...16bit 槽, bclk_div=8, ES8388 0x17=18`；实测 WS 偏差 ≤1.2‰ ✓ |
| 2 | 放 **24bit** FLAC（44.1k 与 48k 都有） | 日志 `24 bit → 输出 24bit`；`[clk] ...32bit 槽, bclk_div=4, 0x17=00` ✓ |
| 3 | 关键寄存器复查 | `17=00`（24bit 模式）✓ |
| 4 | **实测 WS** | 44.1k 档偏差 −0.1~0‰、48k 档 −0.1~0‰，**无离群值** ✓ |
| 5 | 声音 | 正常（无噪音/爆音/半速变调）—— 用户现场确认 |
| 6 | 连续切歌 16↔24bit | **17 次来回全部正确**，无杂音残留 ✓ |
| 7 | 欠载 | **0** ✓ |
| 8 | `/api/debug` | `format=FLAC bit_depth=16 out_bits=16`（新字段生效）✓ |
| 9 | 资源 | 内部 SRAM 46KB / PSRAM 4916KB（放大的缓冲占 384KB，符合预期）✓ |

## 5.3 ⚠️ 真机抓出来的两个 bug（都已修，记在这里供后人避坑）

> 这两个都属于"**不报错、返回值 ESP_OK、只能靠现象发现**"的类型。第一个就是靠日志里
> 的"实测 WS"当场抓出来的 —— 这也是为什么这个工程一直坚持把实测 WS 打进日志。

### bug 1：I2S 重配顺序错了 → WS 减半（严重）
现象：切到 24bit 后 **实测 WS=24080 / 期望 48000**（正好一半），返回 ESP_OK，IDF 无警告。
听感是半速变调。

根因：master 角色下 IDF 这样算 BCLK（`i2s_std.c` 的 `i2s_std_calculate_clock`）：
```c
clk_info->bclk     = rate * handle->total_slot * slot_bits;   // slot_bits 取自 handle->mode_info
clk_info->bclk_div = clk_info->mclk / clk_info->bclk;
```
`slot_bits` 取自 `handle->mode_info` 里**当前已存**的 slot 配置，而那份配置只有
`i2s_channel_reconfig_std_slot` 之后才更新。原来写成"先 clock 后 slot"，于是配 clock 时
用的是旧的 16bit 槽 → bclk = 32fs、分频 8；随后槽改成 32 → WS = 32fs/(2×32) = fs/2。

**→ 必须"先 slot、后 clock"。**

顺带确认（都写进代码注释）：
- `clk_cfg.bclk_div` 在 **master 角色下被彻底忽略**（头文件原话 "only take effect for
  slave role"）。原来传 8 之所以"看起来对"，只是因为它恰好等于 IDF 自己算出来的值。
  保留这个字段只为打进日志 + 不整除时当场报错。
- IDF 会警告 "mclk multiple can not perform integer division" 的情形就是 24bit 槽
  （256/48 非整数）—— 与 §2.2 的判断一致，所以我们用 32bit 槽。

### bug 2：`board_measure_ws_hz()` 把窗口算错 → 假告警（既有缺陷，不是本次引入）
现象：同一配置（44100/24bit）一次测到 57510（+304‰），另一次 44260。

根因：`vTaskDelay` 只保证"**至少**"睡够 `window_ms`；系统忙时（切格式 + HTTP + WiFi +
LVGL 同时上来）实际窗口能多跑几十毫秒，而原实现除以的是**请求值**。
57510/44100 = 1.304 → 正好对应"窗口多跑了 30.4ms"。它还会造成**系统性的 3~4‰ 偏高**假象。

修法：用 `esp_timer_get_time()` 量**实际**经过时间再除。

⭐ 这是工程里"时钟对不对的唯一真相来源"，报 30% 的假错误比不报更危险 —— 会让人去追一个
不存在的时钟 bug。

⭐ **附带纠正一个记在文档里的旧结论**：以前记的"44.1k 实测 WS=43750（−7.9‰），是 S3 的
MCLK 分数分频造成的"——那 −7.9‰ 基本都是测量偏差。修好后 44.1k 实测 **−0.2‰**，
真实时钟精度远好于文档所述。

## 5.4 回退
`audio_engine.c` 顶部 `#define AUDIO_OUT_ALLOW_24BIT 0` → 重编即回到改动前行为。


## 6. 改了哪些文件

| 文件 | 改动 |
|---|---|
| `components/board/include/board.h` | 新增 `board_audio_fmt_t`（含原理注释）、`board_i2s_set_format()`、`board_i2s_out_bits()` |
| `components/board/src/board.c` | `fmt_plan_for()` 映射表；`clk_plan_for(fs, slot_bits)`；`i2s_fill_cfg(..., slot_bits)`；`i2s_reconfig()` 写 `0x17`；`board_i2s_set_format()`（格式纳入判断）；`check_critical` 期望值动态化；init 复位格式记录 |
| `components/audio_engine/src/audio_engine.c` | `ae_msb32()`；`ae_normalize(..., out_fmt)` 重写；`s_out_fmt`/`s_out_frame_bytes`；三处帧长硬编码改掉；缓冲放大；格式切换接入；`AUDIO_OUT_ALLOW_24BIT` 开关 |
| `components/audio_engine/include/audio_engine.h` | 新增 `audio_engine_out_bits()`；修正 `bit_depth()` 的过期注释 |
| `tools/check_pcm_24bit.py` | 新增（主机侧逐字节校验 10 项） |

## 7. 缓冲尺寸（为什么必须放大）

每帧字节数随格式变（16bit → 4、24bit → 8），而缓冲是按**字节数**给的：

| 常量 | 改动前 | 改动后 | 理由 |
|---|---|---|---|
| `RING_PCM_BYTES` | 256KB | **512KB** | 两种格式都保持约 1.45 秒 @44.1k；不放大则 24bit 下只剩 0.73 秒，而 24bit 无损码率本来就高（1576kbps）→ 会重新引入欠载 |
| `PCM_PREBUFFER_BYTES` | 128KB | **256KB** | 起播缓冲时长一致 |
| `PCM_OUT_CAP` | 256KB | 256KB | 已核算：128KB 解帧输出展开成 8 字节/帧约 175KB，装得下 |
| `s_silence[]` | 1764B | **3528B** | 按最大每帧字节数算，否则 24bit 下只有一半时长（内部 SRAM +1.7KB，实测余量 49KB） |

只用 PSRAM（空闲 5.5MB）。

## 8. 已知未做

- 8bit / 非 16/24/32 的源（保持告警丢弃）
- 24bit 槽位（时钟上非整数分频，已避开）
- 32bit 输出到 DAC（ES8388 的 DAC 上限是 24bit，没有意义）
- MCLK 抖动优化（S3 无 APLL、板上无晶振，软件无解；它才是听感上更大的那个瓶颈）
