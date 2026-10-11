---
name: esp-music-lcd-text-and-state
description: "屏幕上\"显示的跟实际不一致\"的两个坑：暂停时图标不翻（引擎语义）、字库缺字整行空白"
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-25T05:13:00.648Z
---

**2026-09-25 用户报的两个 bug，都是"屏上显示的和实际状态不一致"，但根因完全不同。**

**Why:** 两个都很难从代码表面看出来 —— 第一个是引擎的暂停语义（状态机里没有 PAUSED），
第二个是字库覆盖范围（只到 GB2312 + 拉丁）。表象一样（"屏幕上不对"），根因一个是逻辑一个是数据。

**How to apply：**

**1. ⚠️⭐ "playing" 必须写成「状态是 PLAYING **且** 没暂停」**
```c
bool paused  = audio_engine_is_paused();
bool playing = (audio_engine_state() == AE_STATE_PLAYING) && !paused;   /* ← 少一半就出 bug */
```
原因：**暂停是独立标志，状态机里根本不出 `AE_STATE_PAUSED`**。暂停时 out 任务继续往 I2S
写静音、位置冻结，`audio_engine_state()` 依然返回 `AE_STATE_PLAYING`。
所以只看状态的 `playing` 在暂停时仍然是 true —— **播放/暂停图标永远不翻**
（用户原话："按 k3 会暂停但是那个播放暂停显示的按钮不变化"）。
踩过的连带处：`ui.c` 的进度回填、`web_console.c` 的 `/api/status` 的 `playing` 字段。
（网页前端自己额外算了一层 `st.playing && !st.paused` 做兜底，所以网页看起来是好的，
**只有屏幕坏了** —— 这种"一端好一端坏"最容易误判成前端 bug。）

**2. ⚠️ 暂停时位置会"溜"一下 —— 这是写出批次大小造成的，不是位置算法错**
实测：按暂停后位置往前蹿 **552~743ms** 才停住。原因是 `board_i2s_write()` 是阻塞的，
而一次 `audio_ring_read_span()` 最多能拿到 128KB（≈743ms）连续 PCM，
如果"按暂停"正好落在这么一次大写入中间，那一整块会被喂进 DMA，
而位置 = `已交给 DMA 的帧数 - DMA 深度`，于是跟着一次跳过去。
**修法：给单次写出加个上限**（`OUT_WRITE_MAX`，现在 16KB ≈ 92ms）：
```c
size_t n = audio_ring_read_span(&s_rpcm, &p, pdMS_TO_TICKS(100));
if (n > OUT_WRITE_MAX) n = OUT_WRITE_MAX;
```
修完从 552ms 降到 **185ms，而且这 185ms 是对的**（正好是 DMA 深度 = 按暂停后你确实还能听到的那一段）。
之后位置完全冻结（实测 5 秒 0ms）、欠载保持 0。
**顺带纠正一个误判**：我一度以为"暂停会涨欠载"，实测 `underruns` 在暂停期间不变
（暂停分支不累加、也不计欠载），之前看到的 3 是我自己压测连点造成的。

**3. ⚠️ 字库缺字 → 整行【空白】，不是方框**
字库是 **GB2312 全集 + 中文标点 + 全角符号 + 0x2010-0x203B + 0x00B0-0x00B7**，
拉丁/ASCII 靠 LVGL 内置 Montserrat 兜底。**任何超出范围的字符画不出来就是一片空白。**
实测用户曲库里有首歌叫 **`"ᯤ"`（U+1BE4，Batak 文字）** —— 屏幕上歌名就是空的，
用户报的是"现在播放这首歌为什么显示不出歌名"。
（对比：`★ ▶ ♪` 这类是另一个坑 —— 它们在**生成字库时就该被包含**，
见 [[esp-music-display-calibration]] 说的"图标素材必须 RGB565A8"那条附近的记录。）

**修法**：`ui_sanitize_text(in, out, len, font)`（`components/ui/src/ui.c`）
逐码点查两次字形（先中文字库、再它的 `fallback`），查不到就换成 ASCII `'?'`。
用在播放页的**歌名和作者**、列表页的每行标题上。
⚠️ 一定要连 `fallback` 一起查：中文字库**故意排除了 ASCII**（DroidSansFallback 的 ASCII 是全角的），
只查主字体的话会把所有英文字母都替换成 `?`，比原 bug 还糟。

**怎么验证的（这套手法值得复用）**：给替换加 `ESP_LOGW("[字库] 缺字形 U+%04X")`，
换歌时再打一行 `屏上显示: 歌名="..." 作者="..."（原始 ...）`，然后**造数据打两个方向**：
- 正常中文/英文 → 必须原样通过（验证没误伤，`font_has_glyph` 对得上）
- `'ᯤ好听的歌😀'` / `'测试𠀀歌手'` → 实测输出 `"?好听的歌?"` / `"测试?歌手"`
  （U+1BE4 / U+1F600 / U+20000 都被识别出来了，3 字节和 4 字节 UTF-8 解码都对）

**造数据的技巧**：用 `POST /api/play {"id":..,"title":"ᯤ...","artist":".."}` 直接把想要的
标题送进去。⚠️ **但 id 必须在当前队列【之外】才会走"带元数据"这条快路径**；
id 在队列里的话会走"跳过去"分支、**忽略你给的元数据**，测不出替换（我第一次就这么白测了一轮）。
拿队列外的 id 最简单的办法是 `/api/search?q=xxx`。

相关：[[esp-music-m4-keys-player]] [[esp-music-m5-web-console]] [[esp-music-lcd-anim-cost]]
