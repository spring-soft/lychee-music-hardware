---
name: esp-music-boot-time
description: esp-music 开机到出声从 19.9s 优化到 5.1s 的四个具体原因与改法
metadata:
  node_type: memory
  type: project
  originSessionId: 30267fef-3ae8-4bbf-a231-b5467df9ba71
  modified: 2026-09-24T17:03:02.832Z
---

**2026-09-25** 实测把 esp-music 的"开机→出声"从 **19.9 秒压到 5.1 秒**。用户原始反馈是"重启后会等待一会才能显示并播放"。

**Why:** 四个原因里有三个不在代码逻辑上、而在"没意识到"的默认值上，尤其第二条很反直觉——**服务器侧只要 0.11 秒的接口，ESP32 上要 2.7 秒**，很容易误判成服务器慢。

**How to apply（按收益排序）：**

1. **别用 ping 做开机连通性检查**（省 3.6s）：`/rest/ping.view` 只有 139 字节，但要走一整轮 TCP 连接建立 + 请求，在这个 RTT 66~164ms 的局域网上就是好几秒。`getRandomSongs` 本身就能验证连通性。
2. **放大 LwIP TCP 窗口**（省 1.6s）：默认 `CONFIG_LWIP_TCP_WND_DEFAULT` 只有 ~5.7KB(4×MSS)，30KB 的 JSON 要 11 个来回；RTT 150ms 时就是 1.6 秒。改成 **16384** 后来回降到 2~3 次。
   判据：从笔记本 curl 同一接口只要 0.1 秒，设备端要好几秒 → 就是这个。
   （排查手法：`/usr/bin/time curl -s -o /dev/null "<同一个 URL>"`，对比两端。）
3. **M0 的基线测试音会阻塞 2.8 秒**：`board_play_tone()` 是阻塞的，放在开机路径上会把网络初始化往后推。默认关掉（`BASELINE_TONE 0`），它还会每次开机"嘟"一声。
4. **网络初始化与 UI 准备并行**：`net_mgr_init()`（异步，约 150ms）放在 `ui_start()` **之前**调用，让 WiFi 扫描/连接（约 1.4s）和字库/面板初始化重叠。（WiFi 配置改动见下：`threshold.authmode` 别只写 WPA2，实测会 AUTH_FAIL(reason=202) 连着重试 4 次；放宽成 `WIFI_AUTH_WPA_WPA2_PSK` 后一次成功。）

**启动过程可视化**（用户明确要求"别让我以为是卡死了"）：开机 5 秒里前 3 秒画面是空的、后面 2 秒在联网，所以做了启动页（logo + 状态文字 + 进度条，6 步）。实现要点：
- 跨任务不能直接碰 LVGL → 别的任务只调 `ui_splash_set(text, step, total)` 写字符串（加锁），由 UI 任务的 tick 应用；
- 文字里**不要用 U+2026 省略号"…"**（字库子集里缺字形，屏上显示成方框），用 ASCII 的 `...`（走内置 Montserrat 兜底）。

**还可以再快**（留给 M8）：把歌单缓存到本地（`cache` 分区），开机先从缓存起播、后台再刷新 → 能省掉那 1.1 秒的 `getRandomSongs`。

相关：[[esp-music-project]] [[esp-music-navidrome-verified]] [[esp-music-display-calibration]]
